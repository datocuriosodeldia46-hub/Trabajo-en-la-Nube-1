# Lucas: el airbag que se infla antes del golpe

A 35 s vertical short (1080×1920, 30 fps), all made with code, with no video generators.

Lucas, a delivery rider, is doing 80 km/h down Paseo de la Reforma when a moving truck cuts across his lane. The X-ray view explains his airbag vest:
- sensors that read his body a thousand times a second;
- a gas charge that fills the vest with nitrogen faster than a blink;
- an armour of air around his neck, chest and back.

He is thrown over the truck in front of the Ángel de la Independencia, lands on his back on the inflated vest and rolls. His helmet calls emergency services. Then he gets up, checks the pizza and delivers it on time.

## Files
- `index.html`: the whole film in one page (three.js 0.160.0). Every frame is a pure function of time, `renderAt(t)`.
  - **City.** Reforma at night: towers with lit offices, shops at street level, CDMX taxis, bus stops, haze, the Ángel and two skyline towers.
  - **Lucas.** Torso, arms, legs and vest are tubes rebuilt every frame along a filleted path through the joints. Two-bone IK puts his hands on the grips and his feet on the pegs, so elbows and knees bend smoothly.
  - **Outfit.** Full-face helmet with a see-through visor, balaclava, eyes that blink, gloves with fingers, boots, and a thermal backpack with a lid and a pizza inside.
  - **Story clock.** The narration drives a world clock, so bullet time (the X-ray), slow motion (the fall) and real time all come from the same `rate()`.
  - **Shots.** `SHOTS` holds 32 shots, one cut every ~1.1 s, timed to the words in `audio/palabras.json`.
  - **Motion blur.** Sub-frames never blur across a cut.
- `render.mjs`: headless Chromium (SwiftShader) feeding ffmpeg.
  - `--stills 1,4.6`: still frames.
  - `--scale 0.5`: quick previews.
  - `--video --sub 2`: MP4 output.
- `render_all.sh`: renders in 5 s chunks (resumable), joins them and adds `audio/mix.wav`.
- `audio/narracion.mp3`: the ElevenLabs narration (voice: Alejandro Ballesteros, take 2). `audio/palabras.json` has the time of every word.
- `audio/sonido.py`: effects, ambience and music synthesised in numpy and mixed under the voice.
  - **Synthesised sounds:** the engine, the truck's horn, sensor beeps, the gas charge, the inflation thump, the crash, the wind, the airbag landing, the rolling, the helmet's signal, the ambulance and the door.
  - **World sounds** (engine, city) go through the same time warp as the picture.
  - **Mix:** the voice is compressed and the other stems duck under it. Per-stem limiters, then about −14.6 LUFS and ≤ −3 dBTP (see `audio/mix_report.json`).
- `guion.md`: the script by beats.

```
npm install
python3 audio/sonido.py          # audio/mix.wav
./render_all.sh                  # render/lucas_airbag.mp4  (SUB=2 by default)
```

There are no captions, by design: they are added in editing.
