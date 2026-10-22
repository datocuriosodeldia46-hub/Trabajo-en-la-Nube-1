#!/usr/bin/env bash
# Renders "Te estás ahogando" in 5 s chunks (resumable, JOBS in parallel), joins them and muxes audio/mix.wav (python3 audio/sonido.py) as AAC.
set -euo pipefail
cd "$(dirname "$0")"
SUB=${SUB:-2}; JOBS=${JOBS:-2}; OUT=render/te_estas_ahogando.mp4
mkdir -p render/parts
starts=(0 5 10 15 20 25 30 35 40)
chunk() {
  a=$1; b=$((a + 5)); [ "$a" = 40 ] && b=43.3
  part=render/parts/part_$(printf %02d "$a").mp4
  [ -f "$part" ] && { echo "skip $part"; return; }
  node render.mjs --video --mute --sub "$SUB" --from "$a" --to "$b" --out "$part.tmp.mp4" > "render/parts/log_$a.txt" 2>&1
  mv "$part.tmp.mp4" "$part"; echo "ok $part"
}
export -f chunk; export SUB
printf '%s\n' "${starts[@]}" | xargs -P "$JOBS" -I{} bash -c 'chunk {}'
for a in "${starts[@]}"; do echo "file 'parts/part_$(printf %02d "$a").mp4'"; done > render/parts.txt
ffmpeg -v error -y -f concat -safe 0 -i render/parts.txt -i audio/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart "$OUT"
echo "done $OUT"
