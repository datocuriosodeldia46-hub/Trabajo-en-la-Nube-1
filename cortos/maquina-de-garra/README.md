# Three coins. One plush.

A 20 s character film (16:9, 60 fps) made from the "Prompt Pack: Claw Machine" (Opus 5.5 prompt).
In a night arcade the Claude mascot stands on a step stool at a claw machine with three pixel coins:
try 1, the weak grip drops the plush; try 2, it slips onto the chute rail, teeters, tumbles back and the
mascot bonks its forehead on the glass; try 3, holding its breath: THUNK. It hops down, pulls the plush
version of itself out of the flap and hugs it, and the plush slowly blinks at us.

- `index.html`: the whole film in one file (three.js 0.160.0 + cannon-es 0.20.0 from the CDN).
  - Opening it in Chrome plays it with sound (click). `?t=12.2` draws a single time and stops.
  - Every frame is a pure function of time: `renderAt(t)` samples a seeded physics bake that runs once at load
    (32 plush settle before t=0, the claw is a kinematic body that shoves its neighbours, each prong stops on contact).
- `render.mjs`: headless Chromium (SwiftShader) plus ffmpeg.
  - `node render.mjs --stills 0.4,9.21`, `--sheet 24` (contact sheet), `--qa` (intersection test),
    `--audio` (Web Audio stems), `--video --sub 3` (MP4 with 3 sub-frames per frame: motion blur and AA).
- `audio/master.py`: mixes the four stems (music, room, fx, foley) in numpy, normalises to −14 LUFS and limits the true peak.
  The result is in `audio/master_report.json`.
- `render/qa_intersections.json`: per-frame log of every pair of solid parts that penetrate (hero, plush, prongs,
  joystick, button, coins, stool, cabinet, chute, glass, flap and camera).

```
npm install
node render.mjs --audio && python3 audio/master.py
node render.mjs --video --sub 3
```
