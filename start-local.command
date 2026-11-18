#!/bin/bash
# Serves this wedding invitation at http://localhost:8080
cd "$(dirname "$0")"
PORT=8080
echo "Wedding invitation running at http://localhost:$PORT  (close this window or press Ctrl+C to stop)"
(sleep 1 && open "http://localhost:$PORT") &
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server $PORT
else
  npx --yes http-server -p $PORT -c-1
fi
