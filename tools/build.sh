#!/bin/sh
# בונה את הקבצים שהאתר טוען בפועל: מצב כהה + גרסאות מכווצות (min) של הקוד והעיצוב.
# להריץ אחרי כל שינוי ב-script.js / style.css / tools/dark-extra.css, ואז לקדם את ?v= ב-index.html:
#   sh tools/build.sh
set -e
cd "$(dirname "$0")/.."
python3 tools/gen_dark.py
python3 tools/gen_mono.py
npx --yes esbuild@0.24.0 script.js --minify --format=esm --tree-shaking=true --log-level=warning --outfile=script.min.js
npx --yes esbuild@0.24.0 style.css --minify --log-level=warning --outfile=style.min.css
npx --yes esbuild@0.24.0 dark.css --minify --log-level=warning --outfile=dark.min.css
npx --yes esbuild@0.24.0 mono.css --minify --log-level=warning --outfile=mono.min.css
# מכווץ שרשראות :not(#_):not(#_)… ל-:not(#_#_…): אותה עדיפות ואותה התאמה, וכמעט חצי מהגודל
python3 -c "
import re
for f in ['style.min.css', 'dark.min.css', 'mono.min.css']:
    s = open(f, encoding='utf8').read()
    s = re.sub(r'(?::not\(#_\)){2,}', lambda m: ':not(' + '#_' * m.group(0).count('#_') + ')', s)
    open(f, 'w', encoding='utf8').write(s)
"
python3 tools/css_purge.py
# גודל קבצי האתר (מה שעולה לורסל) — מוצג למנהל בלשונית "אחסון"
python3 -c "
import subprocess, os, json, time
fs = [f for f in subprocess.check_output(['git', 'ls-files']).decode().split('\\n') if f and os.path.isfile(f)]
json.dump({'bytes': sum(os.path.getsize(f) for f in fs), 'files': len(fs), 't': int(time.time() * 1000)}, open('site-stats.json', 'w'))
"
echo "built: script.min.js style.min.css dark.min.css mono.min.css site-stats.json"
