#!/bin/bash
# Lance les 4 vidéos PoC avec les libs Chromium user-space (si sandbox sans root)
export LD_LIBRARY_PATH=${LD_LIBRARY_PATH:-/tmp/chromium-libs/usr/lib/x86_64-linux-gnu}
cd "$(dirname "$0")"
mkdir -p videos
for v in video-1-ur-mail-logs video-2-um-ip-ban video-3-wpvivid-ssrf video-4-wpfm-rce; do
  echo "=== $v ==="
  timeout 300 node $v.js 2>&1 | tail -2
done
echo "=== WebM générés ==="
ls -la videos/*.webm 2>/dev/null
echo ""
echo "Conversion MP4 (nécessite ffmpeg avec libx264) :"
echo "  for f in videos/poc-*.webm; do ffmpeg -y -i \$f -c:v libx264 -pix_fmt yuv420p -an -movflags +faststart \${f%.webm}.mp4; done"
