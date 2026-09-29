"""Arma la línea de tiempo y la mezcla de audio del episodio a partir de las voces.

- Recorta silencios de cada línea (audio/LXX.mp3).
- Coloca cada línea con la pausa definida en PAUSAS (ritmo narrativo).
- Aplica filtro telefónico a las líneas que suenan por el altavoz del celular.
- Sintetiza efectos (vibración, colgar, tono de llamada, whoosh) y un pad musical.
- Calcula la envolvente de volumen por cuadro (boca y rebote de personajes).

Salida: timeline.json y audio/mezcla.wav
Uso: python3 tools/timeline.py
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

# Pausa (s) ANTES de cada línea. Las pausas largas son beats narrativos.
PAUSAS = {
    "L01": 0.55, "L02": 0.15, "L03": 0.2, "L04": 0.35, "L05": 0.3,
    "L06": 0.75,  # beat antes del quiebre
    "L07": 0.25, "L08": 0.25, "L09": 0.35, "L10": 0.3, "L11": 0.4,
    "L12": 0.5, "L13": 0.6, "L14": 0.4,
    "L15": 3.2,   # cuelga, marca, suenan dos tonos
    "L16": 0.5, "L17": 0.7, "L18": 0.3, "L19": 0.35, "L20": 0.35,
    "L21": 0.7,
    "L22": 1.1,   # silencio antes del remate
    "L23": 0.35,
}
COLA = 1.8  # vibración final → loop al inicio
TELEFONO = {"L01", "L03", "L11", "L15"}  # suenan por el altavoz del celular


def decodificar(ruta):
    raw = subprocess.run([FF, "-v", "error", "-i", str(ruta), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def recortar(x, umbral_db=-42, margen=0.06):
    env = np.abs(x)
    ventana = int(0.02 * SR)
    env = np.convolve(env, np.ones(ventana) / ventana, mode="same")
    voz = np.where(env > 10 ** (umbral_db / 20))[0]
    if len(voz) == 0:
        return x
    a = max(voz[0] - int(margen * SR), 0)
    b = min(voz[-1] + int(margen * SR), len(x))
    return x[a:b]


def comprimir_pausas(x, maximo=0.38, umbral_db=-38):
    """Acorta los silencios internos largos (las pausas de v3 en los "…") para mantener el ritmo."""
    w = int(0.02 * SR)
    env = np.convolve(np.abs(x), np.ones(w) / w, mode="same")
    sil = env < 10 ** (umbral_db / 20)
    partes, i, n = [], 0, len(x)
    while i < n:
        if sil[i]:
            j = i
            while j < n and sil[j]:
                j += 1
            largo = j - i
            tope = int(maximo * SR)
            if largo > tope:
                partes.append(x[i:i + tope // 2])
                partes.append(x[j - tope // 2:j])
            else:
                partes.append(x[i:j])
            i = j
        else:
            j = i
            while j < n and not sil[j]:
                j += 1
            partes.append(x[i:j])
            i = j
    return np.concatenate(partes) if partes else x


def filtro_telefono(x):
    """Pasa-banda 300–3400 Hz en frecuencia + leve saturación: voz de altavoz de celular."""
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    resp = np.clip((f - 250) / 150, 0, 1) * np.clip((3600 - f) / 400, 0, 1)
    y = np.fft.irfft(X * resp, n)
    y = np.tanh(y * 2.2) / 2.2
    return y * 1.25


def fade(x, s=0.01):
    k = min(int(s * SR), len(x) // 2)
    if k:
        x[:k] *= np.linspace(0, 1, k)
        x[-k:] *= np.linspace(1, 0, k)
    return x


def tono(freqs, dur, vol=0.2):
    t = np.arange(int(dur * SR)) / SR
    y = sum(np.sin(2 * np.pi * f * t) for f in freqs) / len(freqs)
    return fade(y * vol, 0.01)


def vibracion(dur=0.9, vol=0.35):
    """Dos pulsos de motor de vibración (zumbido grave con armónicos)."""
    t = np.arange(int(dur * SR)) / SR
    zumbido = np.sign(np.sin(2 * np.pi * 165 * t)) * 0.5 + np.sin(2 * np.pi * 330 * t) * 0.3
    pulsos = ((t % 0.45) < 0.3).astype(np.float32)
    return fade(zumbido * pulsos * vol, 0.005)


def whoosh(dur=1.4, vol=0.22):
    n = int(dur * SR)
    ruido = np.random.default_rng(7).standard_normal(n)
    X = np.fft.rfft(ruido)
    f = np.fft.rfftfreq(n, 1 / SR)
    X *= np.exp(-((f - 900) / 700) ** 2)
    y = np.fft.irfft(X, n)
    y /= np.abs(y).max() + 1e-9
    env = np.sin(np.linspace(0, np.pi, n)) ** 2
    return y * env * vol


def pad(dur, acorde, vol=0.06, ataque=1.5):
    t = np.arange(int(dur * SR)) / SR
    y = np.zeros_like(t)
    for f in acorde:
        y += np.sin(2 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * 0.2 * t))
        y += 0.35 * np.sin(2 * np.pi * f * 2.003 * t)
    y /= len(acorde) * 1.35
    env = np.minimum(1, t / ataque) * np.minimum(1, (dur - t) / 1.0)
    return y * np.clip(env, 0, 1) * vol


def latido(dur, periodo=0.85, vol=0.22):
    t = np.arange(int(dur * SR)) / SR
    fase = t % periodo
    golpe = np.exp(-fase * 18) * np.sin(2 * np.pi * 55 * fase) + 0.6 * np.exp(-np.maximum(fase - 0.18, 0) * 18) * (fase > 0.18) * np.sin(2 * np.pi * 50 * (fase - 0.18))
    return golpe * vol


def pegar(pista, clip, t):
    i = int(t * SR)
    j = min(i + len(clip), len(pista))
    pista[i:j] += clip[: j - i]


def envolvente(x):
    paso = SR // FPS
    n = int(np.ceil(len(x) / paso))
    rms = np.array([np.sqrt(np.mean(x[k * paso:(k + 1) * paso] ** 2) + 1e-12) for k in range(n)])
    rms = rms / (np.percentile(rms, 95) + 1e-9)
    return [round(float(v), 3) for v in np.clip(rms, 0, 1.2)]


def main():
    lineas = json.load(open(BASE / "lineas.json"))
    t = 0.0
    clips = []
    for l in lineas:
        x = comprimir_pausas(recortar(decodificar(BASE / "audio" / f"{l['id']}.mp3")))
        if l["id"] in TELEFONO:
            x = filtro_telefono(x)
        x = fade(x / (np.abs(x).max() + 1e-9) * 0.8, 0.008)
        t += PAUSAS[l["id"]]
        clips.append((l, x, t))
        t += len(x) / SR
    dur = t + COLA
    voz = np.zeros(int(dur * SR) + SR, np.float32)
    efectos = np.zeros_like(voz)
    musica = np.zeros_like(voz)

    salida = []
    marcas = {}
    for l, x, t0 in clips:
        pegar(voz, x, t0)
        marcas[l["id"]] = t0
        salida.append({**{k: l[k] for k in ("id", "who", "sub")},
                       "start": round(t0, 3), "end": round(t0 + len(x) / SR, 3), "env": envolvente(x)})

    fin = {s["id"]: s["end"] for s in salida}
    # Efectos
    pegar(efectos, vibracion(), 0.0)
    pegar(efectos, whoosh(1.5), marcas["L06"] + 0.05)          # órbita del quiebre
    pegar(efectos, whoosh(0.9, 0.15), marcas["L08"] + 1.9)     # entra el inserto
    pegar(efectos, whoosh(0.9, 0.15), marcas["L17"] - 0.35)    # entran las reglas
    colgar = fin["L14"] + 0.45
    for k, f in enumerate((620, 480, 360)):
        pegar(efectos, tono([f], 0.09, 0.18), colgar + k * 0.1)
    for k in range(2):
        pegar(efectos, tono([440, 480], 0.85, 0.12), colgar + 0.75 + k * 1.1)
    pegar(efectos, vibracion(), dur - COLA + 0.35)
    marcas["colgar"] = round(colgar, 3)
    marcas["marcar"] = round(colgar + 0.6, 3)
    marcas["loop"] = round(dur - COLA + 0.35, 3)

    # Música: tensión (menor) → silencio en el quiebre → latido → alivio (mayor) → silencio del remate
    pegar(musica, pad(marcas["L06"] + 0.2, [110, 130.8, 164.8], 0.05), 0.0)
    pegar(musica, latido(marcas["L15"] - marcas["L08"]), marcas["L08"])
    pegar(musica, pad(marcas["L15"] - marcas["L08"], [98, 116.5, 146.8], 0.035, 2.5), marcas["L08"])
    pegar(musica, pad(marcas["L22"] - marcas["L15"] - 0.3, [130.8, 164.8, 196, 261.6], 0.06, 2.0), marcas["L15"] + 0.4)
    pegar(musica, pad(COLA + 1.2, [130.8, 164.8, 196], 0.04, 0.8), fin["L23"] + 0.1)

    mezcla = voz + efectos + musica
    mezcla = mezcla[: int(dur * SR)]
    mezcla /= max(np.abs(mezcla).max() / 0.95, 1)
    pcm = (mezcla * 32767).astype("<i2").tobytes()
    subprocess.run([FF, "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    str(BASE / "audio" / "mezcla.wav")], input=pcm, check=True)

    json.dump({"fps": FPS, "duracion": round(dur, 3), "lineas": salida,
               "marcas": {k: round(v, 3) for k, v in marcas.items()}},
              open(BASE / "timeline.json", "w"), ensure_ascii=False)
    print(f"duración {dur:.1f} s")
    for s in salida:
        print(f"{s['id']} {s['who']:6s} {s['start']:6.2f}–{s['end']:6.2f}  {s['sub']}")


if __name__ == "__main__":
    main()
