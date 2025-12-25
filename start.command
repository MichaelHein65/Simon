#!/usr/bin/env bash
# Starts local server for Simon 3D and opens browser (double-click friendly).

set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

PORT=8000

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 nicht gefunden. Bitte Python 3 installieren."
  read -r -p "Weiter mit Enter..." _
  exit 1
fi

echo "Starte Server unter http://localhost:${PORT}"
open "http://localhost:${PORT}" >/dev/null 2>&1 &

exec python3 -m http.server "${PORT}"
