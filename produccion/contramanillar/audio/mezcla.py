"""Diseño de sonido del reel, 100 % sintetizado con código.

Lee la línea de tiempo compartida (src/moto/eventos.json) y la narración (public/narracion.mp3)
y genera public/mezcla.wav: música + efectos + voz, con la música agachándose bajo la voz.

Uso: python3 audio/mezcla.py   (desde la raíz del proyecto; requiere numpy, scipy, librosa y ffmpeg)
"""
import json
import subprocess
from pathlib import Path

import librosa
import numpy as np
from scipy.signal import butter, sosfilt, sosfiltfilt

SR = 44100
RAIZ = Path(__file__).resolve().parent.parent
EV = json.loads((RAIZ / "src/moto/eventos.json").read_text())
DUR = EV["duracion"]
N = int(DUR * SR)
rng = np.random.default_rng(7)


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def filtro(x, tipo, f, orden=2):
    return sosfilt(butter(orden, f, btype=tipo, fs=SR, output="sos"), x)


def env_adsr(n, a=0.005, r=0.2):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na) if na else 1
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def colocar(pista, sonido, t, gan=1.0, pan=0.0):
    """Suma un sonido mono/estéreo en `pista` (2, N) a partir del segundo t."""
    i = int(t * SR)
    if i >= N:
        return
    if sonido.ndim == 1:
        izq, der = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sonido = np.vstack([sonido * izq * 1.414, sonido * der * 1.414])
    n = min(sonido.shape[1], N - i)
    pista[:, i:i + n] += sonido[:, :n] * gan


# ---------- Efectos ----------
def whoosh(dur=0.5, alto=1.0):
    n = int(dur * SR)
    ruido = rng.standard_normal(n)
    # filtro pasa banda con centro que barre (procesado por bloques)
    out = np.zeros(n)
    bloques = 24
    for b in range(bloques):
        a, z = b * n // bloques, (b + 1) * n // bloques
        k = b / (bloques - 1)
        fc = 250 + 3200 * alto * np.sin(np.pi * k) ** 1.5
        out[a:z] = filtro(ruido[a:z], "bandpass", [fc * 0.6, min(fc * 1.6, 18000)])
    env = np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    s = out * env
    # paneo izquierda → derecha
    p = np.linspace(-0.8, 0.8, n)
    return np.vstack([s * np.cos((p + 1) * np.pi / 4), s * np.sin((p + 1) * np.pi / 4)]) * 1.3


def impacto(fuerza=1.0):
    t = t_(0.9)
    f = 45 + 95 * np.exp(-t * 18)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (5 - 2 * fuerza))
    click = filtro(rng.standard_normal(len(t)), "lowpass", 2500) * np.exp(-t * 60)
    cuerpo = filtro(rng.standard_normal(len(t)), "bandpass", [80, 400]) * np.exp(-t * 14)
    s = np.tanh((sub * 1.2 + click * 0.5 + cuerpo * 0.6) * (1.2 + fuerza))
    return s * (0.5 + 0.5 * fuerza)


def subida(dur):
    t = t_(dur)
    k = t / dur
    ruido = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    bloques = 30
    for b in range(bloques):
        a, z = b * len(t) // bloques, (b + 1) * len(t) // bloques
        out[a:z] = filtro(ruido[a:z], "highpass", 300 + 6000 * (b / bloques) ** 2)
    tono = np.sin(2 * np.pi * np.cumsum(220 + 900 * k ** 2) / SR)
    return (out * 0.6 + tono * 0.25) * k ** 2.2


def tick():
    t = t_(0.05)
    return (np.sin(2 * np.pi * 2300 * t) + 0.4 * rng.standard_normal(len(t))) * np.exp(-t * 120)


def pop():
    t = t_(0.12)
    f = 400 + 700 * np.exp(-t * 40)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30)


def zumbido_error():
    t = t_(0.4)
    s = np.sign(np.sin(2 * np.pi * 110 * t)) + np.sign(np.sin(2 * np.pi * 117 * t))
    return filtro(s, "lowpass", 1800) * env_adsr(len(t), 0.005, 0.08) * 0.35


def alarma():
    t = t_(0.7)
    s = sum(np.sin(2 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * 5 * t)) for f in (98, 196, 294))
    return np.tanh(s * 1.5) * env_adsr(len(t), 0.01, 0.4) * 0.4


def derrape(dur):
    t = t_(dur)
    f = 1900 + 250 * np.sin(2 * np.pi * 9 * t) + 120 * rng.standard_normal(len(t)).cumsum() / SR
    chillido = np.sin(2 * np.pi * np.cumsum(f) / SR)
    ruido = filtro(rng.standard_normal(len(t)), "bandpass", [1500, 4000])
    return (chillido * 0.5 + ruido * 0.6) * env_adsr(len(t), 0.03, 0.25) * 0.5


def tap():
    t = t_(0.04)
    return filtro(rng.standard_normal(len(t)), "bandpass", [1500, 5000]) * np.exp(-t * 150)


def ding():
    t = t_(1.0)
    return (np.sin(2 * np.pi * 1318.5 * t) + 0.6 * np.sin(2 * np.pi * 1975.5 * t)) * np.exp(-t * 4) * 0.4


def motor(dur, carga):
    """Motor bicilíndrico: frecuencia de encendido con armónicos, vibración y filtro."""
    t = t_(dur)
    rpm = (2200 + 5200 * carga) * (1 + 0.04 * np.sin(2 * np.pi * 0.7 * t)) + 300 * np.sin(2 * np.pi * 0.23 * t)
    f0 = rpm / 60  # dos cilindros a 4 tiempos: un encendido por vuelta
    fase = 2 * np.pi * np.cumsum(f0) / SR
    s = sum((1 / k) * np.sin(k * fase + rng.uniform(0, 6)) for k in range(1, 9))
    s *= 1 + 0.5 * np.sin(fase * 0.5)
    s += 0.15 * filtro(rng.standard_normal(len(t)), "lowpass", 900)
    s = filtro(np.tanh(s * 1.3), "lowpass", 1100)
    fade = min(0.4, dur / 4)
    return s * env_adsr(len(t), fade, fade) * 0.35


# ---------- Música ----------
BPM = EV["musica"]["bpm"]
NEGRA = 60 / BPM
COMPAS = 4 * NEGRA
ACORDES = [  # La menor – Fa – Do – Sol (raíz en Hz para el bajo, notas del acorde)
    (55.00, [220.00, 261.63, 329.63]),
    (43.65, [174.61, 220.00, 261.63]),
    (65.41, [261.63, 329.63, 392.00]),
    (49.00, [196.00, 246.94, 293.66]),
]


def bombo():
    t = t_(0.45)
    f = 48 + 110 * np.exp(-t * 30)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * 2.2)


def palmada():
    t = t_(0.25)
    r = filtro(rng.standard_normal(len(t)), "bandpass", [900, 3500])
    env = np.exp(-t * 22) * (1 + 0.6 * (np.sin(2 * np.pi * 90 * t) > 0) * (t < 0.03))
    return r * env * 0.8


def platillo(abierto=False):
    t = t_(0.18 if abierto else 0.05)
    return filtro(rng.standard_normal(len(t)), "highpass", 7000) * np.exp(-t * (18 if abierto else 80)) * 0.35


def pulso(f, dur):
    t = t_(dur)
    s = sum(np.sign(np.sin(2 * np.pi * f * d * t)) for d in (1, 1.007))
    return filtro(s, "lowpass", 2400) * np.exp(-t * 9) * 0.12


def colchon(notas, dur):
    t = t_(dur)
    s = sum(((2 * ((f * d * t) % 1) - 1)) for f in notas for d in (0.996, 1.004))
    return filtro(s, "lowpass", 900) * env_adsr(len(t), 0.25, 0.4) * 0.05


def energia(t):
    """0 = intro filtrada, 0.5 = calma (explicación), 1 = completo; 0 en los cortes de silencio."""
    m = EV["musica"]
    if any(a <= t < b for a, b in m["corte"]):
        return 0.0
    if t < m["drops"][0]:
        return 0.35
    if any(a <= t < b for a, b in m["calma"]):
        return 0.5
    return 1.0


def musica():
    pista = np.zeros((2, N))
    paso = NEGRA / 2  # corcheas
    i = 0
    while i * paso < DUR:
        t = i * paso
        e = energia(t)
        acorde = ACORDES[int(t // COMPAS) % 4]
        tiempo = i % 8  # posición en el compás (corcheas)
        if e > 0:
            if tiempo in (0, 3, 4) or (e >= 1 and tiempo == 6 and (i // 8) % 2):
                colocar(pista, bombo(), t, 0.9 if e >= 0.5 else 0.6)
            if e >= 0.5 and tiempo in (2, 6):
                colocar(pista, palmada(), t, 0.55 * e, pan=0.1)
            if e >= 0.5:
                colocar(pista, platillo(tiempo == 7), t, 0.5 * e, pan=-0.3 if i % 2 else 0.3)
            # arpegio (genera la sensación de "curiosidad")
            nota = acorde[1][[0, 1, 2, 1][i % 4]] * (2 if i % 8 >= 4 else 1)
            colocar(pista, pulso(nota, paso * 0.9), t, 0.7 * e, pan=0.4 * np.sin(i))
            if tiempo == 0:
                tb = t_(COMPAS)
                bajo = np.sin(2 * np.pi * acorde[0] * tb) + 0.3 * np.sin(4 * np.pi * acorde[0] * tb)
                colocar(pista, np.tanh(bajo * 1.5) * env_adsr(len(tb), 0.01, 0.3) * 0.28 * e, t)
                colocar(pista, colchon(acorde[1], COMPAS), t, 1.0)
        i += 1
    # La intro va filtrada (sonido "lejano") hasta el primer drop
    d0 = int(EV["musica"]["drops"][0] * SR)
    pista[:, :d0] = np.vstack([filtro(c, "lowpass", 700) for c in pista[:, :d0]])
    return pista


# ---------- Mezcla ----------
MUSICA = 0.12   # la voz queda ~13 dB por encima de la música mientras habla
EFECTOS = 0.6
def cargar_voz():
    y, _ = librosa.load(str(RAIZ / "public/narracion.mp3"), sr=SR, mono=True)
    v = np.zeros(N)
    v[: min(N, len(y))] = y[:N]
    return v / (np.abs(v).max() + 1e-9) * 0.7


def envolvente(x, ataque=0.01, suelta=0.25):
    r = np.abs(x)
    r = sosfiltfilt(butter(1, 8, fs=SR, output="sos"), r)
    return np.clip(r / (np.percentile(r, 98) + 1e-9), 0, 1)


def main():
    voz = cargar_voz()
    mus = musica()
    fx = np.zeros((2, N))

    for t in EV["cortes"]:
        colocar(fx, whoosh(0.5), t - 0.25, 0.32)
    for t, f in EV["golpes"]:
        colocar(fx, impacto(f), t - 0.01, 0.45 * f + 0.1)
    for a, b in EV["subidas"]:
        colocar(fx, subida(b - a), a, 0.22)
    for a, b, carga in EV["motor"]:
        colocar(fx, motor(b - a, carga), a, 0.55)
    for a, b in EV["derrape"]:
        colocar(fx, derrape(b - a), a, 0.5, pan=0.2)
    for t in EV["error"]:
        colocar(fx, zumbido_error(), t, 0.5)
    for t in EV["alarma"]:
        colocar(fx, alarma(), t, 0.45)
    for t in EV["ticks"]:
        colocar(fx, tick(), t, 0.25)
    ui = EV["ui"]
    for t in ui["pop"]:
        colocar(fx, pop(), t, 0.4)
    for t in ui["swish"]:
        colocar(fx, whoosh(0.3, 1.4), t, 0.25)
    for t in ui["tap"]:
        colocar(fx, tap(), t, 0.4)
    for t in ui["ding"]:
        colocar(fx, ding(), t, 0.5)

    # La música baja cuando habla el narrador (sidechain con la envolvente de la voz)
    env = envolvente(voz)
    mus *= 1 - 0.7 * env
    mezcla = mus * MUSICA + fx * EFECTOS + np.vstack([voz, voz])
    # Fundido final
    nf = int(1.2 * SR)
    mezcla[:, -nf:] *= np.linspace(1, 0, nf)
    mezcla = np.tanh(mezcla * 1.1) / np.tanh(1.1)

    crudo = RAIZ / "audio/mezcla_cruda.wav"
    import soundfile as sf
    sf.write(crudo, mezcla.T.astype(np.float32), SR)
    # Normaliza a -14 LUFS (estándar de redes) con pico máximo de -1 dBTP
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(crudo), "-af", "loudnorm=I=-14:TP=-1:LRA=9",
                    "-ar", str(SR), str(RAIZ / "public/mezcla.wav")], check=True)
    print("listo:", RAIZ / "public/mezcla.wav")


if __name__ == "__main__":
    main()
