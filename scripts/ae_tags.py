"""Merge photo tags (from the tagging agents) into scripts/ae_picks.json as `attrs`.

Run:  python3 scripts/ae_tags.py TAG_DIR        (TAG_DIR has index.json + out-*.json, see the tagging brief)
Then: python3 scripts/ae_catalog.py

Each out-*.json is a list of {i, id, name?, sub, print, themes, cut, neck, sleeve, length, material, color, vibe, vibes, unisex,
category?}. Values not in lib/tag-vocab.json are dropped. `unisex` sets the departments; `category` moves the product.
"""
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ae_cats import new_category  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PICKS = os.path.join(REPO, 'scripts', 'ae_picks.json')
VOCAB = json.load(open(os.path.join(REPO, 'lib', 'tag-vocab.json')))

ids = lambda key: {x[0] for x in VOCAB[key]}
SUB = {cat: {x[0] for x in pairs} for cat, pairs in VOCAB['sub'].items()}
SUB_CAT = {s: cat for cat, subs in SUB.items() for s in subs}
ONE = {k: ids(k) for k in ('print', 'neck', 'sleeve', 'length', 'color', 'vibe')}
MANY = {'themes': ids('themes'), 'cut': ids('cut'), 'material': ids('material'), 'vibes': ids('vibe')}


def clean(t, category):
    a, bad = {}, []
    cat = t.get('category') if t.get('category') in SUB else category
    sub = t.get('sub')
    if sub in SUB.get(cat, ()):
        a['sub'] = sub
    elif sub in SUB_CAT and not t.get('category'):
        cat, a['sub'] = SUB_CAT[sub], sub  # the sub-type says which category it really is
    elif sub:
        bad.append(f'sub={sub}')
    for k, allowed in ONE.items():
        v = t.get(k)
        if v in allowed and v != 'none':
            a[k] = v
        elif v and v != 'none':
            bad.append(f'{k}={v}')
    for k, allowed in MANY.items():
        vals = [v for v in (t.get(k) or []) if v in allowed]
        bad += [f'{k}={v}' for v in (t.get(k) or []) if v not in allowed]
        if k == 'vibes':
            vals = [v for v in vals if v != a.get('vibe')]
        if vals:
            a[k] = list(dict.fromkeys(vals))
    a['unisex'] = bool(t.get('unisex'))
    return a, cat, bad


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    d = sys.argv[1]
    index = {x['i']: x for x in json.load(open(os.path.join(d, 'index.json')))}
    tags = {}
    for f in sorted(glob.glob(os.path.join(d, 'out-*.json'))):
        for t in json.load(open(f)):
            row = index.get(t.get('i'))
            if row and str(t.get('id', row['id'])) == str(row['id']):
                tags[str(row['id'])] = t
            else:
                print(f'  {os.path.basename(f)}: index {t.get("i")} does not match its id, skipped')
    picks = json.load(open(PICKS))
    used = {p['name'] for p in picks}
    done = moved = renamed = 0
    bad_total = []
    for p in picks:
        t = tags.get(str(p['id']))
        if not t:
            continue
        a, cat, bad = clean(t, p['category'])
        bad_total += bad
        if cat != p['category']:
            moved += 1
            p['category'] = cat
        p['attrs'] = a
        name = re.sub(r'\s+', ' ', (t.get('name') or '').strip())
        # New names from the photos, if they end in a product type that fits the category.
        if name and name != p['name'] and new_category(name, p['category']) == p['category']:
            cand, i = name, 2
            while cand in used:
                cand = f'{name} {i}'; i += 1
            used.discard(p['name']); used.add(cand)
            p['name'] = cand
            renamed += 1
        if p['category'] != 'extras':
            p['depts'] = ['women', 'men'] if a['unisex'] else ['women']
        done += 1
    with open(PICKS, 'w') as f:
        json.dump(picks, f, indent=1, ensure_ascii=False)
        f.write('\n')
    missing = [p['id'] for p in picks if str(p['id']) not in tags]
    print(f'Tagged {done} of {len(picks)} picks, renamed {renamed}, moved {moved} to a new category, {len(missing)} without tags.')
    if bad_total:
        print(f'{len(bad_total)} unknown values dropped, e.g. {bad_total[:8]}')


if __name__ == '__main__':
    main()
