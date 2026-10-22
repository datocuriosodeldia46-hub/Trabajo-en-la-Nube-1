"""Sound for "Te estás ahogando": effects, tension and music synthesised in numpy, mixed under the ElevenLabs narration.

Keyed to the narration (audio/palabras.json, take 2). The tension is built to feel hopeless until the turn:
a heartbeat that speeds up, a ringing in the ears, the room going muffled and far away, then near-silence
before "Pero en tus pulmones…", and the release on the pop.

    python3 audio/sonido.py      -> audio/stems/*.wav, audio/mix.wav, audio/mix_report.json
Target: about -14 LUFS integrated, true peak <= -2 dBTP after AAC.
"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import lfilter, butter, sosfilt, resample_poly, fftconvolve

HERE = Path(__file__).resolve().parent
SR = 48000
T_END = 43.3
N = int(T_END * SR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)


def ss(a, b, x):
    u = np.clip((x - a) / (b - a), 0, 1)
    return u * u * (3 - 2 * u)


def lerp(a, b, u):
    return a + (b - a) * u


# ───────────────────────────── helpers ─────────────────────────────
def env(x, a, d, peak=1.0):
    """Attack-decay envelope starting at time x (in story seconds)."""
    e = np.zeros(N)
    u = t - x
    e = np.where((u >= 0) & (u < a), u / max(a, 1e-4), e)
    e = np.where(u >= a, np.exp(-np.clip(u - a, 0, None) / max(d, 1e-4)), e)
    return e * peak


def win(a, b, c, d):
    return ss(a, b, t) * (1 - ss(c, d, t))


def noise(n=N):
    return rng.standard_normal(n)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)


def sweep_lp(x, f_of_t, block=256):
    """Time-varying one-pole low-pass (cutoff updated per block)."""
    y = np.zeros_like(x)
    prev = 0.0
    for i in range(0, len(x), block):
        a = np.exp(-2 * np.pi * float(f_of_t[i]) / SR)
        seg, _ = lfilter([1 - a], [1, -a], x[i:i + block], zi=[a * prev])
        y[i:i + block] = seg
        prev = seg[-1]
    return y


def osc(freq, phase0=0.0, shape="sine"):
    ph = 2 * np.pi * np.cumsum(np.broadcast_to(freq, (N,))) / SR + phase0
    if shape == "sine":
        return np.sin(ph)
    if shape == "saw":
        return 2 * ((ph / (2 * np.pi)) % 1) - 1
    if shape == "square":
        return np.sign(np.sin(ph))
    if shape == "tri":
        return 2 * np.abs(2 * ((ph / (2 * np.pi)) % 1) - 1) - 1


def pan(x, p):
    """Equal-power pan, p in [-1, 1] (scalar or array)."""
    a = (np.asarray(p) + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def reverb(x, size=1.6, mix=0.25, seed=3):
    """Cheap stereo convolution reverb: decaying filtered noise impulse."""
    r = np.random.default_rng(seed)
    n = int(size * SR)
    tt = np.arange(n) / SR
    ir = np.stack([r.standard_normal(n), r.standard_normal(n)]) * np.exp(-tt * 6.9 / size)
    ir = np.stack([lp(ch, 6000) for ch in ir])
    ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
    out = np.stack([fftconvolve(x[c], ir[c])[:N] if x.ndim == 2 else fftconvolve(x, ir[c])[:N] for c in range(2)])
    dry = x if x.ndim == 2 else np.stack([x, x])
    return dry * (1 - mix) + out * mix


def db(x):
    return 10 ** (x / 20)


# ───────────────────────────── timing (from palabras.json) ─────────────────────────────
K = dict(pov=1.1, water=3.44, xin=4.95, meat=7.28, swallow=8.88, flash=12.37, cuela=14.92, stuck=16.2, noAir=16.55, stand=17.0,
         lungs=19.58, salida=22.0, hug=23.91, fist=25.2, push=26.76, pop=28.87, flyEnd=31.3, rule=32.15, blows=35.04, comps=36.48,
         repeat=37.64, alone=38.5, call=39.6, chair=40.92, pop2=42.4)
thrusts1 = [27.05, 27.75, 28.55]; blows = [35.1, 35.35, 35.6, 35.85, 36.1]; comps = [36.55, 36.78, 37.01, 37.24, 37.47]; thrusts2 = [41.35, 41.85, 42.32]
xray = np.clip(win(4.8, 5.05, 12.25, 12.37) + win(14.82, 14.97, 17.3, 17.6) + win(19.58, 19.78, 23.8, 23.96) + win(26.5, 26.8, 28.75, 28.85) + win(28.82, 28.87, 29.3, 29.45), 0, 1)

fx = np.zeros((2, N))


def add(sig, p=0.0, gain_db=0.0):
    global fx
    fx += pan(sig, p) * db(gain_db)


def boom(at, f0=55, dur=0.9, gain=0.0, p=0.0):
    u = np.clip(t - at, 0, None)
    f = f0 * (1 + 1.5 * np.exp(-u / 0.05))
    add(np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(at, 0.004, dur / 3) * 2), p, gain)


def whoosh(at, dur=0.5, lo=300, hi=3000, gain=-6, p=0.0):
    e = np.exp(-((t - at - dur / 2) / (dur / 3)) ** 2)
    add(bp(noise(), lo, hi) * e, p, gain)


def click(at, f=2400, gain=-12, d=0.02, p=0.0):
    add(np.sin(2 * np.pi * f * t) * env(at, 0.001, d), p, gain)


def thump(at, gain=-6, p=0.0):
    add(lp(noise(), 300) * env(at, 0.003, 0.06) * 3, p, gain)
    boom(at, 70, 0.25, gain - 4, p)


def clink(at, gain=-10, p=0.0, base=2200):
    s = sum(np.sin(2 * np.pi * base * k * t) * env(at, 0.0005, 0.25 / k) / k for k in (1, 1.51, 2.37, 3.1))
    add(s, p, gain)


def gasp(at, dur=0.6, gain=-8):   # a sharp breath in: noise rising through a formant
    e = env(at, dur * 0.7, dur * 0.25)
    f = 600 + 1800 * ss(at, at + dur, t)
    s = sweep_lp(hp(noise(), 400), f) * e
    add(s * 3, 0, gain)


# ── dinner: cutlery, a TV murmur, the phone's tinny laugh-track ("nadie se ha dado cuenta")
for at in (0.12, 0.6, 1.9, 2.7):
    clink(at, -22, (-0.4, 0.3, 0.5, -0.2)[[0.12, 0.6, 1.9, 2.7].index(at)], 2600)
clink(0.55, -8, 0.15, 1900)                       # your fork hits the plate
clink(0.68, -16, 0.15, 2100)
gasp(0.3, 0.45, -10)
tv = bp(noise(), 250, 2500) * (0.5 + 0.5 * np.sin(2 * np.pi * 3.3 * t) * np.sin(2 * np.pi * 0.7 * t)) * (t < K['alone'])
laughs = bp(noise(), 500, 2200) * np.clip(np.sin(2 * np.pi * 5.5 * t), 0, 1) ** 2 * (win(1.3, 1.5, 3.0, 3.3) + 0.7 * win(K['flash'], K['flash'] + 0.2, 14.6, 14.9))
amb = tv * 0.25 * (1 - 0.8 * xray) + lp(noise(), 120) * 0.3
add(laughs, -0.5, -14)
# ── the drone rips out of your head; dives into the mouth; whooshes on each move
whoosh(1.0, 0.6, 200, 4000, -6)
whoosh(4.55, 0.55, 150, 2500, -7)
whoosh(K['cuela'] - 0.25, 0.4, 150, 2500, -8)
whoosh(17.35, 0.45, 200, 3500, -9)
whoosh(K['lungs'] - 0.15, 0.4, 150, 2000, -9)
whoosh(K['hug'] - 0.15, 0.45, 200, 3500, -8)
whoosh(K['alone'] - 0.2, 0.55, 200, 4000, -6)
# glass sliding on the tablecloth
add(bp(noise(), 800, 4000) * win(3.6, 3.7, 4.2, 4.35) * 0.6, -0.3, -16)
# inside the body: a low rumble, wet movement
body = lp(noise(), 160) * 1.5 + 0.2 * bp(noise(), 300, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.8 * t))
add(body * xray, 0, -12)
# water drops down the oesophagus
for i in range(9):
    at = 5.3 + i * 0.2
    add(np.sin(2 * np.pi * np.cumsum(900 - 500 * ss(at, at + 0.12, t)) / SR) * env(at, 0.002, 0.07), 0.1, -18)
# the meat revealed: a dark stinger
stg = sum(osc(f, shape='saw') for f in (73.4, 77.8, 110)) * env(K['meat'], 0.01, 0.9)
add(lp(stg, 900) * 0.4, 0, -6); boom(K['meat'], 45, 1.2, -6)
# the rewind: tape spinning back, a normal swallow, the lid closing
rw = bp(noise(), 500, 5000) * win(8.75, 8.8, 9.15, 9.3) * (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(20 + 60 * ss(8.75, 9.3, t)) / SR))
add(rw, 0, -14)
add(lp(noise(), 500) * env(9.45, 0.02, 0.15) * 2, 0, -10)          # gulp
click(9.5, 700, -12, 0.05); click(12.0, 650, -14, 0.05)
# flashback: warm crackle, laughter (mom's phone + you)
crackle = hp(noise(), 3000) * (rng.random(N) < 0.004) * 3 * win(K['flash'], K['flash'] + 0.1, K['cuela'] - 0.1, K['cuela'])
add(crackle, 0, -16)
# "…y el pedazo se cuela": a wet slip and a hard stop
add(sweep_lp(bp(noise(), 300, 3000), 400 + 2000 * ss(15.4, 16.2, t)) * win(15.4, 15.5, 16.1, 16.2), 0, -10)
thump(K['stuck'], -6); boom(K['stuck'], 40, 1.5, -6)
# ── the hopeless stretch (16.5–19.5): heartbeat speeding up, ringing in the ears, the room drowning
hb_times = []
tt_ = 4.8
while tt_ < 23.8:
    rate_ = 1.0 + 1.6 * float(ss(14.0, 19.0, tt_)) - 0.6 * float(ss(19.6, 21.0, tt_))
    hb_times.append(tt_); tt_ += 1 / rate_
for at in hb_times:
    g = -16 + 10 * float(ss(14.0, 19.2, at)) - 6 * float(ss(19.6, 22.0, at))
    boom(at, 48, 0.22, g); boom(at + 0.2, 44, 0.18, g - 4)
ring = np.sin(2 * np.pi * np.cumsum(6200 + 900 * ss(16.5, 19.4, t)) / SR) * ss(16.6, 19.0, t) * (1 - ss(19.5, 19.7, t))
add(ring, 0, -22)
add(lp(noise(), 90) * 2 * ss(16.6, 19.2, t) * (1 - ss(19.5, 19.6, t)), 0, -10)        # pressure in the head
# the chair goes over
thump(17.45, -4, 0.3); thump(17.62, -9, 0.3)
add(bp(noise(), 300, 1800) * env(17.45, 0.002, 0.25) * 1.5, 0.3, -10)
# silent scream: a strangled squeak
add(bp(osc(900 + 200 * np.sin(2 * np.pi * 6 * t), shape='saw'), 700, 1600) * win(18.6, 18.7, 19.2, 19.4) * 0.3, 0, -18)
# ── hope: the trapped air swirls; the way out rises
add(sweep_lp(bp(noise(), 300, 6000), 2000 + 3000 * np.sin(2 * np.pi * 0.5 * t) ** 2) * win(19.7, 20.3, 23.5, 23.85) * 0.6, 0, -16)
for i, f in enumerate((587, 740, 880, 1175, 1480)):
    at = 22.1 + i * 0.3
    add(np.sin(2 * np.pi * f * t) * env(at, 0.005, 0.5) * 0.4, -0.3 + i * 0.15, -14)
# ── the manoeuvre: thrusts, building pressure, the POP
for at in thrusts1:
    thump(at, -5); add(lp(noise(), 600) * env(at, 0.01, 0.12) * 1.5, 0, -12)       # grunt of breath
add(hp(noise(), 1500) * ss(26.8, 28.85, t) * (1 - ss(28.85, 28.9, t)) * 0.6, 0, -16)   # pressure hiss rising
pop = hp(noise(), 800) * env(K['pop'], 0.0005, 0.02) * 6 + np.sin(2 * np.pi * np.cumsum(900 * np.exp(-np.clip(t - K['pop'], 0, None) * 30) + 300) / SR) * env(K['pop'], 0.001, 0.08)
add(pop, 0, -6); boom(K['pop'], 60, 0.8, -6)
whoosh(K['pop'] + 0.05, 1.6, 200, 3000, -8)                                         # air blast
gasp(29.6, 0.7, -6)                                                                  # the first breath
add(lp(noise(), 400) * env(31.3, 0.002, 0.18) * 2, 0.5, -6)                           # plop
for i in range(6):
    click(31.32 + i * 0.03, 1500 + i * 350, -16, 0.04, 0.5)
# ── the rule: counts
for at in blows:
    thump(at, -10, -0.2); click(at, 1320, -16, 0.06)
for at in comps:
    thump(at, -10, 0.1); click(at, 1760, -16, 0.06)
whoosh(K['repeat'], 0.5, 600, 5000, -14)
# ── alone, at night: fridge hum, a clock, the call, the chair, the pop
night = (np.sin(2 * np.pi * 60 * t) * 0.3 + np.sin(2 * np.pi * 120 * t) * 0.15 + lp(noise(), 300) * 0.3) * (t >= K['alone'])
amb = amb * (t < K['alone']) + night
for at in np.arange(K['alone'], 43.3, 1.0):
    click(at, 3200, -26, 0.01, -0.6)
for at, (f1, f2) in zip((39.7, 39.92, 40.14), ((852, 1477), (697, 1209), (697, 1209))):
    add((np.sin(2 * np.pi * f1 * t) + np.sin(2 * np.pi * f2 * t)) * win(at, at + 0.005, at + 0.12, at + 0.13) * 0.4, 0.2, -16)
add((np.sin(2 * np.pi * 440 * t) + np.sin(2 * np.pi * 480 * t)) * win(40.35, 40.37, 40.85, 40.88) * 0.3, 0.2, -20)
for at in thrusts2:
    thump(at, -5, 0.1); add(bp(noise(), 200, 900) * env(at + 0.02, 0.01, 0.15) * 1.5, 0.1, -12)   # chair creak
add(hp(noise(), 800) * env(K['pop2'], 0.0005, 0.02) * 6, 0, -8); boom(K['pop2'], 60, 0.6, -8)
gasp(42.55, 0.6, -6)

# ───────────────────────────── music ─────────────────────────────
# tension bed (D minor pulse) → near silence → hope (D major pad) → drive (drums) → triumph → light instructional beat → tense → resolve
pulse8 = lambda bpm, t0, t1: [t0 + k * 60 / bpm / 2 for k in range(int((t1 - t0) / (60 / bpm / 2)))]
music = np.zeros(N)
bass = osc(36.7, shape='saw') * 0.5 + osc(73.4, shape='saw') * 0.25
gate = np.zeros(N)
for at in pulse8(100, 0.0, 16.5):
    gate += env(at, 0.005, 0.12)
music += lp(bass, 500) * gate * (0.3 + 0.7 * ss(0.0, 16.0, t)) * (1 - 0.6 * xray)
music += sum(osc(f) for f in (146.8, 174.6, 220.0)) * 0.08 * win(1.0, 3.0, 16.3, 16.6)
music += osc(36.7) * 0.25 * win(16.3, 16.8, 19.0, 19.5)                              # the floor drops out
pad = sum(osc(f * (1 + 0.002 * np.sin(2 * np.pi * 0.3 * t))) for f in (293.7, 370.0, 440.0, 587.3)) * 0.06
music += pad * win(19.6, 20.6, 23.6, 23.95)
kick = np.zeros(N)
for at in pulse8(128, K['hug'], K['pop']):
    kick += np.sin(2 * np.pi * np.cumsum(55 * (1 + 2 * np.exp(-np.clip(t - at, 0, None) / 0.03))) / SR) * env(at, 0.002, 0.12)
music += kick * 0.6 + lp(bass, 700) * 0.3 * win(K['hug'], K['hug'] + 0.2, K['pop'] - 0.05, K['pop'])
music += sum(osc(f, shape='tri') for f in (146.8, 185.0, 220.0, 293.7)) * 0.1 * env(K['pop'], 0.01, 2.5)   # the hit
music += pad * 1.4 * win(K['pop'] + 0.3, K['pop'] + 1.0, K['rule'] - 0.2, K['rule'])
light = np.zeros(N)
for i, at in enumerate(pulse8(120, K['rule'], K['alone'])):
    light += np.sin(2 * np.pi * np.cumsum(60 * (1 + 1.5 * np.exp(-np.clip(t - at, 0, None) / 0.03))) / SR) * env(at, 0.002, 0.1) * (i % 2 == 0)
    light += hp(noise(), 8000) * env(at, 0.001, 0.02) * 0.25
music += light * 0.5 + sum(osc(f, shape='tri') for f in (293.7, 370.0, 440.0)) * 0.05 * win(K['rule'], K['rule'] + 0.3, K['alone'] - 0.2, K['alone'])
music += (osc(36.7) * 0.3 + sum(osc(f) for f in (146.8, 174.6)) * 0.06) * win(K['alone'], K['alone'] + 0.3, K['pop2'] - 0.05, K['pop2'])
music += sum(osc(f, shape='tri') for f in (293.7, 370.0, 440.0, 587.3)) * 0.1 * env(K['pop2'] + 0.1, 0.01, 1.6)
music *= (1 - ss(43.15, 43.3, t))
music_all = music
# ───────────────────────────── narration ─────────────────────────────
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(HERE / "narracion.mp3"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
voice = np.frombuffer(raw, dtype="<f4").astype(np.float64)
voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]
voice = hp(voice, 80)


def compress(x, thr_db=-24, ratio=4.0, att=0.0015, rel=0.08):
    """Feed-forward peak compressor (smoothed |x| envelope), for the voice's crest factor."""
    a_att, a_rel = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    e = np.abs(x)
    env = np.empty_like(e)
    s_ = 0.0
    for i in range(len(e)):
        c = a_att if e[i] > s_ else a_rel
        s_ = c * s_ + (1 - c) * e[i]
        env[i] = s_
    thr = db(thr_db) * np.max(np.abs(x))
    g = np.where(env > thr, (env / thr) ** (1 / ratio - 1), 1.0)
    return x * g


voice = compress(voice)
voice = voice / np.max(np.abs(voice)) * 0.5

# side-chain: duck everything under the voice
venv = np.sqrt(np.maximum(lp(voice ** 2, 8), 0))
duck = 1 - 0.55 * np.clip(venv / (np.percentile(venv, 95) + 1e-9), 0, 1)

stems = {
    "voz": np.stack([voice, voice]),
    "musica": pan(music_all, 0) * duck * db(-10),
    "ambiente": pan(amb, 0) * db(-20) * duck,
    "fx": fx * (0.45 + 0.55 * duck) * db(-9),
}
# tame the effect transients so the limiter never works hard: a soft knee on the fx stem
stems["fx"] = np.tanh(stems["fx"] * 2.2) / 2.2


# ───────────────────────────── loudness + true-peak limiting ─────────────────────────────
def lufs(x):
    k = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x, axis=1)
    k = lfilter([1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621], k, axis=1)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    z = np.array([np.mean(k[:, i:i + blk] ** 2, axis=1).sum() for i in range(0, k.shape[1] - blk, hop)])
    l = -0.691 + 10 * np.log10(z + 1e-20)
    z1 = z[l > -70]
    rel = -0.691 + 10 * np.log10(z1.mean()) - 10
    z2 = z1[(-0.691 + 10 * np.log10(z1 + 1e-20)) > rel]
    return -0.691 + 10 * np.log10(z2.mean())


def true_peak(x):
    return 20 * np.log10(np.max(np.abs(resample_poly(x, 4, 1, axis=1))) + 1e-12)


def limit(x, ceil_db=-3.4, look=256, rel_s=0.12):
    up = resample_poly(x, 4, 1, axis=1)
    pk = np.max(np.abs(up), axis=0).reshape(-1, 4).max(axis=1)[: x.shape[1]]
    c = db(ceil_db)
    g = np.minimum(1, c / np.maximum(pk, 1e-9))
    # look-ahead minimum + release
    from numpy.lib.stride_tricks import sliding_window_view
    gp = np.pad(g, (0, look), constant_values=1)
    gmin = sliding_window_view(gp, look + 1).min(axis=1)[: len(g)]
    a = np.exp(-1 / (rel_s * SR))
    out = np.empty_like(gmin)
    s = 1.0
    for i in range(len(gmin)):
        s = gmin[i] if gmin[i] < s else gmin[i] + (s - gmin[i]) * a
        out[i] = s
    delayed = np.pad(x, ((0, 0), (look, 0)))[:, : x.shape[1]]
    return delayed * out, 20 * np.log10(out.min())


def limited(x, ceil_db):
    y, g = limit(x, ceil_db)
    y = np.roll(y, -256, axis=1)    # undo the look-ahead delay
    y[:, -256:] = 0
    return y, g


gain = -14.0 - lufs(sum(stems.values()))
stem_gr = {}
for _ in range(2):   # per-stem limiters on the peaky stems, then re-level the sum
    lv = {k: v * db(gain) for k, v in stems.items()}
    lv["voz"], stem_gr["voz"] = limited(lv["voz"], -5.0)
    lv["fx"], stem_gr["fx"] = limited(lv["fx"], -7.0)
    gain += -14.0 - lufs(sum(lv.values()))
mix, gr = limited(sum(lv.values()), -3.4)
final_lufs = lufs(mix)

(HERE / "stems").mkdir(exist_ok=True)


def write(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x.T * 32767).astype("<i2").tobytes())


for k, v in lv.items():
    write(HERE / "stems" / f"{k}.wav", v)
write(HERE / "mix.wav", mix)
rep = {"lufs": round(final_lufs, 2), "true_peak_dbtp": round(true_peak(mix), 2), "makeup_gain_db": round(gain, 2), "limiter_max_gr_db": round(gr, 2), "stem_limiter_gr_db": {k: round(v, 2) for k, v in stem_gr.items()},
       "stem_lufs": {k: round(lufs(v), 1) for k, v in lv.items()}}
(HERE / "mix_report.json").write_text(json.dumps(rep, indent=1))
print(json.dumps(rep, indent=1))
