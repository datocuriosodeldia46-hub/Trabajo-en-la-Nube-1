# Ep01 · Mamá, estoy en problemas

Episodio animado en Three.js, renderizado cuadro por cuadro. Todo se reproduce desde este directorio.

| Archivo | Qué es |
|---|---|
| `guion.md` | Guion, mapa narrativo, personajes y cámara |
| `lineas.json` | Diálogo: texto para la voz (con etiquetas de emoción de ElevenLabs v3) y subtítulo |
| `audio/LXX.mp3` | Voces generadas con ElevenLabs (eleven_v3) |
| `assets/mama_cara.png` | Cara fotorrealista de la mamá (generada con IA, persona ficticia), recortada con máscara suave |
| `tools/timeline.py` | Recorta silencios, comprime pausas, aplica filtro de teléfono, sintetiza efectos y música → `timeline.json` y `audio/mezcla.wav` |
| `escena/` | Escena Three.js (`main.js`): set, personajes, planos de cámara, insertos y subtítulos |
| `render.mjs` | Chromium sin interfaz + ffmpeg → `render/ep01.mp4` |

## Reproducir

```bash
npm install                      # three, playwright, fuente Pixelify Sans
python3 tools/timeline.py        # requiere numpy e imageio-ffmpeg
node render.mjs --w 540 --h 960 --stills 0.3,16.5,47  # fotogramas de revisión
node render.mjs                  # video final 1080×1920 a 30 fps
```

Para cambiar el ritmo, edita `PAUSAS` en `tools/timeline.py`. Para cambiar la cámara, edita `construirPlanos()` en `escena/main.js`: cada plano tiene su posición inicial y final, el punto al que mira, el FOV y la duración del movimiento.
