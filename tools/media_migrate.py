#!/usr/bin/env python3
# מכין (בלי לכתוב למסד) את העברת התמונות מ-website/pages ל-website/media:
# בעמוד נשארת תמונה קטנה, וכל התמונות המלאות עוברות ל-media/{id}. לא נמחקת אף תמונה.
#   python3 tools/media_migrate.py pages-live.json out-dir
# יוצר pages.json, media.json ודו"ח; נעצר אם תמונה מהמקור לא נמצאת בתוצאה.
import base64, copy, json, os, re, subprocess, sys, tempfile, urllib.parse

MIN = 60000   # תמונה קטנה מזה נשארת בעמוד
DATA = re.compile(r'data:image/[a-z+]+;base64,[A-Za-z0-9+/=]+')
JSON_ATTR = re.compile(r'data-(photos|stories)-json="([^"]*)"')
_thumbs = {}


def thumb(url):
    """גרסה עד 360 פיקסלים באיכות 62; אם היא לא קטנה יותר — המקור"""
    if url in _thumbs:
        return _thumbs[url]
    with tempfile.TemporaryDirectory() as d:
        src, out = os.path.join(d, 'in'), os.path.join(d, 'out.jpg')
        with open(src, 'wb') as f:
            f.write(base64.b64decode(url.split(',', 1)[1]))
        subprocess.run(['sips', '-Z', '360', '-s', 'format', 'jpeg', '-s', 'formatOptions', '62', src, '--out', out], check=True, capture_output=True)
        with open(out, 'rb') as f:
            small = 'data:image/jpeg;base64,' + base64.b64encode(f.read()).decode()
    _thumbs[url] = small if len(small) < len(url) else url
    return _thumbs[url]


def images_in(value):
    return set(DATA.findall(json.dumps(value)))


def big(url):
    return isinstance(url, str) and url.startswith('data:') and len(url) >= MIN


def needs_move(it):
    imgs = [x for x in (it.get('images') or []) if x]
    pgs = it.get('pages') or []
    return bool(it.get('id')) and (big(it.get('image')) or big(it.get('cover')) or any(big(x) for x in imgs)
                                   or len(imgs) > 1 or any(isinstance(p, str) or (isinstance(p, dict) and p.get('type') == 'image') for p in pgs)
                                   or bool(it.get('inlineImages')))


def move(it, media):
    imgs = [x for x in (it.get('images') or []) if x]
    pgs = it.get('pages') or []
    first = next((x for x in [it.get('image'), it.get('cover')] + imgs if isinstance(x, str) and x), '')
    if not first:
        for p in pgs:
            first = p if isinstance(p, str) else (p.get('url') or '') if isinstance(p, dict) and p.get('type') == 'image' else ''
            if first:
                break
    th = thumb(first) if first.startswith('data:') else first
    m = {'images': it.get('images') or None, 'pages': pgs or None, 'inlineImages': it.get('inlineImages') or None,
         'image': it.get('image') or None, 'cover': it.get('cover') or None, 'thumb': th or None}
    media[it['id']] = {k: v for k, v in m.items() if v}
    it['_media'] = {'ni': len(imgs), 'np': len(pgs)}
    it['images'] = [th] if th else []
    it['pages'] = []
    it.pop('inlineImages', None)
    if it.get('image'):
        it['image'] = th
    if it.get('cover'):
        it['cover'] = th


def main(src, out_dir):
    with open(src, encoding='utf8') as f:
        pages = json.load(f)
    before = copy.deepcopy(pages)
    media, moved = {}, 0
    rows = pages if isinstance(pages, list) else list(pages.values())

    def fix_attr(m):
        nonlocal moved
        arr = json.loads(urllib.parse.unquote(m.group(2)))
        for it in arr:
            if isinstance(it, dict) and needs_move(it):
                move(it, media)
                moved += 1
        enc = urllib.parse.quote(json.dumps(arr, ensure_ascii=False, separators=(',', ':')), safe="!~*'()-_.")
        return f'data-{m.group(1)}-json="{enc}"'

    for p in rows:
        if not p or not isinstance(p.get('content'), str) or '-json="' not in p['content']:
            continue
        marks = []
        def keep(m):
            marks.append(fix_attr(m))
            return f'\0{len(marks) - 1}\0'
        html = JSON_ATTR.sub(keep, p['content'])
        html = DATA.sub(lambda m: thumb(m.group(0)) if len(m.group(0)) >= MIN else m.group(0), html)   # כרטיסים שמורים בתוך ה-HTML
        p['content'] = re.sub('\0(\\d+)\0', lambda m: marks[int(m.group(1))], html)

    # בדיקה: כל תמונה גדולה מהמקור קיימת ב-media, והטקסטים לא השתנו
    orig = set()
    for p in (before if isinstance(before, list) else before.values()):
        if p and isinstance(p.get('content'), str):
            for _, enc in JSON_ATTR.findall(p['content']):
                orig |= images_in(json.loads(urllib.parse.unquote(enc)))
    kept = images_in(media) | images_in([{'c': json.loads(urllib.parse.unquote(e))} for p in rows if p and isinstance(p.get('content'), str) for _, e in JSON_ATTR.findall(p['content'])])
    missing = orig - kept
    if missing:
        sys.exit(f'STOP: {len(missing)} images from the source are missing from the result')

    def text_only(page_list):
        out = []
        for p in (page_list if isinstance(page_list, list) else page_list.values()):
            if not p:
                continue
            for _, enc in JSON_ATTR.findall(str(p.get('content') or '')):
                for it in json.loads(urllib.parse.unquote(enc)):
                    if isinstance(it, dict):
                        out.append({k: v for k, v in it.items() if k not in ('image', 'cover', 'images', 'pages', 'inlineImages', '_media')})
        return out
    if text_only(before) != text_only(pages):
        sys.exit('STOP: non-image fields changed')

    os.makedirs(out_dir, exist_ok=True)
    for name, obj in (('pages.json', pages), ('media.json', media)):
        with open(os.path.join(out_dir, name), 'w', encoding='utf8') as f:
            json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
    size = lambda o: len(json.dumps(o, ensure_ascii=False, separators=(',', ':')))
    print(json.dumps({'items_moved': moved, 'images_in_source': len(orig), 'missing': 0,
                      'pages_mb_before': round(size(before) / 1e6, 2), 'pages_mb_after': round(size(pages) / 1e6, 2),
                      'media_mb': round(size(media) / 1e6, 2)}))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
