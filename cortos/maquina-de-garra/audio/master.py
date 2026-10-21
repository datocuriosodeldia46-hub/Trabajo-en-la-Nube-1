"""Mix the four Web Audio stems, normalise to -14 LUFS and limit the true peak.

Gains and the limiter run in numpy after Web Audio, as in the brief:
  about -14 LUFS integrated, true peak at or under -2 dBTP, limiter never taking more than 3 dB.

    python3 audio/master.py                  -> audio/mix.wav + a report
    python3 audio/master.py --gains music=0,room=-6,fx=-2,foley=-1
"""
import sys, json, wave
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
SR = 48000
TARGET_LUFS = -14.0
CEIL_DBTP = -3.4          # the AAC encode adds ~1.5 dB of overs; this keeps the MP4 under -2 dBTP
LOOKAHEAD = 256           # samples (5.3 ms)
RELEASE_S = 0.12

GAINS_DB = {"music": 14.0, "room": 10.0, "fx": -3.0, "foley": 0.0}
if "--gains" in sys.argv:
    i = sys.argv.index("--gains")
    for kv in sys.argv[i + 1].split(","):
        k, v = kv.split("=")
        GAINS_DB[k] = float(v)


def load(name):
    return np.stack([np.fromfile(HERE / "stems" / f"{name}_{c}.f32", dtype="<f4").astype(np.float64) for c in (0, 1)])


def biquad(x, b, a):
    y = np.zeros_like(x)
    b0, b1, b2 = b
    _, a1, a2 = a
    for ch in range(x.shape[0]):
        xs, ys = x[ch], y[ch]
        x1 = x2 = y1 = y2 = 0.0
        for n in range(xs.shape[0]):
            xn = xs[n]
            yn = b0 * xn + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
            x2, x1, y2, y1 = x1, xn, y1, yn
            ys[n] = yn
    return y


def lufs(x):
    """ITU-R BS.1770-4 integrated loudness with absolute and relative gating."""
    k = biquad(x, (1.53512485958697, -2.69169618940638, 1.19839281085285), (1, -1.69065929318241, 0.73248077421585))
    k = biquad(k, (1.0, -2.0, 1.0), (1, -1.99004745483398, 0.99007225036621))
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    z = np.array([np.mean(k[:, i:i + blk] ** 2, axis=1).sum() for i in range(0, k.shape[1] - blk, hop)])
    l = -0.691 + 10 * np.log10(z + 1e-20)
    z1 = z[l > -70]
    rel = -0.691 + 10 * np.log10(z1.mean()) - 10
    z2 = z1[(-0.691 + 10 * np.log10(z1 + 1e-20)) > rel]
    return -0.691 + 10 * np.log10(z2.mean())


def oversample4(x):
    n = x.shape[1]
    X = np.fft.rfft(x, axis=1)
    Y = np.zeros((x.shape[0], 4 * n // 2 + 1), dtype=complex)
    Y[:, :X.shape[1]] = X
    return np.fft.irfft(Y, n=4 * n, axis=1) * 4


def true_peak_db(x):
    return 20 * np.log10(np.max(np.abs(oversample4(x))) + 1e-12)


def sliding_max(v, w):
    m = v.copy()
    k = 1
    while k < w:
        sh = np.concatenate([m[k:], np.full(k, m[-1])])
        m = np.maximum(m, sh)
        k *= 2
    return m


def limit(x, ceil_db):
    ceil = 10 ** (ceil_db / 20)
    os = np.abs(oversample4(x)).max(axis=0).reshape(-1, 4).max(axis=1)     # per-sample true-peak envelope
    need = np.minimum(1.0, ceil / np.maximum(os, 1e-9))
    g = 1.0 / sliding_max(1.0 / need, LOOKAHEAD)                          # min gain over the look-ahead
    # attack: average over the look-ahead so the gain is already down when the peak arrives
    c = np.cumsum(np.concatenate([[0.0], g]))
    ga = (c[LOOKAHEAD:] - c[:-LOOKAHEAD]) / LOOKAHEAD
    ga = np.concatenate([ga, np.full(LOOKAHEAD - 1, ga[-1])])
    ga = np.minimum(ga, g)
    rel = np.exp(-1.0 / (RELEASE_S * SR))
    out = np.empty_like(ga)
    cur = 1.0
    for i in range(ga.shape[0]):
        cur = ga[i] if ga[i] < cur else ga[i] + (cur - ga[i]) * rel
        out[i] = cur
    y = x * out[None, :]
    limit.where = out
    return y, -20 * np.log10(out.min())


def write_wav(path, x):
    pcm = np.clip(x, -1, 1)
    pcm = (pcm.T * 8388607).astype("<i4")
    b = pcm.astype("<i4").tobytes()
    b24 = b"".join(b[i:i + 3] for i in range(0, len(b), 4))
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2); w.setsampwidth(3); w.setframerate(SR); w.writeframes(b24)


stems = {k: load(k) for k in GAINS_DB}
report = {}
# a gentle stem limiter first, so the chiptune and the hits carry less crest into the master
STEM_TRIM_DB = {"music": 6.0, "fx": 4.0, "foley": 3.0}
for k, trim in STEM_TRIM_DB.items():
    pk = 20 * np.log10(np.abs(oversample4(stems[k])).max() + 1e-12)
    stems[k], sgr = limit(stems[k], pk - trim)
    report[f"{k}_stem_limiter_db"] = round(sgr, 2)
for k, v in stems.items():
    report[f"{k}_peak_db"] = round(20 * np.log10(np.abs(v).max() + 1e-12), 2)
mix = sum(stems[k] * 10 ** (GAINS_DB[k] / 20) for k in stems)
raw = lufs(mix)
gain_db = TARGET_LUFS - raw
for _ in range(3):        # the limiter costs a little loudness: re-aim and limit again
    lim, gr = limit(mix * 10 ** (gain_db / 20), CEIL_DBTP)
    final_lufs = lufs(lim)
    gain_db += TARGET_LUFS - final_lufs
pre_tp = true_peak_db(mix * 10 ** (gain_db / 20))
final_tp = true_peak_db(lim)
write_wav(HERE / "mix.wav", lim)
grw = -20 * np.log10(limit.where[:len(limit.where) // 2400 * 2400].reshape(-1, 2400).min(axis=1))
report["gain_reduction_over_2db_at_s"] = [round(i * 0.05, 2) for i in np.argsort(grw)[::-1][:8] if grw[i] > 2]
report.update(gains_db=GAINS_DB, raw_lufs=round(raw, 2), pre_limit_true_peak_dbtp=round(pre_tp, 2),
              max_gain_reduction_db=round(gr, 2), lufs=round(final_lufs, 2), true_peak_dbtp=round(final_tp, 2))
(HERE / "master_report.json").write_text(json.dumps(report, indent=1))
print(json.dumps(report, indent=1))
