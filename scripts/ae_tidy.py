"""Clean up a freshly built AliExpress batch. Run after ae_catalog.py, before the photo check.

  python3 scripts/ae_tidy.py titles.json [--from N]

titles.json is the batch file from ae_queue.py pull ([{"id", "title"}]). --from N only touches
products from position N on in lib/ae-products.json (the new batch).

  - Drops multi-pack options (anything over 1.5x the typical option's cost) and reprices.
  - Drops real fur and anything still over MAX_PRICE (default $90).
  - Renames generic or numbered names ("Baby Tee 3") using more words from the title, then color.
"""
import json
import math
import os
import re
import statistics
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ae_import as A  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRODUCTS = os.path.join(REPO, 'lib', 'ae-products.json')
PICKS = os.path.join(REPO, 'scripts', 'ae_picks.json')
MAX_PRICE = float(os.environ.get('MAX_PRICE', '90'))
REAL_FUR = re.compile(r'real fur|genuine|fox fur|mink|raccoon|rabbit fur coat', re.I)

EXTRA_WORDS = [
    ('black', 'Black'), ('white', 'White'), ('pink', 'Pink'), ('red', 'Red'), ('grey', 'Grey'), ('gray', 'Grey'), ('brown', 'Brown'),
    ('purple', 'Purple'), ('blue', 'Blue'), ('green', 'Green'), ('denim', 'Denim'), ('leather', 'Leather'), ('velvet', 'Velvet'),
    ('satin', 'Satin'), ('chiffon', 'Chiffon'), ('pleated', 'Pleated'), ('baggy', 'Baggy'), ('wide leg', 'Wide Leg'), ('flare', 'Flare'),
    ('mini', 'Mini'), ('maxi', 'Maxi'), ('midi', 'Midi'), ('cargo', 'Cargo'), ('distressed', 'Distressed'), ('ripped', 'Ripped'),
    ('oversized', 'Oversized'), ('hooded', 'Hooded'), ('platform', 'Platform'), ('chunky', 'Chunky'), ('low waist', 'Low-Rise'),
    ('low rise', 'Low-Rise'), ('high waist', 'High-Waist'), ('zipper', 'Zip'), ('button', 'Button'), ('studded', 'Studded'),
    ('rivet', 'Studded'), ('chain', 'Chain'), ('buckle', 'Buckle'), ('slip', 'Slip'), ('wrap', 'Wrap'), ('puff', 'Puff Sleeve'),
    ('bat', 'Bat'), ('moon', 'Moon'), ('harajuku', 'Harajuku'), ('preppy', 'Preppy'), ('camo', 'Camo'), ('checkered', 'Checkered'),
    ('graffiti', 'Graffiti'),
]
GENERIC = {'Lingerie Set', 'Three Piece Lingerie Set', 'Bodysuit', 'Teddy', 'Babydoll', 'Chemise', 'Corset', 'Bustier', 'Bra', 'Bralette',
           'Panties', 'Thong', 'G-String', 'Garter Belt', 'Harness', 'Robe', 'Kimono', 'Pajama Set', 'Nightgown', 'Slip Dress', 'Thigh Highs',
           'Tights', 'Bodystocking', 'Costume', 'Dress', 'Two Piece Set', 'Bikini', 'Choker', 'Collar', 'Body Chain', 'Mask', 'Gloves', 'Pasties'}


def tier(cost):
    return 2.5 if cost < 12 else 2.0 if cost < 25 else 1.8


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    titles = {str(x['id']): x['title'] for x in json.load(open(sys.argv[1]))}
    start = int(sys.argv[sys.argv.index('--from') + 1]) if '--from' in sys.argv else 0
    prods = json.load(open(PRODUCTS))
    picks = json.load(open(PICKS))
    pick_by = {str(p['id']): p for p in picks}

    drop, repriced = set(), 0
    keep_all = '--keep-all' in sys.argv  # reprice and rename only, remove nothing
    for p in prods[start:]:
        pid = p['ae']['productId']
        if REAL_FUR.search(titles.get(pid, '')) and not keep_all:
            drop.add(pid)
            continue
        costs = [v['cost'] for v in p['ae']['variants']]
        med = statistics.median(costs)
        keep = [v for v in p['ae']['variants'] if v['cost'] <= med * 1.5 + 1]
        if len(keep) < len(costs):
            p['ae']['variants'] = keep
            p['colors'] = [c for c in p['colors'] if any(v['color'] == c['name'] for v in keep)]
            p['sizes'] = [s for s in p['sizes'] if any(v['size'] == s for v in keep)]
            p['photos'] = [ph for ph in p['photos'] if ph['color'] == '*' or any(c['name'] == ph['color'] for c in p['colors'])]
            top = max(v['cost'] for v in keep)
            new = math.ceil(top * tier(top) + 2) - 0.01
            if new < p['price']:
                p['price'] = new
                if pid in pick_by:
                    pick_by[pid]['price'] = new
                repriced += 1
        if p['price'] > MAX_PRICE and not keep_all:
            drop.add(pid)

    # Names: more title words first, then the first real color, then a short style number.
    A.WORDS = A.WORDS + [w for w in EXTRA_WORDS if w[1] not in [x[1] for x in A.WORDS]]
    is_generic = lambda n: bool(re.search(r'\s\d+$', n)) or n in GENERIC  # noqa: E731
    used = {p['name'] for p in picks if not is_generic(p['name'])}
    renamed = 0
    for p in prods[start:]:
        pid = p['ae']['productId']
        if pid in drop or not is_generic(p['name']):
            continue
        base = re.sub(r'\s\d+$', '', p['name'])
        word = base
        for _, label in A.WORDS:
            word = word.replace(label + ' ', '')
        name = A.name_for(titles.get(pid, ''), word.strip() or base, used) if pid in titles else base
        if re.search(r'\s\d+$', name) or name in used:
            colors = [c['name'] for c in p['colors'] if c['name'] != 'Default' and not c['name'].startswith('Design') and len(c['name']) < 14]
            options = [f'{c} {base}' for c in colors] + [f'{base} No. {pid[-3:]}']
            name = next((o for o in options if o not in used), name)
        used.add(name)
        if name != p['name']:
            p['name'] = name
            if pid in pick_by:
                pick_by[pid]['name'] = name
            renamed += 1
    for p in prods:
        p['name'] = p['name'].replace('Cropped Crop Tee', 'Crop Tee')

    prods = [p for p in prods if p['ae']['productId'] not in drop]
    picks = [p for p in picks if str(p['id']) not in drop]
    json.dump(prods, open(PRODUCTS, 'w'), indent=1, ensure_ascii=False)
    json.dump(picks, open(PICKS, 'w'), indent=1, ensure_ascii=False)
    print(f'Repriced {repriced}, dropped {len(drop)} (real fur or over ${MAX_PRICE:.0f}), renamed {renamed}. {len(prods)} products.')


if __name__ == '__main__':
    main()
