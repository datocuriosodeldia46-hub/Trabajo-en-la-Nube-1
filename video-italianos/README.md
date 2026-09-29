# Video: Nombres italianos para niña (1:10, 1080×1920)

Todo el video se genera con código, excepto la voz (ElevenLabs, voz "Daniela", modelo eleven_v3).

| Carpeta / archivo | Qué hace |
|---|---|
| `guion.md` | Guion final, significados y qué pasa en cada escena |
| `temas_y_hooks.md` | Ideas de temas con títulos y ganchos para próximos videos |
| `voz/voz_completa_original.mp3` | Voz tal como salió de ElevenLabs (103 s) |
| `voz/editar_voz.py` | Recorta silencios, ajusta a 1:10 y calcula los tiempos de cada nombre |
| `voz/pruebas/` | Las 3 pruebas cortas de voz (Carito, Cami, Daniela) |
| `timeline.json` | Tiempos de cada bloque (gancho, 10 nombres, cierre) usados por la animación y el audio |
| `audio/synth.py` | Música (tarantela ligera: mandolina, acordeón, bajo, pandereta) y efectos, sintetizados |
| `audio/mezcla.py` | Mezcla voz + música (baja sola cuando habla la voz) + efectos sincronizados |
| `anim/engine.js` | Motor de dibujo: personajes, manos con dedos, peinados, accesorios, textos, transiciones |
| `anim/scenes.js` | Las 12 escenas del video |
| `anim/render.js` | Exporta la animación a MP4 con Chromium (Playwright) |

## Regenerar

```bash
cd voz && python3 editar_voz.py            # solo si cambias la voz
cd ../anim && npm install && python3 build_data.py
NODE_PATH=$(npm root -g) node render.js    # -> anim/video_sin_audio.mp4
cd ../audio && python3 mezcla.py           # -> audio/mezcla_final.wav
ffmpeg -i ../anim/video_sin_audio.mp4 -i mezcla_final.wav -c:v copy \
  -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k -shortest ../nombres_italianos_nina.mp4
```
