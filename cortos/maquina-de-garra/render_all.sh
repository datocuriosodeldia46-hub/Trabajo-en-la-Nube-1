#!/usr/bin/env bash
# Renders the film in 5 s chunks (resumable), then joins them and muxes audio/mix.wav as AAC.
set -euo pipefail
cd "$(dirname "$0")"
SUB=${SUB:-2}
mkdir -p render/parts
for a in 0 5 10 15; do
  b=$((a + 5)); part=render/parts/part_$(printf %02d $a).mp4
  [ -f "$part" ] && { echo "skip $part"; continue; }
  node render.mjs --video --mute --sub "$SUB" --from "$a" --to "$b" --out "$part.tmp.mp4" 2>&1 | grep -v "GPU stall"
  mv "$part.tmp.mp4" "$part"
done
printf "file '%s'\n" parts/part_00.mp4 parts/part_05.mp4 parts/part_10.mp4 parts/part_15.mp4 > render/parts.txt
ffmpeg -v error -y -f concat -safe 0 -i render/parts.txt -i audio/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart render/claw_machine.mp4
echo "done render/claw_machine.mp4"
