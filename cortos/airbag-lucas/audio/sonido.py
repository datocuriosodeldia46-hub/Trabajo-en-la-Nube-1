"""Sound for "Lucas": effects, ambience and music synthesised in numpy, mixed under the ElevenLabs narration.

Everything is keyed to story time (the narration clock). Sounds that belong to the world — the engine, the city,
the traffic — are generated on the *world clock* and read back through the same time warp as the picture
(see rate() in index.html), so bullet time slurs them down like a tape stop and they come back up after the fall.

    python3 audio/sonido.py      -> audio/stems/*.wav, audio/mix.wav, audio/mix_report.json
Target: about -14 LUFS integrated, true peak <= -2 dBTP after AAC.
"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import lfilter, butter, sosfilt, resample_poly, fftconvolve

HERE = Path(__file__).resolve().parent
SR = 48000
T_END = 35.3
N = int(T_END * SR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)


# ───────────────────────────── the clock (mirrors index.html) ─────────────────────────────
def ss(a, b, x):
    u = np.clip((x - a) / (b - a), 0, 1)
    return u * u * (3 - 2 * u)


def lerp(a, b, u):
    return a + (b - a) * u


def rate(x):
    x = np.asarray(x, dtype=float)
    r = np.ones_like(x)
    r = np.where(x < 5.4, 1, r)
    r = np.where((x >= 5.4) & (x < 6.9), lerp(1, 0.03, ss(5.4, 6.9, x)), r)
    r = np.where((x >= 6.9) & (x < 19.6), 0.03, r)
    r = np.where((x >= 19.6) & (x < 23.7), lerp(0.03, 0.35, ss(19.6, 20.0, x)), r)
    r = np.where((x >= 23.7) & (x < 25.9), lerp(0.35, 0.06, ss(23.7, 24.0, x)), r)
    r = np.where((x >= 25.9) & (x < 27.9), lerp(0.06, 0.7, ss(25.9, 26.2, x)), r)
    r = np.where(x >= 27.9, lerp(0.7, 1, ss(27.9, 28.5, x)), r)
    return r


R = rate(t)
W = np.cumsum(R) / SR            # world time at each output sample
W_END = W[-1]


def warp(x_world):
    """Read a buffer generated on the world clock (at SR) back on the story clock."""
    idx = W * SR
    return np.interp(idx, np.arange(len(x_world)), x_world)


# ───────────────────────────── helpers ─────────────────────────────
def env(x, a, d, peak=1.0):
    """Attack-decay envelope starting at time x (in story seconds)."""
    e = np.zeros(N)
    u = t - x
    e = np.where((u >= 0) & (u < a), u / max(a, 1e-4), e)
    e = np.where(u >= a, np.exp(-(u - a) / max(d, 1e-4)), e)
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


# ───────────────────────────── world sounds (generated on the world clock) ─────────────────────────────
NW = int((W_END + 1) * SR)
tw = np.arange(NW) / SR


def world_noise():
    return rng.standard_normal(NW)


def wosc(freq, shape="saw"):
    ph = 2 * np.pi * np.cumsum(np.broadcast_to(freq, (NW,))) / SR
    if shape == "saw":
        return 2 * ((ph / (2 * np.pi)) % 1) - 1
    return np.sin(ph)


# the bike: a 150 cc single at ~7000 rpm — firing pulses with harmonics, plus intake noise; it dies at the crash
W_CRASH = float(np.interp(19.9, t, W))
alive = np.clip(1 - (tw - W_CRASH) / 0.15, 0, 1)
f_eng = 58 + 4 * np.sin(2 * np.pi * 0.3 * tw)
eng = 0.6 * wosc(f_eng) + 0.35 * wosc(f_eng * 2.01) + 0.2 * np.sin(2 * np.pi * np.cumsum(f_eng * 0.5) / SR)
eng = lp(np.tanh(eng * 1.8), 1800) + 0.15 * bp(world_noise(), 300, 2500)
eng *= alive
engine_w = eng

# the city: low traffic rumble, a distant bus, wind of speed (only while riding)
rumble = lp(world_noise(), 180, 4) * 1.2 + 0.25 * bp(world_noise(), 400, 1200)
wind = bp(world_noise(), 300, 3000) * np.clip(1 - (tw - W_CRASH) / 0.3, 0, 1) * 0.5
city_w = rumble + wind

# the bike sliding on its side: scrape + spark sizzle
slide_on = np.clip((tw - (W_CRASH + 0.6)) / 0.1, 0, 1) * np.clip(1 - (tw - (W_CRASH + 2.4)) / 0.4, 0, 1)
scrape = bp(world_noise(), 900, 5000) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 23 * tw))) + 0.5 * hp(world_noise(), 6000) * (rng.random(NW) < 0.02)
scrape_w = scrape * slide_on

engine = warp(engine_w)
city = warp(city_w)
scrape_s = warp(scrape_w)
# bullet time muffles the world: the warp already lowers the pitch; add a low-pass that closes with the rate
muffle = 300 + 15000 * np.clip(R, 0, 1) ** 1.5
engine = sweep_lp(engine, muffle)
city = sweep_lp(city, muffle)

# ───────────────────────────── one-shots (story time) ─────────────────────────────
fx = np.zeros((2, N))


def add(sig, p=0.0, gain_db=0.0):
    global fx
    fx += pan(sig, p) * db(gain_db)


def boom(at, f0=55, dur=0.9, gain=0.0):
    f = f0 * (1 + 1.5 * np.exp(-(t - at).clip(0) / 0.05))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(at, 0.004, dur / 3)
    add(np.tanh(s * 2), 0, gain)


def whoosh(at, dur=0.5, lo=300, hi=3000, gain=-6, p=0.0):
    e = np.exp(-((t - at - dur / 2) / (dur / 3)) ** 2)
    s = bp(noise(), lo, hi) * e
    add(s, p, gain)


def click(at, f=2400, gain=-12, d=0.02, p=0.0):
    s = np.sin(2 * np.pi * f * t) * env(at, 0.001, d)
    add(s, p, gain)


# hook: the truck's horn (a two-tone air horn) as it cuts in, tyres chirp
horn = (osc(311, shape="saw") + osc(370, shape="saw") * 0.8) * win(2.55, 2.6, 3.25, 3.4)
add(lp(horn, 2500) * 0.35, 0.4, -4)
add(bp(noise(), 1800, 4200) * win(3.05, 3.12, 3.4, 3.55) * (0.6 + 0.4 * np.sin(2 * np.pi * 37 * t)), -0.1, -14)
# cut whooshes in the hook
for c in (1.12, 1.76, 2.6, 3.5):
    whoosh(c - 0.18, 0.36, 500, 5000, -16, 0)
# X-ray "on": a glassy shimmer up
for at in (4.45, 6.85, 23.85, 28.75):
    s = sum(np.sin(2 * np.pi * f * t) for f in (1320, 1980, 2640)) * env(at, 0.05, 0.5) * 0.3
    add(s + 0.4 * hp(noise(), 5000) * env(at, 0.01, 0.15), 0, -12)
# the slow-down: reverse-cymbal swell into the freeze
add(hp(noise(), 2500) * ss(5.0, 6.8, t) * (1 - ss(6.8, 6.95, t)), 0, -14)
boom(6.9, 40, 1.6, -6)

# heartbeat while frozen (lub-dub), slow
for k, at in enumerate(np.arange(7.2, 19.6, 1.05)):
    boom(at, 48, 0.25, -11)
    boom(at + 0.22, 44, 0.2, -15)
# sensors: soft ticks at 3 Hz, then the "thousand times a second" buzz, then faster pings with the alert
for at in np.arange(6.96, 8.44, 1 / 3):
    click(at, 3200, -20, 0.015, -0.2)
buzz = (osc(1000, shape="square") * 0.3 + osc(1000) * 0.7) * win(8.44, 8.5, 9.5, 9.6)
add(bp(buzz, 600, 4000) * (0.6 + 0.4 * osc(14)), 0, -24)
for at in np.arange(9.6, 11.7, 1 / 8):
    f = 2200 if at < 10.5 else 1400
    click(at, f, -18 if at < 10.5 else -13, 0.04, 0.1)
# alert: two-tone warning at "va a chocar"
alert = (osc(880, shape="square") * (np.floor(t * 6) % 2) + osc(660, shape="square") * (1 - np.floor(t * 6) % 2)) * win(10.6, 10.65, 11.6, 11.7)
add(lp(alert, 3000) * 0.3, 0, -18)
# the gas generator fires: a hard click, then a pressurised hiss running through the ducts
click(12.64, 3000, -6, 0.008)
boom(12.64, 90, 0.3, -10)
hiss = hp(noise(), 2500) * win(12.66, 12.7, 13.9, 14.1)
add(sweep_lp(hiss, 3000 + 9000 * ss(12.66, 14.0, t)), 0, -12)
# inflation: a deep "WHUMP" of air
add(lp(noise(), 400) * env(14.15, 0.01, 0.25), 0, -2)
boom(14.17, 62, 1.2, -2)
whoosh(14.05, 0.35, 200, 1500, -8)
# the blink: a tiny wet click, slowed
click(15.85, 900, -22, 0.06)
# armour of air: a shimmering pad swells, three stingers on neck / chest / back
pad = sum(np.sin(2 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * 0.3 * t)) for f in (220, 277.2, 329.6, 440)) * win(16.3, 17.0, 19.6, 19.85) * 0.12
add(reverb(pad, 2.2, 0.5)[0], 0, -10)
for at, p in ((18.32, -0.3), (18.72, 0.0), (19.15, 0.3)):
    whoosh(at - 0.08, 0.2, 800, 6000, -12, p)
    click(at, 1760, -16, 0.15, p)
# riser into the crash
riser = osc(110 * 2 ** (ss(17.5, 19.85, t) * 2), shape="saw") * ss(17.5, 19.8, t) * (1 - ss(19.82, 19.87, t))
add(lp(riser, 2000) * 0.25, 0, -14)
# CRASH: metal crunch + low boom + glass tinkle
crunch = bp(noise(), 200, 6000) * env(19.9, 0.002, 0.35)
partials = sum(np.sin(2 * np.pi * f * t) * env(19.9, 0.002, d) for f, d in ((431, 0.6), (1177, 0.4), (2213, 0.3), (3301, 0.25)))
add(np.tanh(crunch * 2 + partials * 0.3), 0.2, -1)
boom(19.9, 45, 1.8, 0)
tink = sum(np.sin(2 * np.pi * (4000 + 3000 * rng.random()) * t) * env(19.95 + rng.random() * 0.6, 0.001, 0.08) for _ in range(14))
add(tink * 0.2, 0.3, -12)
# flight: wind rushing in slow motion; the fall
add(bp(noise(), 150, 1200) * win(19.95, 20.4, 22.8, 23.6) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.7 * t)), -0.2, -8)
whoosh(22.1, 1.2, 100, 900, -6)
# landing on the air bag: a soft, heavy "poof" — no crack
add(lp(noise(), 500) * env(23.9, 0.005, 0.35), 0, -1)
boom(23.9, 50, 1.4, -2)
# absorbs: a long compressed-air exhale
add(bp(noise(), 300, 2500) * win(23.95, 24.1, 25.5, 25.95) * np.exp(-(t - 23.95).clip(0) * 0.7), 0, -12)
# rolling: tumbling thuds on the asphalt
for at in (26.2, 26.6, 27.0, 27.35, 27.6):
    boom(at, 70, 0.18, -10)
    add(bp(noise(), 400, 3000) * env(at, 0.005, 0.12), rng.uniform(-0.3, 0.3), -14)
# helmet: crash detected (fast red beeps) → location sent (rising pings with each ring)
for at in np.arange(28.9, 29.9, 0.125):
    click(at, 1975, -16, 0.05, -0.1)
for i in range(7):
    at = 30.0 + i * 0.26
    s = np.sin(2 * np.pi * np.cumsum(1200 + 1600 * ss(at, at + 0.25, t)) / SR) * env(at, 0.005, 0.18)
    add(s, -0.4 + i * 0.12, -16)
# the ambulance, far away up Reforma (a wailing siren) coming in
siren_f = 700 + 400 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.55 * t))
siren = osc(siren_f, shape="tri") * ss(30.1, 31.4, t) * (1 - ss(31.62, 31.76, t))
add(reverb(lp(siren, 2500) * 0.25, 1.4, 0.6)[0], -0.5, -16)
# getting up: cloth, the bag zip and lid
add(bp(noise(), 1500, 6000) * win(31.8, 31.9, 32.2, 32.3), 0, -20)
zip_ = bp(noise(), 2000, 7000) * (np.sin(2 * np.pi * 45 * t) > 0) * win(33.05, 33.1, 33.4, 33.45)
add(zip_, 0.2, -16)
# the door: latch click, a creak, then the hand-over
click(33.93, 1800, -12, 0.03, -0.3)
add(bp(osc(180 + 60 * np.sin(2 * np.pi * 3 * t), shape="saw"), 300, 1500) * win(33.95, 34.0, 34.25, 34.3) * 0.3, -0.3, -18)
# end: a bright "ding" on "a tiempo"
ding = sum(np.sin(2 * np.pi * f * t) * env(34.48, 0.003, 0.9) for f in (1046.5, 1568, 2093)) * 0.35
add(ding, 0, -8)

# ───────────────────────────── music ─────────────────────────────
# Hook: 120 bpm drive in D minor (kick, 16th hats, octave bass, stabs) that tape-stops into the freeze;
# a warm groove comes back once Lucas gets up.
music_w = np.zeros(NW)
beat = 0.5
for k in range(int(8 / beat)):      # world seconds 0–8 (covers the hook before the freeze)
    at = k * beat
    e = np.exp(-np.clip(tw - at, 0, None) / 0.12) * (tw >= at)
    music_w += np.sin(2 * np.pi * np.cumsum(50 * (1 + 2 * np.exp(-np.clip(tw - at, 0, None) / 0.03))) / SR) * e * 0.9
for k in range(int(8 / (beat / 4))):
    at = k * beat / 4
    music_w += hp(world_noise(), 7000) * np.exp(-np.clip(tw - at, 0, None) / 0.03) * (tw >= at) * (0.25 if k % 2 else 0.12)
notes = [73.42, 73.42, 87.31, 73.42, 98.0, 73.42, 87.31, 65.41]
for k in range(int(8 / (beat / 2))):
    at = k * beat / 2
    f = notes[k % 8]
    g = np.exp(-np.clip(tw - at, 0, None) / 0.18) * (tw >= at) * (tw < at + beat / 2)
    music_w += lp(np.tanh(2 * wosc(f) ), 900) * g * 0.35
music_w *= np.clip(1 - (tw - 6.6) / 0.3, 0, 1)
music_w = lp(music_w, 8000)
music = warp(music_w)
music = sweep_lp(music, 400 + 16000 * np.clip(R, 0, 1) ** 2)
# frozen drone (story time): low D with a slow beating fifth
drone = (osc(36.7) + 0.6 * osc(55.1) + 0.3 * osc(73.4 * 1.003)) * win(6.6, 7.4, 19.8, 19.9) * 0.35
drone += (osc(36.7) + 0.5 * osc(55.0)) * win(23.8, 24.0, 25.9, 26.0) * 0.3
# resolve: warm groove from the get-up to the end (D major, 100 bpm), cut dead at the end
groove = np.zeros(N)
b2 = 0.6
for k in range(int((T_END - 31.76) / (b2 / 2)) + 1):
    at = 31.76 + k * b2 / 2
    e = np.exp(-np.clip(t - at, 0, None) / 0.15) * (t >= at)
    if k % 2 == 0:
        groove += np.sin(2 * np.pi * np.cumsum(52 * (1 + 1.5 * np.exp(-np.clip(t - at, 0, None) / 0.03))) / SR) * e * 0.8
    groove += hp(noise(), 8000) * np.exp(-np.clip(t - at, 0, None) / 0.02) * (t >= at) * 0.12
chords = [(146.8, 185.0, 220.0), (123.5, 146.8, 185.0), (110.0, 138.6, 164.8), (130.8, 164.8, 196.0)]
for k in range(4):
    at = 31.76 + k * 2 * b2 * 2
    g = ss(at, at + 0.05, t) * (1 - ss(at + 2.3, at + 2.4, t))
    groove += sum(osc(f, shape="tri") for f in chords[k % 4]) * g * 0.12
groove *= ss(31.7, 32.0, t) * (1 - ss(35.18, 35.3, t))
music_all = music + drone + groove

# ───────────────────────────── narration ─────────────────────────────
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(HERE / "narracion.mp3"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
voice = np.frombuffer(raw, dtype="<f4").astype(np.float64)
voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]
voice = hp(voice, 80)

# side-chain: duck everything under the voice
venv = np.sqrt(lp(voice ** 2, 8))
duck = 1 - 0.55 * np.clip(venv / (np.percentile(venv, 95) + 1e-9), 0, 1)

stems = {
    "voz": np.stack([voice, voice]),
    "musica": pan(music_all, 0) * duck * db(-8),
    "ambiente": (pan(city, -0.15) * db(-20) + pan(engine, 0.1) * db(-14)) * duck,
    "fx": fx * (0.4 + 0.6 * duck) + pan(scrape_s, 0.25) * db(-18),
}


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


mix = sum(stems.values())
gain = -14.0 - lufs(mix)
mix = mix * db(gain)
mix, gr = limit(mix)
mix = np.roll(mix, -256, axis=1)    # undo the limiter's look-ahead delay
mix[:, -256:] = 0
final_lufs = lufs(mix)

(HERE / "stems").mkdir(exist_ok=True)


def write(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x.T * 32767).astype("<i2").tobytes())


for k, v in stems.items():
    write(HERE / "stems" / f"{k}.wav", v * db(gain))
write(HERE / "mix.wav", mix)
rep = {"lufs": round(final_lufs, 2), "true_peak_dbtp": round(true_peak(mix), 2), "makeup_gain_db": round(gain, 2), "limiter_max_gr_db": round(gr, 2),
       "stem_lufs": {k: round(lufs(v * db(gain)), 1) for k, v in stems.items()}}
(HERE / "mix_report.json").write_text(json.dumps(rep, indent=1))
print(json.dumps(rep, indent=1))
