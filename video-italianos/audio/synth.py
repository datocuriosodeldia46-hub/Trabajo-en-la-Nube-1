"""Música y efectos de sonido sintetizados 100% con código (numpy), sin samples externos."""
import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def env(n, a=0.005, d=0.1, s=0.0, r=0.05, sus_len=None):
    """Envolvente ADSR simple de n muestras."""
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    e = np.zeros(n)
    a = max(a, 1)
    e[:min(a, n)] = np.linspace(0, 1, a)[:min(a, n)]
    if n > a:
        dn = min(d, n - a)
        e[a:a + dn] = np.linspace(1, s, max(d, 1))[:dn]
        if n > a + d:
            e[a + d:] = s
    if r > 0 and n > r:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def lowpass(x, cutoff):
    """Filtro pasa bajos de un polo (cutoff puede ser un array)."""
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    alpha = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += alpha[i] * (x[i] - acc)
        y[i] = acc
    return y


def lp_fast(x, cutoff):
    """Pasa bajos por FFT (cutoff fijo), rápido para señales largas."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))


def bandpass_fast(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= (1 / (1 + (lo / np.maximum(f, 1)) ** 4)) * (1 / (1 + (f / hi) ** 4))
    return np.fft.irfft(X, len(x))


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


# ---------------- instrumentos ----------------
def pluck(freq, dur, bright=0.5, decay=0.996):
    """Cuerda pulsada (Karplus-Strong): mandolina / bajo pizzicato."""
    n = int(dur * SR)
    p = max(int(SR / freq), 2)
    buf = rng.uniform(-1, 1, p) * bright + rng.uniform(-1, 1, p) * (1 - bright) * 0.3
    out = np.zeros(n)
    for i in range(n):
        v = buf[i % p]
        out[i] = v
        buf[i % p] = decay * 0.5 * (v + buf[(i + 1) % p])
    return out * env(n, 0.001, dur, 0, 0.02)


def mandolin_tremolo(freq, dur, rate=14):
    """Trémolo de mandolina: la misma nota pulsada muy rápido (sonido típico italiano)."""
    n = int(dur * SR)
    out = np.zeros(n)
    step = int(SR / rate)
    for k, start in enumerate(range(0, n, step)):
        seg = pluck(freq * (1 + 0.002 * ((k % 2) - .5)), min(0.18, (n - start) / SR), 0.8, 0.99)
        out[start:start + len(seg)] += seg * (0.9 if k % 2 else 0.7)
    return out * env(n, 0.01, dur, 1, 0.05)


def accordion(freqs, dur):
    """Acordeón 'musette': dos lengüetas desafinadas con vibrato suave."""
    t = t_(dur)
    out = np.zeros_like(t)
    vib = 1 + 0.003 * np.sin(2 * np.pi * 5.5 * t)
    for f in freqs:
        for det in (1.0, 1.006):
            ph = 2 * np.pi * f * det * np.cumsum(vib) / SR
            saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
            sq = np.sign(np.sin(ph)) * 0.4
            out += saw * 0.5 + sq
    out = lp_fast(out, 2200)
    return out / max(1, len(freqs)) * env(len(t), 0.04, 0.1, 0.8, 0.08)


def glock(freq, dur=0.6):
    t = t_(dur)
    x = (np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t * 18)
         + 0.2 * np.sin(2 * np.pi * freq * 5.4 * t) * np.exp(-t * 30))
    return x * np.exp(-t * 6) * env(len(t), 0.001, dur, 1, 0.02)


def kick(dur=0.25):
    t = t_(dur)
    f = 110 * np.exp(-t * 25) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)


def tambourine(dur=0.18):
    t = t_(dur)
    n = rng.uniform(-1, 1, len(t))
    jingle = bandpass_fast(n, 5000, 12000) * np.exp(-t * 22)
    ring = sum(np.sin(2 * np.pi * f * t) for f in (6100, 7300, 8900)) * 0.05 * np.exp(-t * 30)
    return (jingle + ring) * 0.8


def shaker(dur=0.08):
    t = t_(dur)
    return bandpass_fast(rng.uniform(-1, 1, len(t)), 4000, 10000) * np.sin(np.pi * t / dur) ** 2


# ---------------- música ----------------
def place(buf, x, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(x))
    buf[i:j] += x[:j - i] * gain


def music(total_dur, bpm=118):
    """Tarantela ligera en Do mayor: bajo oom-pah, acordeón, mandolina con melodía y percusión."""
    beat = 60 / bpm
    bar = beat * 4
    n = int((total_dur + 2) * SR)
    bass, acc, mando, perc, gl = (np.zeros(n) for _ in range(5))
    C, F, G7, Am, Dm = [48, 52, 55], [53, 57, 60], [43, 47, 50, 53], [45, 48, 52], [50, 53, 57]
    prog = [C, G7, C, F, C, Am, Dm, G7]
    # melodía en grados (midi) por corchea; None = silencio. 8 compases x 8 corcheas
    mel = [
        [72, None, 76, 79, 76, None, 72, None], [74, None, 77, 79, 77, 76, 74, None],
        [72, None, 76, 79, 84, None, 83, 81], [81, None, 79, None, 77, 76, 77, None],
        [76, None, 79, 84, 79, None, 76, 72], [72, None, 76, 81, 79, 76, 74, None],
        [74, 77, 81, 79, 77, 74, 72, 71], [71, None, 74, 77, 79, None, None, None],
    ]
    nbars = int(np.ceil(total_dur / bar))
    for b in range(nbars):
        t0 = b * bar
        ch = prog[b % 8]
        root = ch[0] - 12
        for k in range(4):
            if k % 2 == 0:
                place(bass, pluck(midi(root if k == 0 else root + 7), beat * 0.9, 0.35, 0.995), t0 + k * beat, 0.9)
                place(perc, kick(), t0 + k * beat, 0.28)
            else:
                place(acc, accordion([midi(x + 12) for x in ch], beat * 0.55), t0 + k * beat, 0.32)
                place(perc, tambourine(), t0 + k * beat, 0.35)
            place(perc, shaker(), t0 + k * beat + beat / 2, 0.18)
        if b >= 1:  # la melodía entra en el compás 2
            line = mel[b % 8]
            k = 0
            while k < 8:
                note = line[k]
                if note is None:
                    k += 1
                    continue
                length = 1
                while k + length < 8 and line[k + length] is None and length < 2:
                    length += 1
                d = beat / 2 * length
                if length > 1:
                    place(mando, mandolin_tremolo(midi(note), d), t0 + k * beat / 2, 0.42)
                else:
                    place(mando, pluck(midi(note), d + 0.15, 0.85, 0.993), t0 + k * beat / 2, 0.5)
                k += length
        if b % 4 == 3:
            for i, nt in enumerate([84, 88, 91, 96]):
                place(gl, glock(midi(nt), 0.8), t0 + bar - beat + i * beat / 4, 0.12)
    out = bass * 0.75 + acc * 0.85 + mando * 1.1 + perc * 0.6 + gl
    # final: acorde largo de Do
    end = total_dur - 1.2
    fin = accordion([midi(x + 12) for x in C], 1.2) * 0.4
    mask = np.ones(n)
    i_end = int(end * SR)
    mask[i_end:] = np.linspace(1, 0, n - i_end) ** 2
    out = out * mask
    place(out, fin, end, 1.0)
    for i, nt in enumerate([72, 76, 79, 84]):
        place(out, pluck(midi(nt), 1.0, 0.8, 0.997) * 0.5, end + i * 0.05)
    return out[:int(total_dur * SR)]


# ---------------- efectos ----------------
def sfx_pop(pitch=1.0):
    t = t_(0.09)
    f = (900 * np.exp(-t * 30) + 250) * pitch
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35) * 0.9


def sfx_whoosh(dur=0.45, up=True):
    t = t_(dur)
    n = rng.uniform(-1, 1, len(t))
    c = np.linspace(600, 5000, len(t)) if up else np.linspace(5000, 600, len(t))
    x = lowpass(n, c) - lowpass(n, c * 0.35)
    return x * np.sin(np.pi * t / dur) ** 1.5 * 2.2


def sfx_sparkle():
    out = np.zeros(int(0.9 * SR))
    for i, nt in enumerate([88, 91, 95, 100]):
        place(out, glock(midi(nt), 0.6), i * 0.06, 0.5)
    return out


def sfx_boing(dur=0.5, up=False):
    t = t_(dur)
    f = (180 + 260 * (t / dur if up else 1 - t / dur)) * (1 + 0.25 * np.sin(2 * np.pi * 14 * t) * np.exp(-t * 4))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.5) * 0.8


def sfx_alarm(dur=1.3):
    t = t_(dur)
    bell = sum(np.sin(2 * np.pi * f * t) * a for f, a in ((2300, 1), (3450, .5), (5100, .25)))
    hammer = (np.sign(np.sin(2 * np.pi * 18 * t)) + 1) / 2
    return bell * hammer * env(len(t), 0.005, dur, 1, 0.15) * 0.35


def sfx_click_ding():
    out = np.zeros(int(1.0 * SR))
    t = t_(0.02)
    place(out, rng.uniform(-1, 1, len(t)) * np.exp(-t * 300), 0, 0.8)
    place(out, glock(midi(93), 0.9), 0.08, 0.6)
    place(out, glock(midi(100), 0.9), 0.08, 0.25)
    return out


def sfx_bloom():
    t = t_(0.35)
    f = 300 + 900 * (t / 0.35) ** 2
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.35) * 0.5


def sfx_party_horn():
    t = t_(0.7)
    f = 330 + 110 * np.minimum(t / 0.15, 1)
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.02 * np.sin(2 * np.pi * 30 * t))) / SR
    x = np.sign(np.sin(ph)) * 0.5 + (2 * ((ph / (2 * np.pi)) % 1) - 1) * 0.5
    x = lp_fast(x, 3000) * env(len(t), 0.02, 0.1, 0.9, 0.12)
    crackle = np.zeros(int(1.2 * SR))
    for _ in range(40):
        place(crackle, rng.uniform(-1, 1, 200) * np.exp(-np.arange(200) / 40), rng.uniform(0.2, 1.1), rng.uniform(0.1, 0.4))
    out = np.zeros(int(1.2 * SR))
    place(out, x, 0, 0.6)
    return out + crackle


def sfx_bubbles(count=8, dur=1.2):
    out = np.zeros(int(dur * SR))
    for _ in range(count):
        d = rng.uniform(0.04, 0.09)
        t = t_(d)
        f0 = rng.uniform(500, 1100)
        f = f0 * (1 + 2.5 * t / d)
        place(out, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d), rng.uniform(0, dur - 0.1), 0.35)
    return out


def sfx_twinkle():
    out = np.zeros(int(1.3 * SR))
    for i, nt in enumerate([96, 100, 103, 108, 103, 108]):
        place(out, glock(midi(nt), 0.5), i * 0.09, 0.35 * (1 - i * 0.08))
    return out


def sfx_slide_whistle(dur=0.45, up=True):
    t = t_(dur)
    f = (700 + 1200 * (t / dur if up else 1 - t / dur)) * (1 + 0.01 * np.sin(2 * np.pi * 6 * t))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) * 0.45


def sfx_chime():
    out = np.zeros(int(1.6 * SR))
    for i, nt in enumerate([84, 91, 88, 96, 93]):
        place(out, glock(midi(nt), 1.0), i * 0.14, 0.3)
    return out


def sfx_balloon_pop():
    t = t_(0.12)
    x = rng.uniform(-1, 1, len(t)) * np.exp(-t * 60)
    return lowpass(x, 4000) * 1.4


def sfx_squeak():
    t = t_(0.25)
    f = 900 + 500 * np.sin(np.pi * t / 0.25)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.25) * 0.3


def brass(freq, dur):
    t = t_(dur)
    ph = 2 * np.pi * freq * np.cumsum(1 + 0.004 * np.sin(2 * np.pi * 5 * t)) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    cut = 600 + 3500 * np.minimum(t / 0.05, 1) * np.exp(-t * 2)
    return lowpass(saw, cut) * env(len(t), 0.02, 0.1, 0.85, 0.08)


def sfx_fanfare():
    out = np.zeros(int(1.6 * SR))
    for (nt, at, d) in [(67, 0, .13), (67, .15, .13), (67, .3, .13), (72, .45, .9)]:
        for h in (0, 4, 7):
            place(out, brass(midi(nt + h), d), at, 0.22)
    return out


def sfx_thump():
    return kick(0.3) * 0.9


def sfx_confetti():
    out = np.zeros(int(1.0 * SR))
    for _ in range(50):
        place(out, rng.uniform(-1, 1, 120) * np.exp(-np.arange(120) / 25), rng.uniform(0, 0.9), rng.uniform(0.05, 0.25))
    return bandpass_fast(out, 2000, 12000) * 1.5


def sfx_giggle(base=520):
    """Risita de personaje: sílabas 'ji-ji-ji' con síntesis de formantes."""
    out = np.zeros(int(0.8 * SR))
    for i in range(4):
        d = 0.09
        t = t_(d)
        f0 = base * (1.15 - 0.06 * i) * (1 + 0.08 * np.sin(np.pi * t / d))
        ph = 2 * np.pi * np.cumsum(f0) / SR
        src = sum(np.sin(k * ph) / k for k in range(1, 14))
        voice = bandpass_fast(src, 250, 900) * 0.6 + bandpass_fast(src, 2200, 3200) * 1.2  # vocal 'i'
        breath = bandpass_fast(rng.uniform(-1, 1, len(t)), 2000, 6000) * 0.15
        place(out, (voice + breath) * np.sin(np.pi * t / d) ** 0.7, i * 0.13, 0.9)
    return out


def sfx_yawn():
    """Bostezo corto de personaje (vocal 'a' descendente)."""
    d = 0.9
    t = t_(d)
    f0 = 420 - 170 * (t / d)
    ph = 2 * np.pi * np.cumsum(f0) / SR
    src = sum(np.sin(k * ph) / k for k in range(1, 16))
    voice = bandpass_fast(src, 600, 1300) + bandpass_fast(src, 1000, 1800) * 0.6
    return voice * np.sin(np.pi * t / d) ** 0.8 * 0.55


def sfx_wow():
    """'¡Uaau!' corto: vocal que abre de 'u' a 'a'."""
    d = 0.5
    t = t_(d)
    f0 = 480 + 120 * np.sin(np.pi * t / d)
    ph = 2 * np.pi * np.cumsum(f0) / SR
    src = sum(np.sin(k * ph) / k for k in range(1, 16))
    mix = np.linspace(0, 1, len(t))
    voice = bandpass_fast(src, 250, 500) * (1 - mix) + bandpass_fast(src, 700, 1400) * mix
    return voice * np.sin(np.pi * t / d) ** 0.6 * 0.8
