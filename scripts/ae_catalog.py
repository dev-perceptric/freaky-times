"""Write lib/ae-products.json from the AliExpress products listed in scripts/ae_picks.json.

Each pick: {"id": "<AliExpress product id>", "category": "<taxonomy id>", ...} with the same optional
fields as scripts/cj_picks.json (name, price, blurb, details, description, depts, afterDark).

AliExpress calls go through https://freakytimes.com/api/aliexpress/admin (the server holds the keys
and the store's AliExpress sign-in). Send ADMIN_TOKEN in the X-Admin-Token header; the cloud dev box
injects it for you.

Run:  python3 scripts/ae_catalog.py
"""
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cj_catalog import categories, clean_name, hex_for, known_hex, slug, upload  # noqa: E402
from size_charts import from_info, from_table, norm_size  # noqa: E402

CHARTS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib', 'size-charts.json')
NEW_CHARTS = {}

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PICKS = os.path.join(REPO, 'scripts', 'ae_picks.json')
OUT = os.path.join(REPO, 'lib', 'ae-products.json')
ADMIN_URL = os.environ.get('ADMIN_URL', 'https://freakytimes.com/api/aliexpress/admin')
ADMIN_TOKEN = os.environ.get('ADMIN_TOKEN', 'proxy-injected')
MARKUP = float(os.environ.get('MARKUP', '2.5'))
MAX_PHOTOS = int(os.environ.get('MAX_PHOTOS', '8'))
# Skip items rated below this once they have a few reviews.
MIN_RATING = float(os.environ.get('MIN_RATING', '0'))
SIZE_NAMES = re.compile(r'^(size|sizes|us size|eu size|uk size|cn size|shoe size|shoes size|clothing size)$', re.I)
# AliExpress property ids that are always a size (5 = clothing size, 200000124 / 200001027 = shoe size).
SIZE_IDS = {'5', '200000124', '200001027'}
SKIP_PROPS = re.compile(r'^(ships from|ship from|shipping from)$', re.I)
SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', 'ONE SIZE']
# Pinyin and odd supplier color names.
COLOR_FIX = {'fen': 'Pink', 'hong': 'Red', 'hei': 'Black', 'bai': 'White', 'lan': 'Blue', 'hui': 'Gray', 'huang': 'Yellow',
             'zi': 'Purple', 'lv': 'Green', 'kafei': 'Coffee', 'claret': 'Burgundy', 'rose red': 'Hot Pink'}


def clean_color(c):
    c = re.sub(r'[（(].*?[)）]', '', c).strip()
    if re.fullmatch(r'[#\s]*\d+', c):  # sellers often number their prints: "01", "02"...
        return f'Design {int(re.sub(r"\D", "", c))}'
    c = re.sub(r'^\s*[\d#]+[\s-]*', '', c).strip(' -_/')
    c = COLOR_FIX.get(c.lower(), c)
    return ' '.join(w.capitalize() for w in c.split()) or 'Default'


def clean_size(s):
    s = re.sub(r'[（(].*?[)）]', '', s).strip().upper()
    return {'XXL': '2XL', 'XXXL': '3XL', 'XXXXL': '4XL', 'XXXXXL': '5XL'}.get(s, s)


def size_key(s):
    return SIZE_ORDER.index(s) if s in SIZE_ORDER else 100


def admin(method, params):
    req = urllib.request.Request(ADMIN_URL, data=json.dumps({'method': method, 'params': params}).encode(), method='POST',
                                 headers={'Content-Type': 'application/json', 'X-Admin-Token': ADMIN_TOKEN, 'User-Agent': 'Mozilla/5.0 (FreakyTimes import)'})
    try:
        out = json.loads(urllib.request.urlopen(req, timeout=90).read())
    except urllib.error.HTTPError as e:
        sys.exit(f'{method}: HTTP {e.code} {e.read().decode()[:300]}')
    time.sleep(0.5)
    return out


def arr(x):
    """AliExpress wraps lists as {"thing_d_t_o": [...]}. Unwrap them."""
    if isinstance(x, list):
        return x
    if isinstance(x, dict) and len(x) == 1 and isinstance(next(iter(x.values())), list):
        return next(iter(x.values()))
    return [] if x in (None, '', {}) else [x]


def result_of(resp, method):
    return (resp.get(method.replace('.', '_') + '_response') or resp).get('result') or {}


def to_float(x):
    m = re.findall(r'\d+(?:\.\d+)?', str(x or ''))
    return float(m[0]) if m else 0.0


def ship_estimate(pid, sku_id):
    resp = admin('aliexpress.ds.freight.query', {'queryDeliveryReq': {
        'quantity': '1', 'shipToCountry': 'US', 'productId': pid, 'selectedSkuId': sku_id,
        'language': 'en_US', 'currency': 'USD', 'locale': 'en_US'}})
    opts = arr(result_of(resp, 'aliexpress.ds.freight.query').get('delivery_options'))
    if not opts:
        return 5.0, None
    fee = lambda o: 0.0 if str(o.get('free_shipping')).lower() == 'true' else to_float(o.get('shipping_fee_cent'))  # noqa: E731
    best = min(opts, key=lambda o: (fee(o), to_float(o.get('max_delivery_days') or 99)))
    lo, hi = best.get('min_delivery_days'), best.get('max_delivery_days')
    return fee(best), (f'{lo}-{hi} days' if lo and hi else None)


def clean_title(name):
    """Product name as shown on the site: single spaces, no leftover "Y2K" from old picks."""
    return re.sub(r'\s+', ' ', re.sub(r'\bY2K\b', '', name or '', flags=re.I)).strip() or 'Lingerie'


def build(pick, n, cats):
    pid, cat = str(pick['id']), pick['category']
    if cat not in cats:
        sys.exit(f"{pid}: category '{cat}' isn't in lib/taxonomy.ts")
    line, cat_depts = cats[cat]
    res = result_of(admin('aliexpress.ds.product.get', {
        'product_id': pid, 'ship_to_country': 'US', 'target_currency': 'USD', 'target_language': 'en'}), 'aliexpress.ds.product.get')
    if not res:
        sys.exit(f'{pid}: AliExpress returned nothing')
    base = res.get('ae_item_base_info_dto') or {}
    rating, reviews = to_float(base.get('avg_evaluation_rating')), int(to_float(base.get('evaluation_count')))
    if reviews >= 5 and rating < MIN_RATING:
        sys.exit(f'{pid}: rated {rating} from {reviews} reviews, under {MIN_RATING}')
    skus = [s for s in arr(res.get('ae_item_sku_info_dtos')) if int(s.get('sku_available_stock') or 0) > 0]
    if not skus:
        sys.exit(f'{pid}: no SKUs in stock')

    # Prefer US-warehouse SKUs when the listing offers "Ships From: United States".
    def ships_from(s):
        for pr in arr(s.get('ae_sku_property_dtos')):
            if SKIP_PROPS.match(str(pr.get('sku_property_name', '')).strip()):
                return str(pr.get('property_value_definition_name') or pr.get('sku_property_value') or '')
        return ''
    if any(re.search(r'united states|^us$', ships_from(s), re.I) for s in skus):
        skus = [s for s in skus if re.search(r'united states|^us$', ships_from(s), re.I)]
    elif any(ships_from(s) for s in skus):
        skus = [s for s in skus if re.search(r'china|^cn$', ships_from(s), re.I)] or skus

    variants, colors, sizes, seen, color_img = [], [], [], set(), {}
    for s in skus:
        size, others = 'One Size', []
        for pr in arr(s.get('ae_sku_property_dtos')):
            name = str(pr.get('sku_property_name', '')).strip()
            val = str(pr.get('property_value_definition_name') or pr.get('sku_property_value') or '').strip()
            if SKIP_PROPS.match(name) or not val:
                continue
            if SIZE_NAMES.match(name) or str(pr.get('sku_property_id', '')) in SIZE_IDS:
                size = clean_size(val)
            else:
                val = clean_color(val)
                others.append(val)
                if pr.get('sku_image'):
                    color_img.setdefault(val, pr['sku_image'])
        color = ' / '.join(others) or 'Default'
        if (color, size) in seen:
            continue
        seen.add((color, size))
        variants.append({'color': color, 'size': size, 'skuAttr': s.get('sku_attr') or s.get('id'), 'skuId': str(s.get('sku_id')),
                         'cost': round(to_float(s.get('offer_sale_price') or s.get('sku_price')), 2)})
        if color not in [c['name'] for c in colors]:
            colors.append({'name': color, 'hex': hex_for(color)})
        if size not in sizes:
            sizes.append(size)

    sizes.sort(key=size_key)
    # Numbered prints: renumber "Design 10004, 10007..." as Design 1, 2... and drop the label when there's only one.
    if colors and all(re.fullmatch(r'Design \d+', c['name']) for c in colors):
        order = sorted(colors, key=lambda c: int(c['name'].split()[1]))
        ren = {c['name']: ('Default' if len(order) == 1 else f'Design {i}') for i, c in enumerate(order, 1)}
        for c in colors:
            c['name'] = ren[c['name']]
        for v in variants:
            v['color'] = ren[v['color']]
        color_img = {ren.get(k, k): u for k, u in color_img.items()}
        colors.sort(key=lambda c: c['name'])
    name = clean_title(pick.get('name') or clean_name(base.get('subject')))
    ship, delivery = ship_estimate(pid, variants[0]['skuId'])
    max_cost = max(v['cost'] for v in variants)
    # Cheap items take the full markup; pricier ones less, so a $40 top doesn't list at $100+.
    mult = MARKUP if max_cost < 12 else min(MARKUP, 2.0) if max_cost < 25 else min(MARKUP, 1.8)
    price = pick.get('price') or (math.ceil(max_cost * mult + ship) - 0.01)

    # Copy photos to R2 in parallel: one product can have 8+ photos and each copy is a download plus an upload.
    color_srcs = {}
    for c in colors:
        img = color_img.get(c['name']) or next((color_img[x] for x in c['name'].split(' / ') if x in color_img), None)
        if img and len(colors) > 1:
            color_srcs[c['name']] = img
    images = [u for u in str((res.get('ae_multimedia_info_dto') or {}).get('image_urls') or '').split(';') if u]
    extra = images[:max(0, MAX_PHOTOS - len(color_srcs))] or images[:3]
    todo = list(dict.fromkeys(list(color_srcs.values()) + extra))
    with ThreadPoolExecutor(8) as ex:
        uploaded = dict(zip(todo, ex.map(lambda u: upload(u, f'ae-{pid}'), todo)))
    photos = []
    for c in colors:
        if c['name'] in color_srcs:
            src = uploaded[color_srcs[c['name']]]
            photos.append({'src': src, 'color': c['name']})
            c['image'] = src
    hexes = [known_hex(c['name']) for c in colors]
    if all(hexes) and len(set(hexes)) == len(hexes):
        for c in colors:
            c.pop('image', None)
    for img in extra:
        photos.append({'src': uploaded[img], 'color': '*'})

    margin = price - max_cost - ship
    print(f'  {n}. {name}: {len(variants)} variants, ${price:.2f} retail, ${max_cost:.2f} cost, ${ship:.2f} ship, ~${margin:.2f} profit, '
          f"rating {base.get('avg_evaluation_rating')} ({base.get('evaluation_count')}), sold {base.get('sales_count')}")
    product = {
        'slug': f'{slug(name)}-{pid[-6:]}',
        'code': f'FT-AE{n}',
        'name': name,
        'depts': pick.get('depts') or cat_depts,
        'line': line,
        'category': cat,
        'design': 'ae',
        'drop': os.environ.get('AE_DROP', 'drop7'),
        'price': round(price, 2),
        'colors': colors,
        'sizes': sizes,
        'blurb': pick.get('blurb', ''),
        'details': (pick.get('details') or []) + ['Ships from our overseas partner'],
        'ae': {'productId': pid, 'delivery': delivery, 'variants': variants},
        'photos': photos,
        **({'tags': pick['tags']} if pick.get('tags') else {}),
        **({'attrs': pick['attrs']} if pick.get('attrs') else {}),
    }
    if pick.get('description'):
        product['description'] = pick['description']
    if pick.get('afterDark'):
        product['afterDark'] = True
    # Size chart: the seller's table from the description, else AliExpress's per-size measurement.
    detail = base.get('detail', '') or ''
    i = detail.find('[xlmodel]-[size]')
    props = arr((res.get('ae_item_properties') or {}).get('ae_item_property'))
    si = next((x.get('attr_value') for x in props if x.get('attr_name') == 'size_info'), None)
    chart = (from_table(detail[i:i + 20000]) if i >= 0 else None) or (from_info(si, product['category']) if si else None)
    if chart:
        have = {norm_size(x) for x in product['sizes']}
        chart['rows'] = [r for r in chart['rows'] if r[0] in have] or chart['rows']
        NEW_CHARTS[str(pid)] = chart
    return product


def save_charts():
    if not NEW_CHARTS:
        return
    charts = json.load(open(CHARTS_FILE)) if os.path.exists(CHARTS_FILE) else {}
    charts.update(NEW_CHARTS)
    json.dump(charts, open(CHARTS_FILE, 'w'), separators=(',', ':'), ensure_ascii=False)
    print(f'Saved {len(NEW_CHARTS)} new size charts')


def main():
    picks = json.load(open(PICKS))
    cats = categories()
    refresh = '--refresh' in sys.argv
    old = {} if refresh or not os.path.exists(OUT) else {p['ae']['productId']: p for p in json.load(open(OUT))}
    print(f'Building {len(picks)} AliExpress products ({len(old)} already built, reused)...')
    products, failed = [], []
    for i, pick in enumerate(picks, 1):
        prev = old.get(str(pick['id']))
        if prev:
            # Keep built products, but pick up edited names, prices and text.
            for k in ('name', 'blurb', 'description', 'depts', 'afterDark', 'category', 'tags', 'attrs'):
                if k in pick:
                    prev[k] = clean_title(pick[k]) if k == 'name' else pick[k]
            if pick.get('price'):
                prev['price'] = pick['price']
            prev['details'] = (pick.get('details') or []) + ['Ships from our overseas partner']
            prev['code'] = f'FT-AE{i}'
            new_slug = f"{slug(prev['name'])}-{str(pick['id'])[-6:]}"
            if new_slug != prev['slug']:
                prev['oldSlugs'] = sorted(set(prev.get('oldSlugs', [])) | {prev['slug']})
                prev['slug'] = new_slug
            if pick.get('category') in cats:
                prev['line'] = cats[pick['category']][0]
            hide = set(pick.get('hide_photos') or [])
            prev['photos'] = [ph for ph in prev['photos'] if ph['src'] not in hide] or prev['photos']
            products.append(prev)
            continue
        try:
            built = build(pick, i, cats)
            hide = set(pick.get('hide_photos') or [])
            built['photos'] = [ph for ph in built['photos'] if ph['src'] not in hide] or built['photos']
            products.append(built)
        except (SystemExit, Exception) as e:  # one bad listing shouldn't stop the batch
            print(f'  skip {pick["id"]}: {e}')
            failed.append(str(pick['id']))
        with open(OUT, 'w') as f:  # save as we go
            json.dump(products, f, indent=1, ensure_ascii=False)
            f.write('\n')
    with open(OUT, 'w') as f:
        json.dump(products, f, indent=1, ensure_ascii=False)
        f.write('\n')
    if failed:
        # Drop picks that can't be built so the picks file matches the store.
        json.dump([p for p in picks if str(p['id']) not in failed], open(PICKS, 'w'), indent=1, ensure_ascii=False)
    save_charts()
    print(f'Wrote {len(products)} products to lib/ae-products.json ({len(failed)} skipped)')


if __name__ == '__main__':
    main()
