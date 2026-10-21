#!/usr/bin/env bash
# Renders "Lucas" in 5 s chunks (resumable), joins them and muxes audio/mix.wav (python3 audio/sonido.py) as AAC.
set -euo pipefail
cd "$(dirname "$0")"
SUB=${SUB:-2}
mkdir -p render/parts
parts=()
for a in 0 5 10 15 20 25 30 35; do
  b=$((a + 5)); [ "$a" = 35 ] && b=35.3
  part=render/parts/part_$(printf %02d $a).mp4; parts+=("parts/part_$(printf %02d $a).mp4")
  [ -f "$part" ] && { echo "skip $part"; continue; }
  node render.mjs --video --mute --sub "$SUB" --from "$a" --to "$b" --out "$part.tmp.mp4"
  mv "$part.tmp.mp4" "$part"
done
printf "file '%s'\n" "${parts[@]}" > render/parts.txt
ffmpeg -v error -y -f concat -safe 0 -i render/parts.txt -i audio/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart render/lucas_airbag.mp4
echo "done render/lucas_airbag.mp4"
