# "Te estás ahogando": short vertical 3D hecho con código

- **Video final:** `render/te_estas_ahogando.mp4` (1080×1920, 30 fps, 43.3 s, −14.3 LUFS, sin subtítulos).
- **Guion, beats y fuentes:** `guion.md`.
- **Voz:** ElevenLabs, Alejandro, toma 2 (`audio/narracion.mp3`); los tiempos por palabra están en `audio/palabras.json`.

## Cómo se arma
1. `index.html` se genera concatenando las partes; después de editar una parte, hay que regenerarlo:
   `cat _parts_head.js _parts_skin.js _parts_world.js _parts_story.js _parts_post.js > index.html`
   - `_parts_world.js`: personajes, comedor, cocina y anatomía en rayos X.
   - `_parts_story.js`: tiempos (`K`), animación, cámara dron (`SHOTS`) y carteles (HUD).
2. `python3 audio/sonido.py` → `audio/mix.wav` (efectos, música y voz, masterizado a −14 LUFS).
3. `SUB=2 JOBS=2 ./render_all.sh` → renderiza en bloques de 5 s (se puede retomar) y une todo con el audio.
   - Cuadros sueltos de prueba: `node render.mjs --stills 12.5,30`.
