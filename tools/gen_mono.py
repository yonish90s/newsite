"""בונה את mono.css — המצב הבהיר בשחור-לבן. נכנס לפעולה רק כשאין ל-<html> את המחלקה theme-dark.
כל חוק ב-style.css שיש בו צבע → עותק עם אותו בורר וצבעים בגווני אפור. תמונות התוכן לא מושפעות.
בסוף מתווספים החוקים הידניים מ-tools/mono-extra.css. רץ מתוך tools/build.sh.
"""
import re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEX = r'#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b'
RGB = r'rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)'
COLOR = re.compile(f'({HEX}|{RGB})')
SKIP_AT = ('@keyframes', '@-webkit-keyframes', '@font-face', '@page', '@charset', '@import')


def parse(c):
    c = c.strip().lower()
    if c.startswith('#'):
        h = c[1:]
        if len(h) in (3, 4): h = ''.join(ch * 2 for ch in h)
        return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), (int(h[6:8], 16) / 255 if len(h) == 8 else 1.0)
    n = re.findall(r'[\d.]+', c)
    return int(float(n[0])), int(float(n[1])), int(float(n[2])), (float(n[3]) if len(n) > 3 else 1.0)


def is_colored(c):
    r, g, b, _ = parse(c)
    return max(r, g, b) - min(r, g, b) > 6


def gray(c):
    r, g, b, a = parse(c)
    if max(r, g, b) - min(r, g, b) <= 6: return c
    l = round(.299 * r + .587 * g + .114 * b)
    if l < 100: l = 17          # צבע כהה (ירוק-יער, כחול כהה) → שחור
    elif l > 232: l = 255 if a < 1 else 247   # גוון בהיר מאוד → לבן כמעט
    return f'rgba({l},{l},{l},{a:g})' if a < 1 else '#%02x%02x%02x' % (l, l, l)


def split_decls(body):
    out, cur, depth, quote = [], '', 0, ''
    for ch in body:
        if quote:
            cur += ch
            if ch == quote: quote = ''
            continue
        if ch in '"\'': quote = ch
        elif ch == '(': depth += 1
        elif ch == ')': depth -= 1
        if ch == ';' and depth == 0:
            out.append(cur); cur = ''
        else:
            cur += ch
    if cur.strip(): out.append(cur)
    return out


def prefix(sel):
    parts, cur, depth = [], '', 0
    for ch in sel:
        if ch in '([': depth += 1
        elif ch in ')]': depth -= 1
        if ch == ',' and depth == 0:
            parts.append(cur); cur = ''
        else:
            cur += ch
    parts.append(cur)
    res = []
    for p in parts:
        p = p.strip()
        if not p: continue
        if 'theme-dark' in p: return None   # חוק של מצב כהה
        if p.startswith(':root'): res.append('html:not(.theme-dark)' + p[5:])
        elif re.match(r'html\b', p): res.append('html:not(.theme-dark)' + p[4:])
        else: res.append('html:not(.theme-dark) ' + p)
    return ','.join(res)


def walk(css):
    out, i, n = [], 0, len(css)
    while i < n:
        start = css.find('{', i)
        if start < 0: break
        head = css[i:start].strip()
        depth, j, quote = 1, start + 1, ''
        while j < n and depth:
            ch = css[j]
            if quote:
                if ch == quote: quote = ''
            elif ch in '"\'': quote = ch
            elif ch == '{': depth += 1
            elif ch == '}': depth -= 1
            j += 1
        body = css[start + 1:j - 1]
        i = j
        if head.startswith('@'):
            if head.startswith(SKIP_AT): continue
            inner = walk(body)
            if inner: out.append(head + ' {\n' + inner + '\n}')
            continue
        decls = []
        for d in split_decls(body):
            if ':' not in d or 'url(' in d: continue
            if not any(is_colored(m) for m in COLOR.findall(d)): continue
            decls.append(COLOR.sub(lambda m: gray(m.group(1)), d.strip()))
        if decls:
            sel = prefix(head)
            if sel: out.append(sel + ' { ' + '; '.join(decls) + '; }')
    return '\n'.join(out)


def inline_rules():
    found = {}
    for f in ('script.js', 'index.html'):
        for st in re.findall(r'style="([^"]*)"', open(os.path.join(ROOT, f), encoding='utf8').read()):
            if '${' in st: st = re.sub(r'\$\{[^}]*\}', '', st)
            for d in st.split(';'):
                if ':' not in d: continue
                prop, val = d.split(':', 1)
                prop, val = prop.strip(), val.strip()
                if not re.fullmatch(r'[a-z-]+', prop) or not COLOR.search(val): continue
                if any(is_colored(m) for m in COLOR.findall(val)):
                    found[(prop, val)] = COLOR.sub(lambda m: gray(m.group(1)), val)
    return '\n'.join(f'html:not(.theme-dark) [style*="{p}:{v}"], html:not(.theme-dark) [style*="{p}: {v}"] {{ {p}: {g} !important; }}' for (p, v), g in found.items())


css = re.sub(r'/\*.*?\*/', '', open(os.path.join(ROOT, 'style.css'), encoding='utf8').read(), flags=re.S)
extra = open(os.path.join(ROOT, 'tools', 'mono-extra.css'), encoding='utf8').read()
extra = extra.replace('BODY', 'html:not(.theme-dark) body' + ':not(#_)' * 240)
open(os.path.join(ROOT, 'mono.css'), 'w', encoding='utf8').write(walk(css) + '\n' + inline_rules() + '\n' + extra)
