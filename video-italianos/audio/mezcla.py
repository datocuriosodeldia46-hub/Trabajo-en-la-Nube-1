"""Mezcla final: voz editada + música sintetizada (con ducking) + efectos sincronizados a la línea de tiempo."""
import json
import numpy as np
import soundfile as sf
import synth as S

SR = S.SR
tl = json.load(open('../timeline.json'))
B = tl['blocks']
DUR = tl['duration']
N = int(DUR * SR)

voice, sr = sf.read('../voz/voz_editada.wav')
assert sr == SR
if voice.ndim > 1:
    voice = voice.mean(axis=1)
voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]

print('sintetizando música…')
music = S.music(DUR)
music = np.pad(music, (0, max(0, N - len(music))))[:N]
music /= np.max(np.abs(music)) + 1e-9

# ducking: la música baja cuando habla la voz
hop = 512
frames = len(voice) // hop + 1
venv = np.array([np.sqrt(np.mean(voice[i * hop:(i + 1) * hop] ** 2)) for i in range(frames)])
active = (venv > 0.02).astype(float)
sm = np.zeros_like(active)
a_att, a_rel = 0.5, 0.03  # ataque rápido, relajación lenta
for i in range(len(active)):
    prev = sm[i - 1] if i else 0
    k = a_att if active[i] > prev else a_rel
    sm[i] = prev + k * (active[i] - prev)
duck = np.interp(np.arange(N), np.arange(frames) * hop, 1 - 0.6 * sm)
music_gain = 1.0 * duck

fx = np.zeros(N)


def add(x, at, gain=1.0):
    S.place(fx, x, at, gain)


def vis0(k):
    return 0 if k == 0 else B[k]['start'] - 0.42


print('colocando efectos…')
# gancho
add(S.sfx_boing(0.45, up=True), 0.1, 0.5)
for i, at in enumerate([0.35, 0.75, 1.3]):
    add(S.sfx_pop(1 + i * .15), at, 0.45)
add(S.sfx_sparkle(), 1.15, 0.5)
add(S.sfx_pop(1.3), 4.4, 0.4)
add(S.sfx_twinkle(), 5.7, 0.35)

# transiciones y textos de cada nombre
for k in range(1, 12):
    add(S.sfx_whoosh(0.5, up=k % 2 == 0), vis0(k), 0.45)
for b in B:
    if b['kind'] != 'name':
        continue
    add(S.sfx_pop(1.0), vis0(B.index(b)) + 0.25, 0.3)          # insignia n/10
    for i in range(len(b['name'])):
        add(S.sfx_pop(1.1 + i * 0.07), b['t_name'] - 0.05 + i * 0.06, 0.16)
    add(S.sfx_pop(0.8), b['t_meaning'], 0.35)                   # "significa"
    add(S.sfx_whoosh(0.35, up=True) * 0.5, b.get('t_meaning_text', b['t_meaning'] + .35), 0.25)

byname = {b.get('name'): b for b in B}
# 1 Aurora: bostezo, despertador
a = byname['Aurora']
add(S.sfx_yawn(), vis0(1) + 0.1, 0.45)
add(S.sfx_alarm(1.2), a['segs'][3][0], 0.55)
add(S.sfx_giggle(560), a['t_meaning'] + 1.0, 0.25)
# 2 Chiara: interruptor + ding
c = byname['Chiara']
add(S.sfx_click_ding(), c['segs'][3][0], 0.65)
add(S.sfx_wow(), c['segs'][3][0] + 0.25, 0.3)
# 3 Violetta: flores que brotan, "tadá" de carácter
v = byname['Violetta']
for i in range(6):
    add(S.sfx_bloom(), vis0(3) + 0.2 + i * 0.18 + 0.5, 0.25)
add(S.sfx_boing(0.35, up=True), v['t_joke'] + 0.97, 0.35)
# 4 Allegra: espantasuegras + confeti + risita
al = byname['Allegra']
add(S.sfx_party_horn(), al['segs'][3][0], 0.6)
add(S.sfx_confetti(), al['segs'][3][0] + 0.05, 0.5)
add(S.sfx_giggle(600), al['segs'][3][0] + 1.0, 0.3)
# 5 Greta: burbujas, concha que se abre, brillo de perla
gr = byname['Greta']
add(S.sfx_bubbles(10, 3.0), vis0(5) + 0.2, 0.35)
add(S.sfx_squeak(), gr['t_meaning'], 0.3)
add(S.sfx_sparkle(), gr['t_meaning'] + 0.15, 0.4)
add(S.sfx_twinkle(), gr['segs'][4][0], 0.35)
# 6 Stella: destellos, estrella fugaz, "ting" presumido
st = byname['Stella']
add(S.sfx_twinkle(), st['t_name'], 0.35)
add(S.sfx_slide_whistle(0.7, up=False), st['t_joke'], 0.3)
add(S.sfx_sparkle(), st['t_joke'] + 0.6, 0.35)
add(S.sfx_click_ding(), st['segs'][3][0], 0.35)
# 7 Serena: campanitas zen y sobresalto
se = byname['Serena']
add(S.sfx_chime(), vis0(7) + 0.3, 0.4)
add(S.sfx_boing(0.5), se['segs'][3][0], 0.6)
add(S.sfx_slide_whistle(0.35, up=True), se['segs'][3][0], 0.35)
add(S.sfx_giggle(520), se['segs'][3][0] + 0.7, 0.3)
# 8 Bianca: nieve, lentes que caen + "ting"
bi = byname['Bianca']
add(S.sfx_chime(), vis0(8) + 0.3, 0.3)
add(S.sfx_slide_whistle(0.45, up=False), bi['segs'][6][0], 0.35)
add(S.sfx_click_ding(), bi['segs'][6][0] + 0.4, 0.45)
# 9 Beatrice: globos y corazones
be = byname['Beatrice']
add(S.sfx_squeak(), vis0(9) + 0.4, 0.3)
add(S.sfx_balloon_pop(), be['t_joke'] + 0.35, 0.5)
add(S.sfx_giggle(580), be['t_joke'] + 0.5, 0.35)
add(S.sfx_sparkle(), be['t_joke'] + 0.4, 0.3)
# 10 Vittoria: redoble suave, fanfarria, confeti, "uau"
vi = byname['Vittoria']
roll = np.zeros(int(1.1 * SR))
for i in range(28):
    S.place(roll, S.tambourine(0.05) * (0.3 + i / 40), i * 0.04)
add(roll, vi['t_name'] - 1.1, 0.4)
add(S.sfx_fanfare(), vi['t_name'], 0.6)
add(S.sfx_confetti(), vi['t_name'] + 0.05, 0.6)
add(S.sfx_wow(), vi['t_name'] + 0.5, 0.3)
# cierre
cta = B[11]
for i in range(10):
    add(S.sfx_pop(1 + i * 0.05), cta['segs'][1][0] + i * 0.09, 0.18)
add(S.sfx_boing(0.4, up=True), cta['segs'][2][0], 0.4)
add(S.sfx_boing(0.4, up=True), cta['segs'][3][0], 0.4)
add(S.sfx_sparkle(), cta['segs'][5][0] - 0.1, 0.4)
add(S.sfx_whoosh(0.7, up=False), DUR - 0.8, 0.4)

mix = voice * 1.0 + music * music_gain + fx * 0.9
# el volumen final (-14 LUFS, estándar de redes) se ajusta con loudnorm al unir con el video
stereo = np.stack([mix, mix], axis=1)
sf.write('mezcla_final.wav', stereo, SR, subtype='FLOAT')
sf.write('solo_musica.wav', music * 0.8, SR)
print('listo: mezcla_final.wav', round(len(mix) / SR, 2), 's')
