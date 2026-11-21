"""Write lib/cj-products.json from the CJ Dropshipping products listed in scripts/cj_picks.json.

Each pick is one CJ product (find them with scripts/cj_search.py). Fields:
  pid          CJ product ID (required)
  category     store category id from lib/taxonomy.ts, e.g. "bags" (required)
  name         name shown on the site (default: CJ's English name, cleaned up)
  price        retail price in USD (default: highest CJ cost x MARKUP + cheapest shipping, ending in .99)
  blurb        one-line tagline under the name
  details      list of short bullet points
  description  list of paragraphs
  depts        ["women"], ["men"] or both (default: the category's departments)
  afterDark    true to list it under After Dark only
  from         "US" or "CN" to force a warehouse (default: US when CJ has US stock)

Photos are copied to the freaky-times R2 bucket under cj/<pid>/ so the site never hot-links CJ.

Run:  python3 scripts/cj_catalog.py
Needs CJ access: CJ_ACCESS_TOKEN in the environment (the cloud dev box injects it for you).
"""
import hashlib
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_sizes import IMG, make_sizes  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PICKS = os.path.join(REPO, 'scripts', 'cj_picks.json')
OUT = os.path.join(REPO, 'lib', 'cj-products.json')
API = 'https://developers.cjdropshipping.com/api2.0/v1'
TOKEN = os.environ.get('CJ_ACCESS_TOKEN', 'proxy-injected')
MARKUP = float(os.environ.get('MARKUP', '2.0'))

# Cloudflare R2 (same bucket and public URL as the Printful photos).
R2_ACCOUNT = '8954ffc36634674f7163d2a03600e7fb'
R2_PUBLIC = 'https://pub-cf5b5b1875ae4569a8c701274e2ae2bf.r2.dev'
R2_TOKEN = os.environ.get('CLOUDFLARE_API_TOKEN', 'dummy')

SIZE_RE = re.compile(r'^(XXS|XS|S|M|L|XL|XXL|XXXL|[2-6]XL|ONE ?SIZE|FREE ?SIZE|\d{1,2})$', re.I)

HEX = {
    'black': '#151515', 'white': '#ffffff', 'grey': '#9a9a9a', 'gray': '#9a9a9a', 'red': '#c8102e',
    'pink': '#f4b6c8', 'rose': '#e8a0b4', 'purple': '#7d4bb3', 'violet': '#7d4bb3', 'blue': '#2f5fb3',
    'navy': '#1f2a44', 'sky': '#9cc8ec', 'green': '#3d8b4a', 'olive': '#6b6b3a', 'yellow': '#f2d23c',
    'orange': '#f28a2e', 'brown': '#7a4e2d', 'khaki': '#c3b091', 'beige': '#e8dcc4', 'apricot': '#f6c9a0',
    'cream': '#f3ead8', 'gold': '#c9a227', 'silver': '#c0c0c0', 'clear': '#e9eef2', 'transparent': '#e9eef2',
    'multicolor': '#d9d2cc', 'colorful': '#d9d2cc', 'rainbow': '#d9d2cc', 'coffee': '#6f4e37', 'wine': '#722f37',
}


def known_hex(name):
    words = re.findall(r'[a-z]+', name.lower())
    for w in reversed(words):
        if w in HEX:
            return HEX[w]
    return None


def hex_for(name):
    return known_hex(name) or '#d9d2cc'


def call(method, path, params=None, body=None):
    url = API + path + ('?' + urllib.parse.urlencode(params) if params else '')
    data = json.dumps(body).encode() if body is not None else None
    for attempt in range(4):
        req = urllib.request.Request(url, data=data, method=method,
                                     headers={'CJ-Access-Token': TOKEN, 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                out = json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 3:
                time.sleep(2 * (attempt + 1))
                continue
            sys.exit(f'CJ {path} HTTP {e.code}: {e.read().decode()[:300]}')
        time.sleep(1.1)  # free accounts: 1 request per second
        if out.get('code') == 200 or out.get('result') is True:
            return out.get('data')
        if out.get('code') == 1600200 and attempt < 3:
            time.sleep(2 * (attempt + 1))
            continue
        sys.exit(f"CJ {path} said no: {out.get('code')} {out.get('message')}")
    sys.exit(f'CJ kept refusing {path}')


def to_list(x):
    if isinstance(x, list):
        return [i for i in x if i]
    if isinstance(x, str) and x.strip().startswith('['):
        try:
            return [i for i in json.loads(x) if i]
        except ValueError:
            return []
    return [x] if x else []


def to_float(x):
    nums = re.findall(r'\d+(?:\.\d+)?', str(x or ''))
    return float(nums[0]) if nums else 0.0


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower().replace('’', '').replace("'", '')).strip('-')


def clean_name(n):
    n = re.sub(r'\s+', ' ', re.sub(r'[\[\(].*?[\]\)]', '', n or '')).strip(' -,')
    n = n[:60].rsplit(' ', 1)[0] if len(n) > 60 else n
    return ' '.join(w if w.isupper() and len(w) > 1 else w.capitalize() for w in n.split())


def categories():
    """Category id -> (line, depts) read straight from lib/taxonomy.ts."""
    src = open(os.path.join(REPO, 'lib', 'taxonomy.ts')).read()
    out = {}
    for m in re.finditer(r"\{ id: '([a-z-]+)', label: '[^']*', line: '([a-z]+)', depts: (BOTH|W|\[[^\]]*\]) \}", src):
        depts = ['women', 'men'] if m.group(3) == 'BOTH' else ['women'] if m.group(3) == 'W' else re.findall(r"'(\w+)'", m.group(3))
        out[m.group(1)] = (m.group(2), depts)
    return out


def split_options(keys):
    """CJ variant keys like 'Black-M' -> (colors, sizes) per variant."""
    parts = [k.split('-') for k in keys]
    if keys and all(len(p) == 2 for p in parts):
        if all(SIZE_RE.match(p[1].strip()) for p in parts):
            return [(p[0].strip(), p[1].strip().upper()) for p in parts]
        if all(SIZE_RE.match(p[0].strip()) for p in parts):
            return [(p[1].strip(), p[0].strip().upper()) for p in parts]
    if keys and all(SIZE_RE.match(k.strip()) for k in keys):
        return [('Default', k.strip().upper()) for k in keys]
    if len(keys) == 1:
        return [('Default', 'One Size')]
    return [(k.strip() or 'Default', 'One Size') for k in keys]


def us_stock(v):
    for inv in v.get('inventories') or []:
        if str(inv.get('countryCode', '')).upper() == 'US' and int(inv.get('totalInventory') or 0) > 0:
            return True
    return False


def upload(src, pid):
    """Copy a CJ photo into R2, make its WebP sizes and return its URL on pub-cf5b5b1875ae4569a8c701274e2ae2bf.r2.dev.
    Falls back to the r2.dev URL if the sizes fail, and to CJ's URL if the copy fails."""
    ext = os.path.splitext(urllib.parse.urlparse(src).path)[1].lower() or '.jpg'
    if ext not in ('.jpg', '.jpeg', '.png', '.webp'):
        ext = '.jpg'
    key = f'cj/{pid}/{hashlib.sha1(src.encode()).hexdigest()[:12]}{ext}'
    ctype = {'.png': 'image/png', '.webp': 'image/webp'}.get(ext, 'image/jpeg')
    try:
        img = urllib.request.urlopen(urllib.request.Request(src, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60).read()
        urllib.request.urlopen(urllib.request.Request(
            f'https://api.cloudflare.com/client/v4/accounts/{R2_ACCOUNT}/r2/buckets/freaky-times/objects/{urllib.parse.quote(key)}',
            data=img, method='PUT', headers={'Authorization': f'Bearer {R2_TOKEN}', 'Content-Type': ctype}), timeout=120)
    except Exception as e:  # noqa: BLE001
        print(f'    photo copy failed, using CJ link: {e}')
        return src
    try:
        make_sizes(key, img)
        return f'{IMG}/{key}'
    except Exception as e:  # noqa: BLE001
        print(f'    WebP sizes failed, the site will resize this photo: {e}')
        return f'{R2_PUBLIC}/{key}'


def shipping_estimate(from_cc, vid):
    """Cheapest CJ shipping to the US for one unit: (price, 'X-Y business days')."""
    opts = call('POST', '/logistic/freightCalculate', body={
        'startCountryCode': from_cc, 'endCountryCode': 'US', 'products': [{'quantity': 1, 'vid': vid}],
    }) or []
    if not opts:
        return 6.0, None
    best = min(opts, key=lambda o: to_float(o.get('logisticPrice')))
    aging = best.get('logisticAging')
    return to_float(best.get('logisticPrice')), (f'{aging} business days' if aging else None)


def build(pick, n, cats):
    pid = pick['pid']
    cat = pick['category']
    if cat not in cats:
        sys.exit(f"{pid}: category '{cat}' isn't in lib/taxonomy.ts. Pick one of: {', '.join(sorted(cats))}")
    line, cat_depts = cats[cat]

    d = call('GET', '/product/query', params={'pid': pid}) or {}
    variants = d.get('variants') or []
    if not variants:
        sys.exit(f'{pid}: CJ returned no variants')

    from_cc = pick.get('from') or ('US' if any(us_stock(v) for v in variants) else 'CN')
    if from_cc == 'US' and not pick.get('from'):
        variants = [v for v in variants if us_stock(v)]

    keys = [str(v.get('variantKey') or v.get('variantNameEn') or v.get('variantSku') or 'Default') for v in variants]
    opts = split_options(keys)

    name = pick.get('name') or clean_name(d.get('productNameEn') or d.get('productName'))
    print(f'  {n}. {name} ({len(variants)} variants, ships from {from_cc})')

    cj_variants, colors, sizes, seen = [], [], [], set()
    for v, (color, size) in zip(variants, opts):
        if (color, size) in seen:
            continue
        seen.add((color, size))
        cj_variants.append({'color': color, 'size': size, 'vid': v['vid'], 'cost': round(to_float(v.get('variantSellPrice')), 2)})
        if color not in [c['name'] for c in colors]:
            colors.append({'name': color, 'hex': hex_for(color)})
        if size not in sizes:
            sizes.append(size)

    ship_cost, delivery = shipping_estimate(from_cc, cj_variants[0]['vid'])
    max_cost = max(v['cost'] for v in cj_variants)
    price = pick.get('price') or (math.ceil(max_cost * MARKUP + ship_cost) - 0.01)

    photos, done = [], set()
    for v, (color, _) in zip(variants, opts):
        img = v.get('variantImage')
        if img and (img, color) not in done and len(colors) > 1:
            done.add((img, color))
            src = upload(img, pid)
            photos.append({'src': src, 'color': color})
            for c in colors:
                if c['name'] == color and 'image' not in c:
                    c['image'] = src
    # Plain color dots only work when every option is a real color and no two look alike.
    hexes = [known_hex(c['name']) for c in colors]
    if all(hexes) and len(set(hexes)) == len(hexes):
        for c in colors:
            c.pop('image', None)
    for img in to_list(d.get('productImageSet')) or to_list(d.get('productImage')) or to_list(d.get('bigImage')):
        if img not in done:
            done.add(img)
            photos.append({'src': upload(img, pid), 'color': '*'})

    product = {
        'slug': f'{slug(name)}-{slug(pid)[-6:]}',
        'code': f'FT-CJ{n}',
        'name': name,
        'depts': pick.get('depts') or cat_depts,
        'line': line,
        'category': cat,
        'design': 'cj',
        'drop': 'cj',
        'price': round(price, 2),
        'colors': colors,
        'sizes': sizes,
        'blurb': pick.get('blurb', ''),
        'details': (pick.get('details') or []) + ['Ships from our US warehouse' if from_cc == 'US' else 'Ships from our overseas warehouse'],
        'cj': {'pid': pid, 'from': from_cc, 'delivery': delivery, 'variants': cj_variants},
        'photos': photos,
    }
    if pick.get('description'):
        product['description'] = pick['description']
    if pick.get('afterDark'):
        product['afterDark'] = True
    margin = price - max_cost - ship_cost
    print(f'     ${price:.2f} retail, ${max_cost:.2f} CJ cost, ~${ship_cost:.2f} shipping, ~${margin:.2f} profit, {len(photos)} photos')
    return product


def main():
    picks = json.load(open(PICKS))
    cats = categories()
    print(f'Building {len(picks)} CJ products...')
    products = [build(p, i, cats) for i, p in enumerate(picks, 1)]
    with open(OUT, 'w') as f:
        json.dump(products, f, indent=1, ensure_ascii=False)
        f.write('\n')
    print(f'Wrote {len(products)} products to lib/cj-products.json')


if __name__ == '__main__':
    main()
