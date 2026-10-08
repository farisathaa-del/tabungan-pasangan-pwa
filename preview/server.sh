#!/usr/bin/env bash
# Server preview untuk app Tabungan Faris & Saidah.
# Dijalankan dari WSL, diakses dari browser Windows lewat http://localhost:8088
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${1:-8088}"
IP="$(hostname -I | awk '{print $1}')"

if ss -tln 2>/dev/null | grep -q ":${PORT} "; then
  echo "Port ${PORT} sudah dipakai. Hentikan dulu:  pkill -f \"http.server ${PORT}\""
  exit 1
fi

nohup python3 -m http.server "$PORT" --directory "$ROOT" \
  >"$ROOT/preview/.server.log" 2>&1 &
echo $! >"$ROOT/preview/.server.pid"

sleep 1
echo "Server aktif"
echo "  app      : http://localhost:${PORT}/"
echo "  preview  : http://localhost:${PORT}/preview/"
echo "  baseline : http://localhost:${PORT}/backup/baseline/index-downloads.html"
echo "  fallback : http://${IP}:${PORT}/   (kalau localhost refused)"
echo "  hentikan : pkill -f \"http.server ${PORT}\""