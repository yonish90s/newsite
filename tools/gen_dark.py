"""בונה את dark.css — מצב כהה שנכנס לפעולה רק כש-<html> מקבל את המחלקה theme-dark.
המצב הבהיר (style.css) לא משתנה. מריצים מחדש אחרי שינויי עיצוב:
    python3 tools/gen_dark.py
1. כל חוק ב-style.css שיש בו צבע → עותק עם קידומת html.theme-dark וצבעים מומרים (!important)
2. צבעים בסגנונות inline (style="..." ב-script.js / index.html) → חוקים לפי [style*="..."]
"""
import re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE, CARD, SURF, SURF2, RAISE = '#0f0d14', '#17141d', '#1d1924', '#252030', '#2f293a'
BORDER = '#2a2433'
TEXT, TEXT2, MUTED = '#eceef1', '#c8cdd4', '#9aa2ad'
ACC = '#352e42'

HEX = r'#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b'
RGB = r'rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)'
COLOR = re.compile(f'({HEX}|{RGB}|\\bwhite\\b|\\bblack\\b)')


def parse(c):
    c = c.strip().lower()
    if c == 'white': return 255, 255, 255, 1.0
    if c == 'black': return 0, 0, 0, 1.0
    if c.startswith('#'):
        h = c[1:]
        if len(h) in (3, 4): h = ''.join(ch * 2 for ch in h)
        return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), (int(h[6:8], 16) / 255 if len(h) == 8 else 1.0)
    n = re.findall(r'[\d.]+', c)
    return int(float(n[0])), int(float(n[1])), int(float(n[2])), (float(n[3]) if len(n) > 3 else 1.0)


def lum(r, g, b): return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
def chroma(r, g, b): return (max(r, g, b) - min(r, g, b)) / 255
def fa(a): return ('%.3f' % a).rstrip('0').rstrip('.')


def map_bg(c):
    r, g, b, a = parse(c)
    L, C = lum(r, g, b), chroma(r, g, b)
    if a < 1:
        if L > 0.8: return f'rgba(27, 30, 36, {fa(a)})'
        if L < 0.3 and a < 0.3 and C < 0.2: return f'rgba(255, 255, 255, {fa(a * 0.9)})'
        return None
    if C > 0.16:
        if L > 0.8: return f'color-mix(in srgb, {c} 22%, {CARD})'   # פסטל → גוון כהה של אותו צבע
        return None                                                  # צבע מותג נשאר
    if L > 0.985: return CARD
    if L > 0.94:  return SURF
    if L > 0.86:  return SURF2
    if L > 0.7:   return RAISE
    if L < 0.16:  return ACC                                         # כפתור שחור → כחול (טקסט לבן נשאר קריא)
    return None


def map_fg(c):
    r, g, b, a = parse(c)
    L, C = lum(r, g, b), chroma(r, g, b)
    if C > 0.2:
        if L < 0.35: return f'color-mix(in srgb, {c} 55%, white)'   # צבע כהה (טקסט אריח) → בהיר יותר
        return None
    if a < 1:
        if L < 0.35: return f'rgba(236, 238, 241, {fa(a)})'
        return None
    if L < 0.25: return TEXT
    if L < 0.45: return TEXT2
    if L < 0.62: return MUTED
    return None


def map_border(c):
    r, g, b, a = parse(c)
    L, C = lum(r, g, b), chroma(r, g, b)
    if C > 0.16: return None
    if a < 1:
        if L < 0.35: return f'rgba(255, 255, 255, {fa(min(1, a * 0.8))})'
        if L > 0.8: return 'rgba(255, 255, 255, 0.1)'
        return None
    if L > 0.7: return BORDER
    if L < 0.16: return '#5b6472'
    return None


BG = {'background', 'background-color', 'background-image'}
FG = {'color', 'fill', 'stroke', 'caret-color', '-webkit-text-fill-color', 'text-decoration-color'}
def role(p):
    p = p.lower()
    if p in BG: return map_bg
    if p in FG: return map_fg
    if p.startswith('border') or p.startswith('outline'): return map_border
    if p.startswith('--'):
        if re.search(r'(bg|paper|soft|surface|card|page|panel|cream|base)', p): return map_bg
        if re.search(r'(ink|text|fg|title|heading|muted)', p): return map_fg
        if re.search(r'(line|border|divider)', p): return map_border
    return None


def convert_value(prop, val):
    fn = role(prop)
    if not fn or 'url(' in val: return None
    changed = [False]
    def sub(m):
        nv = fn(m.group(1))
        if nv is None: return m.group(1)
        changed[0] = True
        return nv
    out = COLOR.sub(sub, val)
    return out if changed[0] else None


DECL = re.compile(r'(--[\w-]+|[a-z-]+)\s*:\s*([^;]+?)\s*(!important)?\s*(?:;|$)')

def dark_decls(body):
    out = []
    for m in DECL.finditer(body):
        prop, val = m.group(1), m.group(2)
        nv = convert_value(prop, val)
        if nv is not None:
            out.append(f'{prop}: {nv} !important')
    return out


def prefix_selector(sel):
    s = sel.strip()
    if not s: return s
    if s.startswith(':root'): return 'html.theme-dark' + s[5:]
    m = re.match(r'^html((?:[.#:\[][^\s]*)?)(\s|$)(.*)', s)
    if m:
        rest = m.group(1) or ''
        if rest.startswith(':not(#_)') or rest.startswith(':has') or rest.startswith('.') or rest.startswith(':') or rest == '':
            return 'html.theme-dark' + rest + (' ' + m.group(3) if m.group(3) else '')
    if re.match(r'^body\b', s): return 'html.theme-dark ' + s
    return 'html.theme-dark ' + s


def split_selectors(prelude):
    parts, depth, cur = [], 0, ''
    for ch in prelude:
        if ch in '([': depth += 1
        elif ch in ')]': depth -= 1
        if ch == ',' and depth == 0:
            parts.append(cur); cur = ''
        else:
            cur += ch
    parts.append(cur)
    return [p for p in parts if p.strip()]


def walk(css):
    """מחזיר רשימת חוקים כהים, ושומר על עטיפות @media / @supports"""
    out, i, n = [], 0, len(css)
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    n = len(css)
    def block(start):
        depth, j = 0, start
        while j < n:
            if css[j] == '{': depth += 1
            elif css[j] == '}':
                depth -= 1
                if depth == 0: return j
            j += 1
        return n - 1
    res = []
    def process(text):
        local, k, L = [], 0, len(text)
        while k < L:
            o = text.find('{', k)
            if o < 0: break
            prelude = ' '.join(text[k:o].split())  # בוררים שנפרשים על כמה שורות
            depth, j = 1, o + 1
            while j < L and depth:
                if text[j] == '{': depth += 1
                elif text[j] == '}': depth -= 1
                j += 1
            body = text[o + 1:j - 1]
            if prelude.startswith('@media') or prelude.startswith('@supports'):
                inner = process(body)
                if inner: local.append(prelude + ' {\n' + '\n'.join(inner) + '\n}')
            elif prelude.startswith('@'):
                pass
            elif '{' not in body:
                decls = dark_decls(body)
                if decls:
                    sels = ', '.join(prefix_selector(s) for s in split_selectors(prelude))
                    local.append(f'{sels} {{ {"; ".join(decls)}; }}')
            k = j
        return local
    return process(css)


INLINE_DECL = re.compile(r'(background(?:-color)?|color|border(?:-[a-z]+)*|fill|stroke)\s*:\s*([^;"\'`<>]*?(?:#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))[^;"\'`<>]*?)(?=\s*[;"\'`]|$)')

def inline_rules(text):
    seen, rules = set(), []
    for attr in re.findall(r'style="([^"]*)"', text) + re.findall(r"style='([^']*)'", text) + re.findall(r"cssText\s*=\s*'([^']*)'", text):
        for m in INLINE_DECL.finditer(attr):
            raw = m.group(0).strip()
            if '${' in raw or '\n' in raw or '\r' in raw or raw in seen: continue  # שבירת שורה הורסת את קובץ ה-CSS
            seen.add(raw)
            prop, val = m.group(1), m.group(2).strip()
            nv = convert_value(prop, val)
            if nv is None: continue
            key = raw.replace('\\', '\\\\').replace('"', '\\"')
            rules.append(f'html.theme-dark [style*="{key}"] {{ {prop}: {nv} !important; }}')
    return rules


def main():
    css = open(os.path.join(ROOT, 'style.css'), encoding='utf-8').read()
    rules = walk(css)
    inl = []
    for f in ('script.js', 'index.html'):
        inl += inline_rules(open(os.path.join(ROOT, f), encoding='utf-8').read())
    base = f"""/* נוצר אוטומטית על ידי tools/gen_dark.py — לא לערוך ידנית */
html.theme-dark {{ color-scheme: dark; }}
html.theme-dark, html.theme-dark body {{ background: {PAGE} !important; color: {TEXT}; }}
html.theme-dark input, html.theme-dark textarea, html.theme-dark select {{ color: {TEXT}; }}
html.theme-dark input::placeholder, html.theme-dark textarea::placeholder {{ color: #7e8793; }}
"""
    out = base + '\n'.join(rules) + '\n/* inline */\n' + '\n'.join(dict.fromkeys(inl)) + '\n'
    out += open(os.path.join(ROOT, 'tools', 'dark-extra.css'), encoding='utf-8').read() if os.path.exists(os.path.join(ROOT, 'tools', 'dark-extra.css')) else ''
    open(os.path.join(ROOT, 'dark.css'), 'w', encoding='utf-8').write(out)
    print('dark.css:', len(rules), 'rules,', len(inl), 'inline rules,', len(out) // 1024, 'KB')


if __name__ == '__main__':
    main()
