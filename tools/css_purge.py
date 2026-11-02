#!/usr/bin/env python3
# מוריד מקובצי ה-min כללים של מחלקות שלא קיימות באף מקום: לא בקוד ולא ב-HTML ששמור במסד.
# שמרני: שם שנבנה דינמית בקוד נשאר, וכך גם כל מה שבתוך :is / :has / :not.
#   python3 tools/css_purge.py   (אם אי אפשר לקרוא את המסד — לא מוריד כלום)
import glob, re, subprocess, sys

DB = 'https://newsite-f76e2-default-rtdb.firebaseio.com/website/%s.json'
try:
    stored = ''.join(subprocess.check_output(['curl', '-sf', '--max-time', '60', DB % k]).decode() for k in ['pages', 'navHTML', 'topNavPages'])
except Exception as e:
    print('css_purge: skipped,', e)
    sys.exit(0)
code = stored + ''.join(open(f, encoding='utf8').read() for f in ['script.js', 'a11y.js'] + glob.glob('*.html') + glob.glob('api/*.js'))
words = set(re.findall(r'[A-Za-z_][\w-]*', code))
prefixes = tuple(set(re.findall(r'''[\s'"`.]([A-Za-z][\w-]*)(?:\$\{|['"`]\s*\+)''', code)))
alive = lambda c: c in words or c.startswith(prefixes)


def plain(sel):
    sel = re.sub(r'"[^"]*"|\'[^\']*\'', '', sel)   # מחרוזות יכולות להכיל סוגריים ונקודות
    sel = re.sub(r'\[[^\]]*\]', '', sel)
    while True:
        out = re.sub(r':[a-z-]+\([^()]*\)', '', sel)
        if out == sel:
            return out
        sel = out


def split(sel):
    out, depth, cur, quote = [], 0, '', None
    for ch in sel:
        if quote:
            quote = None if ch == quote else quote
        elif ch in '"\'':
            quote = ch
        else:
            depth += ch in '([' or -(ch in ')]')
        if ch == ',' and depth == 0 and not quote:
            out.append(cur)
            cur = ''
        else:
            cur += ch
    return out + [cur]


def block_end(s, j):
    depth, k, quote = 1, j + 1, None
    while depth:
        ch = s[k]
        if quote:
            if ch == '\\':
                k += 1
            elif ch == quote:
                quote = None
        elif ch in '"\'':
            quote = ch
        elif ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
        k += 1
    return k


def purge(s):
    out, i = [], 0
    while True:
        j = s.find('{', i)
        if j < 0:
            out.append(s[i:])
            return ''.join(out)
        sel, k = s[i:j], block_end(s, j)
        if re.match(r'\s*@(media|supports|layer|container)', sel):
            inner = purge(s[j + 1:k - 1])
            if inner.strip():
                out.append(sel + '{' + inner + '}')
        elif sel.lstrip().startswith('@'):
            out.append(s[i:k])
        else:
            live = [p for p in split(sel) if all(alive(c) for c in re.findall(r'\.(-?[A-Za-z_][\w-]*)', plain(p)))]
            if live:
                out.append(','.join(live) + s[j:k])
        i = k


for f in ['style.min.css', 'dark.min.css', 'mono.min.css']:
    s = open(f, encoding='utf8').read()
    t = purge(s)
    open(f, 'w', encoding='utf8').write(t)
    print(f, len(s), '->', len(t))
