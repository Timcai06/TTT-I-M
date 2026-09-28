#!/usr/bin/env bash
# Render a film with true motion blur: four sub-frames per film frame (the "-sub" composition,
# 120 fps), averaged in pairs into a 180° shutter, down to 30 fps, then the score muxed in.
#   ./render.sh EduCanvas educanvas
set -euo pipefail
cd "$(dirname "$0")"
comp=$1; name=$2
exe=${REMOTION_BROWSER:-$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-*/chrome-headless-shell 2>/dev/null | tail -1)}
mkdir -p out
npx remotion render src/index.ts "$comp-sub" "out/$name-sub.mp4" --codec h264 --crf 12 ${exe:+--browser-executable="$exe"}
ffmpeg -y -hide_banner -loglevel error -i "out/$name-sub.mp4" -i "out/$name-mix.wav" \
  -vf "tmix=frames=2:weights='1 1',fps=30" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -shortest -movflags +faststart "out/$name.mp4"
echo "wrote out/$name.mp4"
