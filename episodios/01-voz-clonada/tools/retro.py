"""Sonido de videojuego retro, todo con código (sin créditos de ElevenLabs).

- Voces "pixeladas": bitcrusher (baja la frecuencia de muestreo con sample-and-hold
  y la profundidad de bits) + toque robótico para los personajes IA.
- Chiptune estilo consola de 8 bits: 2 canales de pulso (onda cuadrada con ciclo
  de trabajo variable), 1 triangular de 4 bits (bajos) y 1 de ruido LFSR (percusión).
- Efectos 8-bit: vibración, colgar, tono de llamada, moneda, salto, "boing", whoosh.
"""
import numpy as np

SR = 44100

# Nivel de "pixelado" por personaje: (frecuencia de muestreo objetivo, bits, robot, cuadrada)
PRESETS = {
    "A": {  # suave: se nota el efecto pero todo es muy claro
        "mama": (12000, 8, 0.0, 0.0), "hijo": (10000, 8, 0.0, 0.0),
        "gpt": (11000, 7, 0.10, 0.05), "claude": (10000, 7, 0.10, 0.05),
    },
    "B": {  # medio: sabor videojuego claro; las IAs suenan más "máquina"
        "mama": (10000, 7, 0.0, 0.04), "hijo": (8500, 7, 0.0, 0.04),
        "gpt": (8800, 6, 0.18, 0.12), "claude": (8000, 6, 0.16, 0.12),
    },
    "C": {  # fuerte: casi consola portátil; menos inteligible
        "mama": (8000, 6, 0.0, 0.10), "hijo": (7000, 6, 0.0, 0.10),
        "gpt": (6500, 5, 0.28, 0.22), "claude": (6000, 5, 0.26, 0.22),
    },
}
ROBOT_HZ = {"gpt": 115, "claude": 72}  # modulación en anillo: GPT más brillante, Claude más grave


def pasabajos(x, corte):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / corte) ** 4)
    return np.fft.irfft(X, len(x))


def bitcrush(x, sr_obj, bits):
    n = len(x)
    factor = SR / sr_obj
    idx = np.minimum((np.floor(np.arange(n) / factor) * factor).astype(int), n - 1)
    y = x[idx]  # sample-and-hold: escalones = "píxeles" en el tiempo
    q = 2 ** (bits - 1)
    y = np.round(y * q) / q  # menos bits = "píxeles" en la amplitud
    return pasabajos(y, sr_obj * 0.62)  # recorta el aliasing más áspero sin perder el carácter


def voz_retro(x, quien, preset="B"):
    sr_obj, bits, robot, cuadrada = PRESETS[preset][quien]
    y = x.copy()
    if cuadrada:  # acerca la forma de onda a una cuadrada (timbre de chip)
        y = (1 - cuadrada) * y + cuadrada * np.sign(y) * np.abs(y) ** 0.35 * 0.6
    if robot:
        t = np.arange(len(y)) / SR
        y = (1 - robot) * y + robot * y * np.sin(2 * np.pi * ROBOT_HZ.get(quien, 90) * t) * 1.6
    y = bitcrush(y, sr_obj, bits)
    return y / (np.abs(y).max() + 1e-9) * 0.8


# ───────────── sintetizador 8-bit ─────────────
def nota(n):
    """'A4' → Hz (con sostenidos '#')."""
    nombres = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    base, octava = n[:-1], int(n[-1])
    return 440 * 2 ** ((nombres[base] + 12 * (octava + 1) - 69) / 12)


def pulso(f, dur, duty=0.5, vol=0.1, decae=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    fase = np.cumsum(np.asarray(f, float)[:n]) / SR if np.ndim(f) else t * f  # admite barridos de frecuencia
    y = np.where((fase % 1) < duty, 1.0, -1.0)
    env = np.exp(-t * decae) if decae else np.ones_like(t)
    k = min(int(0.004 * SR), len(y) // 2)
    if k:
        env[:k] *= np.linspace(0, 1, k); env[-k:] *= np.linspace(1, 0, k)
    return y * env * vol


def triangulo(f, dur, vol=0.12, decae=0.0):
    t = np.arange(int(dur * SR)) / SR
    y = 2 * np.abs(2 * ((t * f) % 1) - 1) - 1
    y = np.round(y * 7.5) / 7.5  # 4 bits, como el canal triangular de la consola
    env = np.exp(-t * decae) if decae else np.ones_like(t)
    k = min(int(0.004 * SR), len(y) // 2)
    if k:
        env[:k] *= np.linspace(0, 1, k); env[-k:] *= np.linspace(1, 0, k)
    return y * env * vol


def ruido(dur, tasa=8000, vol=0.08, decae=0.0, semilla=1):
    """Ruido de registro de desplazamiento (LFSR de 15 bits), el canal de percusión clásico."""
    n = int(dur * SR)
    pasos = int(np.ceil(n * tasa / SR)) + 1
    reg = semilla & 0x7FFF or 1
    bits = np.empty(pasos)
    for i in range(pasos):
        b = (reg ^ (reg >> 1)) & 1
        reg = (reg >> 1) | (b << 14)
        bits[i] = 1.0 if reg & 1 else -1.0
    y = bits[(np.arange(n) * tasa / SR).astype(int)]
    t = np.arange(n) / SR
    env = np.exp(-t * decae) if decae else np.ones_like(t)
    return y * env * vol


def secuencia(notas, bpm, sub=4, voz="pulso", **kw):
    """notas: lista de nombres ('A4', None=silencio), una por subdivisión (sub=4 → semicorcheas)."""
    paso = 60 / bpm / sub
    partes = []
    for n in notas:
        if n is None:
            partes.append(np.zeros(int(paso * SR)))
        elif voz == "pulso":
            partes.append(pulso(nota(n), paso, **kw))
        else:
            partes.append(triangulo(nota(n), paso, **kw))
    return np.concatenate(partes)


def repetir(clip, dur):
    n = int(dur * SR)
    if len(clip) == 0:
        return np.zeros(n)
    return np.tile(clip, n // len(clip) + 1)[:n]


def fundido(x, entrada=0.6, salida=0.6):
    n = len(x); y = x.copy()
    a, b = min(int(entrada * SR), n // 2), min(int(salida * SR), n // 2)
    if a: y[:a] *= np.linspace(0, 1, a)
    if b: y[-b:] *= np.linspace(1, 0, b)
    return y


# ───────────── música ─────────────
def musica_tension(dur):
    arpegio = secuencia(["A4", "C5", "E5", "C5"] * 4, 132, duty=0.125, vol=0.035, decae=6)
    bajo = secuencia(["A2", None, None, None, "A2", None, "E2", None] * 2, 132, voz="tri", vol=0.11, decae=3)
    return fundido(repetir(arpegio, dur) + repetir(bajo, dur), 0.8, 0.15)


def musica_suspenso(dur):
    latido = np.concatenate([triangulo(nota("D2"), 0.14, 0.16, 18), np.zeros(int(0.08 * SR)),
                             triangulo(nota("D2"), 0.14, 0.12, 18), np.zeros(int(0.49 * SR))])
    zumbido = secuencia(["D4", "D4", "F4", "F4", "E4", "E4", "C#4", "C#4"], 70, sub=1, duty=0.25, vol=0.018)
    return fundido(repetir(latido, dur) + repetir(zumbido, dur), 0.5, 0.3)


def musica_alivio(dur):
    arpegio = secuencia(["C5", "E5", "G5", "E5", "F5", "A5", "C6", "A5", "G5", "B5", "D6", "B5", "C5", "E5", "G5", "C6"], 120, duty=0.5, vol=0.028, decae=5)
    bajo = secuencia(["C3", None, "C3", None, "F2", None, "F2", None, "G2", None, "G2", None, "C3", None, "G2", None], 120, voz="tri", vol=0.12, decae=2.5)
    hat = np.concatenate([np.concatenate([ruido(0.03, 11000, 0.02, 60, i + 3), np.zeros(int((0.25 - 0.03) * SR))]) for i in range(16)])
    return fundido(repetir(arpegio, dur) + repetir(bajo, dur) + repetir(hat, dur), 1.0, 0.25)


# ───────────── efectos ─────────────
def vibracion(dur=0.9, vol=0.3):
    t = np.arange(int(dur * SR)) / SR
    y = pulso(62, dur, 0.5, 1.0) * 0.6 + ruido(dur, 900, 0.4) * 0.4
    return y * ((t % 0.45) < 0.3) * vol


def colgar():
    return np.concatenate([pulso(nota(n), 0.08, 0.5, 0.12) for n in ("E5", "C5", "A4")])


def tono_llamada(dur=0.85):
    return (pulso(440, dur, 0.5, 0.07) + pulso(480, dur, 0.5, 0.07))


def moneda():
    return np.concatenate([pulso(nota("B5"), 0.07, 0.5, 0.09), pulso(nota("E6"), 0.35, 0.5, 0.09, decae=7)])


def salto():
    d = 0.22
    f = np.linspace(260, 900, int(d * SR))
    return pulso(f, d, 0.25, 0.08, decae=4)


def boing():
    d = 0.3
    f = 420 + 380 * np.sin(np.linspace(0, np.pi * 3, int(d * SR))) * np.linspace(1, 0.2, int(d * SR))
    return pulso(f, d, 0.5, 0.07, decae=5)


def whoosh(dur=1.2, vol=0.12):
    n = int(dur * SR)
    partes = []
    pasos = 12
    for i in range(pasos):
        tasa = 1500 + 14000 * np.sin(np.pi * (i + 0.5) / pasos)
        partes.append(ruido(dur / pasos, tasa, 1.0, 0, i + 7))
    y = np.concatenate(partes)[:n]
    return y * np.sin(np.linspace(0, np.pi, len(y))) ** 2 * vol


def blip_inserto():
    return np.concatenate([pulso(nota(n), 0.05, 0.25, 0.07) for n in ("C5", "G5", "C6")])


def remate():
    """Dos notas descendentes tipo 'oh no' cuando el teléfono vuelve a vibrar (loop)."""
    return np.concatenate([pulso(nota("E4"), 0.22, 0.5, 0.07, 3), pulso(nota("D#4"), 0.45, 0.5, 0.07, 3)])
