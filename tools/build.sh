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
# גודל קבצי האתר (מה שעולה לורסל) — מוצג למנהל בלשונית "אחסון"
python3 -c "
import subprocess, os, json, time
fs = [f for f in subprocess.check_output(['git', 'ls-files']).decode().split('\\n') if f and os.path.isfile(f)]
json.dump({'bytes': sum(os.path.getsize(f) for f in fs), 'files': len(fs), 't': int(time.time() * 1000)}, open('site-stats.json', 'w'))
"
echo "built: script.min.js style.min.css dark.min.css site-stats.json"
