"""מקטין את שרשראות העדיפות :not(#_#_…) בלי לשנות איזה חוק גובר.

בקוד יש חוקים עם עד 1100 ‎#_‎ כדי לגבור על חוקים אחרים. הדפדפן בודק כל ‎#_‎ על כל רכיב,
וזה מאט את הציור ומנפח את הקבצים. כאן לכל בורר מחשבים כמה ‎#_‎ יש בו בסך הכול,
וממפים את כל הערכים (בכל שלושת הקבצים יחד, כי הם נטענים יחד) לסולם צפוף ששומר על הסדר:
הפרש קטן נשמר בדיוק, הפרש גדול מתכווץ ל-GAP (גדול ממספר ה-id האמיתיים בבורר אחד).
‎:not(#_)‎ מתאים לכל רכיב, אז אפשר לאחד את כל השרשראות של בורר לשרשרת אחת במקום הראשונה.
"""
import re, sys

FILES = ['style.min.css', 'dark.min.css', 'mono.min.css']
GAP = 8
CHAIN = re.compile(r':not\(((?:#_)+)\)')


def split_top(sel):
    out, depth, cur = [], 0, ''
    for ch in sel:
        if ch in '([': depth += 1
        elif ch in ')]': depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur); cur = ''
        else:
            cur += ch
    out.append(cur)
    return out


def preludes(css):
    """מחזיר (start, end) של כל רשימת בוררים (לפני '{' שאינה @-rule)."""
    i, n, start, res = 0, len(css), 0, []
    quote = ''
    while i < n:
        ch = css[i]
        if quote:
            if ch == '\\': i += 2; continue
            if ch == quote: quote = ''
        elif ch in '"\'':
            quote = ch
        elif ch == '{':
            pre = css[start:i]
            if not pre.lstrip().startswith('@'): res.append((start, i))
            start = i + 1
        elif ch in '};':
            start = i + 1
        i += 1
    return res


CAP = 255   # כרום (ורוב הדפדפנים) עוצרים את ספירת ה-id בבורר ב-255; 1000 ו-1100 מתנהגים אותו דבר


def totals(sel):
    t = sum(m.group(1).count('#_') for m in CHAIN.finditer(sel))
    real = len(re.findall(r'#[A-Za-z][\w-]*', CHAIN.sub('', sel)))
    return min(t, CAP - real) if t else 0


def main():
    data = {f: open(f, encoding='utf8').read() for f in FILES}
    vals = set()
    for css in data.values():
        for a, b in preludes(css):
            for s in split_top(css[a:b]):
                t = totals(s)
                if t: vals.add(t)
    mp, prev, cur = {}, None, 0
    for v in sorted(vals):
        cur = v if prev is None else cur + min(v - prev, GAP)
        mp[v] = cur; prev = v
    for f, css in data.items():
        out, last = [], 0
        for a, b in preludes(css):
            parts = []
            for s in split_top(css[a:b]):
                t = totals(s)
                if t:
                    first = [True]
                    def rep(m):
                        if first[0]:
                            first[0] = False
                            return ':not(' + '#_' * mp[t] + ')'
                        return ''
                    s = CHAIN.sub(rep, s)
                parts.append(s)
            out.append(css[last:a]); out.append(','.join(parts)); last = b
        out.append(css[last:])
        new = ''.join(out)
        open(f, 'w', encoding='utf8').write(new)
        print(f'{f}: {len(css)} -> {len(new)}', file=sys.stderr)


if __name__ == '__main__':
    main()
