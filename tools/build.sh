#!/bin/sh
# בונה את הקבצים שהאתר טוען בפועל: מצב כהה + גרסאות מכווצות (min) של הקוד והעיצוב.
# להריץ אחרי כל שינוי ב-script.js / style.css / tools/dark-extra.css, ואז לקדם את ?v= ב-index.html:
#   sh tools/build.sh
set -e
cd "$(dirname "$0")/.."
python3 tools/gen_dark.py
npx --yes esbuild@0.24.0 script.js --minify --format=esm --log-level=warning --outfile=script.min.js
npx --yes esbuild@0.24.0 style.css --minify --log-level=warning --outfile=style.min.css
npx --yes esbuild@0.24.0 dark.css --minify --log-level=warning --outfile=dark.min.css
echo "built: script.min.js style.min.css dark.min.css"
