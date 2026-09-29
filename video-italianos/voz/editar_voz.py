"""Edita la voz: acorta silencios, ajusta la duración a ~1:10 y genera la línea de tiempo.

Salidas:
  voz_editada.wav         voz lista para mezclar
  ../timeline.json        tiempos (en el video final) de cada bloque, nombre, significado y remate
  ../voz_envolvente.json  volumen de la voz por fotograma (30 fps) para mover la boca de la narradora
"""
import json
import subprocess
import numpy as np
import librosa
import soundfile as sf

FF = '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2'
SR = 44100
TARGET = 68.6          # duración de la voz; el video dura 70 s (queda cola para el remate musical)
LEAD_IN = 0.35         # la voz empieza un poco después del primer fotograma

y, _ = librosa.load('voz_completa_original.mp3', sr=SR)
hop = 441
db = 20 * np.log10(librosa.feature.rms(y=y, frame_length=1764, hop_length=hop)[0] + 1e-9)
sil = db < -38

runs, i = [], 0
while i < len(sil):
    if sil[i]:
        j = i
        while j < len(sil) and sil[j]:
            j += 1
        a, b = i * hop / SR, j * hop / SR
        if b - a >= 0.12 and a > 0.05:
            runs.append([a, b])
        i = j
    else:
        i += 1

# Pausas largas (>1.3 s) = cambio de bloque (gancho, 10 nombres, cierre)
paragraph_gaps = [r for r in runs if r[1] - r[0] > 1.3]
assert len(paragraph_gaps) == 11, f'se esperaban 11 cortes de bloque, hay {len(paragraph_gaps)}'


def new_len(a, b, is_para, after_name):
    d = b - a
    if is_para:
        return 0.42
    if after_name:
        return min(d, 0.2)
    return min(d, 0.14)


# Bloques en tiempo original
bounds = [0.0] + [g[0] for g in paragraph_gaps] + [len(y) / SR]
starts = [0.0] + [g[1] for g in paragraph_gaps]
blocks = []
for k in range(12):
    s, e = starts[k], bounds[k + 1]
    inner = [r for r in runs if r[0] > s and r[1] < e]
    segs, cur = [], s
    for r in inner:
        segs.append([cur, r[0]])
        cur = r[1]
    segs.append([cur, e])
    blocks.append({'start': s, 'end': e, 'segs': segs, 'gaps': inner})

# Construir el audio editado con fundidos cortos en cada corte
pieces, mapping = [], []   # mapping: (orig_a, orig_b, new_a) para tramos conservados
t_new = 0.0
cursor = 0.0
fade = int(0.008 * SR)
first_name_gap = set()
for k, bl in enumerate(blocks):
    if 1 <= k <= 10 and bl['gaps']:
        # el primer hueco dentro de un bloque de nombre va justo después del nombre
        idx = 1 if k == 10 else 0     # en Vittoria el nombre va después de "Y mi favorito…"
        if idx < len(bl['gaps']):
            first_name_gap.add(tuple(bl['gaps'][idx]))


def keep(a, b):
    global t_new
    seg = y[int(a * SR):int(b * SR)].copy()
    if len(seg) > 2 * fade:
        seg[:fade] *= np.linspace(0, 1, fade)
        seg[-fade:] *= np.linspace(1, 0, fade)
    mapping.append((a, b, t_new))
    pieces.append(seg)
    t_new += len(seg) / SR


for r in runs:
    is_para = r in paragraph_gaps
    keep(cursor, r[0])
    gap_len = new_len(r[0], r[1], is_para, tuple(r) in first_name_gap)
    # conservar el centro del silencio original (ruido de sala natural) con la nueva duración
    mid = (r[0] + r[1]) / 2
    keep(mid - gap_len / 2, mid + gap_len / 2)
    cursor = r[1]
keep(cursor, len(y) / SR)
edited = np.concatenate(pieces)
edited_dur = len(edited) / SR

# Ajuste fino de velocidad sin cambiar el tono
tempo = edited_dur / TARGET
sf.write('_tmp_edit.wav', edited, SR)
subprocess.run([FF, '-y', '-loglevel', 'error', '-i', '_tmp_edit.wav', '-af', f'atempo={tempo:.4f}', '-ar', str(SR), '_tmp_tempo.wav'], check=True)
voice, _ = sf.read('_tmp_tempo.wav')
out = np.concatenate([np.zeros(int(LEAD_IN * SR)), voice])
peak = np.max(np.abs(out))
out = out / peak * 0.89
sf.write('voz_editada.wav', out, SR)


def to_new(t):
    """Tiempo original -> tiempo en el video final."""
    for a, b, na in mapping:
        if a - 1e-6 <= t <= b + 1e-6:
            return LEAD_IN + (na + (t - a)) / tempo
    best = min(mapping, key=lambda m: min(abs(t - m[0]), abs(t - m[1])))
    a, b, na = best
    tt = a if abs(t - a) < abs(t - b) else b
    return LEAD_IN + (na + (tt - a)) / tempo


names = ['Aurora', 'Chiara', 'Violetta', 'Allegra', 'Greta', 'Stella', 'Serena', 'Bianca', 'Beatrice', 'Vittoria']
meanings = ['amanecer', 'luminosa', 'violeta, como la flor', 'alegre', 'perla', 'estrella', 'tranquila',
            'blanca, pura', 'la que trae felicidad', 'victoria']
tl = {'duration': 70.0, 'voice_end': round(LEAD_IN + len(voice) / SR, 3), 'blocks': []}
for k, bl in enumerate(blocks):
    segs = [[round(to_new(a), 3), round(to_new(b), 3)] for a, b in bl['segs']]
    entry = {'kind': 'hook' if k == 0 else 'cta' if k == 11 else 'name', 'start': segs[0][0], 'end': segs[-1][1], 'segs': segs}
    if entry['kind'] == 'name':
        i = k - 1
        ni = 1 if k == 10 else 0
        entry.update({'name': names[i], 'meaning': meanings[i], 'index': i + 1,
                      't_name': segs[ni][0], 't_meaning': segs[ni + 1][0], 't_joke': segs[min(ni + 2, len(segs) - 1)][0]})
    tl['blocks'].append(entry)
json.dump(tl, open('../timeline.json', 'w'), indent=1, ensure_ascii=False)

# Envolvente por fotograma para la boca de la narradora
fps = 30
n_frames = int(70 * fps)
env = []
for f in range(n_frames):
    a = int(f / fps * SR)
    seg = out[a:a + SR // fps]
    env.append(round(float(np.sqrt(np.mean(seg ** 2))) if len(seg) else 0.0, 4))
mx = max(env)
json.dump([round(v / mx, 3) for v in env], open('../voz_envolvente.json', 'w'))

print(f'original {len(y)/SR:.1f}s -> sin silencios {edited_dur:.1f}s -> tempo x{tempo:.3f} -> voz {len(voice)/SR:.1f}s')
for b in tl['blocks']:
    print(b['kind'], b.get('name', ''), b['start'], b['end'], b.get('t_name', ''), b.get('t_meaning', ''), b.get('t_joke', ''), len(b['segs']))
