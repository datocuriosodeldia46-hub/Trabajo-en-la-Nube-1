"""Línea de tiempo y mezcla del Ep02 (Lucía y Jesús) a partir de las voces de ElevenLabs.

Solo las voces vienen de ElevenLabs; todo lo demás se sintetiza aquí:
- recorte de silencios, pausas emocionales entre líneas y una reverb corta de campo abierto;
- piano suave + pad (estilo Sad Monarch): entra en el "Hija mía… mírame" y se abre en "Yo me quedo";
- viento de colina y pajaritos lejanos;
- envolvente de volumen por cuadro para mover bocas.

Salida: timeline.json y audio/mezcla.wav
"""
import json
import subprocess
from pathlib import Path

import imageio_ffmpeg
import numpy as np

SR = 44100
FPS = 30
BASE = Path(__file__).resolve().parent.parent
FF = imageio_ffmpeg.get_ffmpeg_exe()
RNG = np.random.default_rng(11)

# Pausa (s) ANTES de cada línea: el silencio también cuenta la historia.
PAUSAS = {
    "L01": 1.2,              # viento, plano de espaldas
    "L02": 0.45, "L03": 0.7, "L04": 0.55,
    "L05": 0.6, "L06": 0.35, "L07": 0.35,   # regla de tres que escala
    "L08": 1.1,              # silencio antes del quiebre
    "L09": 0.55, "L10": 0.45, "L11": 0.7, "L12": 0.6,
    "L13": 0.55, "L14": 0.6,
    "L15": 0.9,              # mira a cámara
    "L16": 0.9,              # vuelta al plano de espaldas
}
COLA = 2.2


def decodificar(ruta):
    raw = subprocess.run([FF, "-v", "error", "-i", str(ruta), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def suavizada(x, s=0.02):
    w = int(s * SR)
    return np.convolve(np.abs(x), np.ones(w) / w, mode="same")


def recortar(x, umbral_db=-42, margen=0.08):
    voz = np.where(suavizada(x) > 10 ** (umbral_db / 20))[0]
    if len(voz) == 0:
        return x
    return x[max(voz[0] - int(margen * SR), 0):min(voz[-1] + int(margen * SR), len(x))]


def comprimir_pausas(x, maximo=0.55, umbral_db=-38):
    """Acorta silencios internos muy largos, pero deja respirar los "…" (drama)."""
    sil = suavizada(x) < 10 ** (umbral_db / 20)
    partes, i, n, tope = [], 0, len(x), int(maximo * SR)
    while i < n:
        j = i
        while j < n and sil[j] == sil[i]:
            j += 1
        if sil[i] and j - i > tope:
            partes += [x[i:i + tope // 2], x[j - tope // 2:j]]
        else:
            partes.append(x[i:j])
        i = j
    return np.concatenate(partes)


def fade(x, s=0.01):
    k = min(int(s * SR), len(x) // 2)
    if k:
        x[:k] *= np.linspace(0, 1, k)
        x[-k:] *= np.linspace(1, 0, k)
    return x


def filtro(x, bajo=None, alto=None):
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    r = np.ones_like(f)
    if bajo:
        r *= 1 / np.sqrt(1 + (bajo / np.maximum(f, 1)) ** 4)
    if alto:
        r *= 1 / np.sqrt(1 + (f / alto) ** 4)
    return np.fft.irfft(X * r, n)


def reverb(x, dur=1.1, mezcla=0.12):
    """Respuesta al impulso sintética (ruido con caída exponencial y opaca): aire de atardecer."""
    n = int(dur * SR)
    ir = RNG.standard_normal(n) * np.exp(-np.arange(n) / SR * 5.5)
    ir = filtro(ir, bajo=200, alto=4500)
    ir /= np.sqrt(np.sum(ir ** 2))
    L = len(x) + n
    m = 1 << int(np.ceil(np.log2(L)))
    h = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:L]
    y = np.zeros(L)
    y[:len(x)] = x
    return y + h * mezcla


def nota_piano(f, dur, vol):
    """Piano suave aditivo: armónicos inarmónicos leves, ataque de martillo acolchado y caída doble."""
    t = np.arange(int(dur * SR)) / SR
    y = np.zeros_like(t)
    for k, a in enumerate([1, 0.42, 0.2, 0.1, 0.05, 0.03], start=1):
        fk = f * k * np.sqrt(1 + 0.00035 * k * k)
        y += a * np.sin(2 * np.pi * fk * t) * np.exp(-t * (0.9 + 0.55 * k))
    y *= 0.75 * np.exp(-t * 1.6) + 0.25 * np.exp(-t * 0.35)
    y *= np.minimum(1, t / 0.006)
    return fade(y * vol, 0.05)


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


# Progresión (grados en La menor → Do mayor): Am – F – C – G, arpegiada lento como en Sad Monarch
ACORDES = [
    [45, 57, 60, 64, 69],   # Am
    [41, 53, 57, 60, 65],   # F
    [48, 55, 60, 64, 67],   # C
    [43, 55, 59, 62, 67],   # G
]
MELODIA = [76, None, 72, None, 74, None, 71, None]  # notas altas espaciadas (esperanza)


def piano(dur, compas=2.6, vol=0.11, brillo=0.0):
    y = np.zeros(int((dur + 4) * SR))
    t, k = 0.0, 0
    while t < dur:
        acorde = ACORDES[k % 4]
        pegar(y, nota_piano(midi(acorde[0]), 4.0, vol * 0.9), t)
        for j, nn in enumerate(acorde[1:]):
            pegar(y, nota_piano(midi(nn), 3.2, vol * 0.55), t + 0.32 * (j + 1))
        if brillo > 0:
            m = MELODIA[(2 * k) % len(MELODIA)]
            if m:
                pegar(y, nota_piano(midi(m), 3.0, vol * 0.6 * brillo), t + compas * 0.5)
        t += compas
        k += 1
    return y[:int(dur * SR)]


def pad(dur, vol=0.035, ataque=3.0):
    t = np.arange(int(dur * SR)) / SR
    y = np.zeros_like(t)
    seg = 2.6 * 4
    for i, ac in enumerate(ACORDES):
        # cada acorde suena en su compás con fundido cruzado
        c = ((t / 2.6).astype(int) % 4 == i).astype(float)
        c = np.convolve(c, np.ones(int(0.6 * SR)) / int(0.6 * SR), mode="same")
        for nn in ac[1:4]:
            f = midi(nn)
            y += c * (np.sin(2 * np.pi * f * t + 0.4 * np.sin(2 * np.pi * 0.17 * t)) + 0.3 * np.sin(2 * np.pi * 2.002 * f * t))
    env = np.minimum(1, t / ataque) * np.clip((dur - t) / 2.0, 0, 1)
    return y / 4 * env * vol


def viento(dur, vol=0.05):
    n = int(dur * SR)
    y = filtro(RNG.standard_normal(n), bajo=150, alto=900)
    t = np.arange(n) / SR
    y *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t + 1) * np.sin(2 * np.pi * 0.07 * t)
    return y / (np.abs(y).max() + 1e-9) * vol


def pajaro(vol=0.025):
    """Trino lejano: barridos senoidales rápidos."""
    partes = []
    for _ in range(RNG.integers(2, 5)):
        d = RNG.uniform(0.05, 0.1)
        t = np.arange(int(d * SR)) / SR
        f0 = RNG.uniform(3200, 4200)
        f = f0 + 900 * np.sin(np.pi * t / d)
        fase = 2 * np.pi * np.cumsum(f) / SR
        partes += [np.sin(fase) * np.sin(np.pi * t / d), np.zeros(int(RNG.uniform(0.03, 0.08) * SR))]
    return np.concatenate(partes) * vol


def pegar(pista, clip, t):
    i = int(t * SR)
    if i >= len(pista):
        return
    j = min(i + len(clip), len(pista))
    pista[i:j] += clip[:j - i]


def envolvente(x):
    paso = SR // FPS
    n = int(np.ceil(len(x) / paso))
    rms = np.array([np.sqrt(np.mean(x[k * paso:(k + 1) * paso] ** 2) + 1e-12) for k in range(n)])
    rms = rms / (np.percentile(rms, 95) + 1e-9)
    return [round(float(v), 3) for v in np.clip(rms, 0, 1.2)]


def main():
    lineas = json.load(open(BASE / "lineas.json"))
    t, clips = 0.0, []
    for l in lineas:
        x = comprimir_pausas(recortar(decodificar(BASE / "audio" / f"{l['id']}.mp3")))
        x = fade(x / (np.abs(x).max() + 1e-9) * (0.78 if l["who"] == "jesus" else 0.72), 0.01)
        t += PAUSAS[l["id"]]
        clips.append((l, x, t))
        t += len(x) / SR
    dur = t + COLA
    N = int(dur * SR) + 2 * SR
    voz, musica, amb = np.zeros(N), np.zeros(N), np.zeros(N)

    salida, marcas = [], {}
    for l, x, t0 in clips:
        pegar(voz, x, t0)
        marcas[l["id"]] = t0
        salida.append({**{k: l[k] for k in ("id", "who", "sub")},
                       "start": round(t0, 3), "end": round(t0 + len(x) / SR, 3), "env": envolvente(x)})
    fin = {s["id"]: s["end"] for s in salida}
    voz = reverb(voz)[:N]

    # Ambiente: viento todo el tiempo + pajaritos ocasionales
    pegar(amb, viento(dur + 1), 0)
    for tp in np.arange(0.6, dur, 5.3) + RNG.uniform(-0.8, 0.8, len(np.arange(0.6, dur, 5.3))):
        pegar(amb, pajaro(), max(tp, 0))

    # Música: nota sola de piano bajo el llanto → entra el piano en "Hija mía" → se abre en "Yo me quedo"
    pegar(musica, nota_piano(midi(57), 5, 0.05), marcas["L03"])
    pegar(musica, nota_piano(midi(53), 5, 0.05), marcas["L05"])
    pegar(musica, nota_piano(midi(52), 5, 0.05), marcas["L07"])
    t_piano = marcas["L08"] - 0.4
    pegar(musica, piano(marcas["L15"] - t_piano, vol=0.1), t_piano)
    pegar(musica, pad(dur - t_piano + 1), t_piano)
    pegar(musica, piano(dur - marcas["L15"] + 1, vol=0.12, brillo=1.0), marcas["L15"] - 0.2)

    # Duck de la música bajo la voz
    env_voz = np.convolve(np.abs(voz), np.ones(int(0.15 * SR)) / int(0.15 * SR), mode="same")
    duck = 1 - 0.35 * np.clip(env_voz / 0.08, 0, 1)
    mezcla = voz + musica * duck + amb * (0.7 + 0.3 * duck)
    mezcla = mezcla[:int(dur * SR)]
    k = int(1.2 * SR)
    mezcla[-k:] *= np.linspace(1, 0, k) ** 0.7
    mezcla /= max(np.abs(mezcla).max() / 0.95, 1)
    pcm = (mezcla * 32767).astype("<i2").tobytes()
    subprocess.run([FF, "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    str(BASE / "audio" / "mezcla.wav")], input=pcm, check=True)
    marcas["piano"] = t_piano
    json.dump({"fps": FPS, "duracion": round(dur, 3), "lineas": salida,
               "marcas": {k: round(v, 3) for k, v in marcas.items()}},
              open(BASE / "timeline.json", "w"), ensure_ascii=False)
    print(f"duración {dur:.1f} s")
    for s in salida:
        print(f"{s['id']} {s['who']:6s} {s['start']:6.2f}–{s['end']:6.2f}  {s['sub']}")


if __name__ == "__main__":
    main()
