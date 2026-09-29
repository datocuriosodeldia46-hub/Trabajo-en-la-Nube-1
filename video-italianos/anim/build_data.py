"""Genera data.js (tiempos + envolvente de la voz) a partir de ../timeline.json."""
import json

t = json.load(open('../timeline.json'))
# qué fragmento de voz es el remate en los bloques cuyo significado ocupa más de un fragmento
over = {'Violetta': 3, 'Bianca': 4, 'Beatrice': 3}
for b in t['blocks']:
    if b.get('name') in over:
        b['t_joke'] = b['segs'][over[b['name']]][0]
    if b.get('name') == 'Bianca':
        b['t_meaning_text'] = b['segs'][2][0]
json.dump(t, open('../timeline.json', 'w'), indent=1, ensure_ascii=False)
env = json.load(open('../voz_envolvente.json'))
open('data.js', 'w').write('window.TL=' + json.dumps(t, ensure_ascii=False) + ';\nwindow.VENV=' + json.dumps(env) + ';\n')
