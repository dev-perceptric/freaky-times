"""Turn AliExpress size data into lib/size-charts.json (one chart per product, measurements in cm).

Input: a raw.jsonl from the size pull, one {"id", "table"?, "size_info"?} per line.
  table      the seller's "[xlmodel]-[size]" table from the description (all columns, cm + inch)
  size_info  AliExpress's per-size key measurement (one number per size; shoes may add country sizes)
Run:  python3 scripts/size_charts.py RAW.jsonl
"""
import html, json, os, re, statistics, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, 'lib', 'size-charts.json')
FIX = {'chset': 'Chest', 'bust': 'Bust', 'hips': 'Hip', 'hip': 'Hip', 'pant length': 'Length', 'pants length': 'Length', 'sleeve length': 'Sleeve'}
TOPS = {'baby-tees', 'crop-tees', 'oversized-tees', 'long-sleeves', 'camis-tanks', 'halter-tube', 'corsets-bodysuits', 'blouses',
        'hoodies', 'sweaters', 'cardigans', 'jackets', 'dresses', 'sets', 'bikinis'}
BOTTOMS = {'jeans', 'pants', 'shorts', 'skirts'}


def norm_size(s):
    s = re.sub(r'[（(].*?[)）]', '', str(s)).strip().upper().replace('ASIAN ', '')
    return {'XXL': '2XL', 'XXXL': '3XL', 'XXXXL': '4XL', 'XXXXXL': '5XL'}.get(s, s)


def col_name(c):
    c = re.sub(r'\s+', ' ', c).strip()
    c = re.sub(r'\b(cm|inch|in)\b', '', c, flags=re.I).strip(' ()/')
    return FIX.get(c.lower(), c.title())


def num(v):
    v = v.strip().replace('～', '-').replace('~', '-').replace('–', '-')
    return v if re.fullmatch(r'\d+(\.\d+)?(-\d+(\.\d+)?)?', v) else None


def from_table(t):
    rows = []
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', t, re.S):
        rows.append([html.unescape(re.sub(r'<[^>]+>', '', c)).strip() for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', tr, re.S)])
    cols, data, in_cm = None, [], True
    for r in rows:
        if not r:
            continue
        head = r[0].lower()
        if 'inch' in head and len(r) == 1:
            in_cm = False
        if not in_cm:
            continue
        if head == 'size' and len(r) > 1:
            cols = [col_name(c) for c in r[1:]]
            continue
        if cols and len(r) == len(cols) + 1:
            vals = [num(v) for v in r[1:]]
            if all(v is not None for v in vals):
                data.append([norm_size(r[0])] + vals)
    if not cols or len(data) < 2:
        return None
    return {'cols': cols, 'rows': data, 'src': 'table'}


def from_info(si, category):
    try:
        lst = json.loads(si).get('sizeInfoList') or []
    except Exception:
        return None
    rows = []
    for x in lst:
        cm = (x.get('length') or {}).get('cm')
        if cm and num(str(cm)):
            rows.append([norm_size(x.get('size', '')), num(str(cm))])
    if len(rows) < 2:
        return None
    first = [float(r[1].split('-')[0]) for r in rows]
    med = statistics.median(first)
    if category == 'shoes':
        label = 'Foot length'
    elif category in BOTTOMS:
        label = 'Waist' if min(first) < 82 else 'Hip'
    elif category in TOPS:
        label = 'Bust'
    elif category == 'hats':
        label = 'Head'
    else:
        label = 'Size'
    out = {'cols': [label], 'rows': rows, 'src': 'info'}
    conv = {}
    for x in lst:
        m = x.get('countrySizeMap') or {}
        if isinstance(m, dict) and m:
            conv[norm_size(x.get('size', ''))] = {k: str(v) for k, v in m.items() if v not in (None, '')}
    if conv:
        out['countries'] = conv
    return out


def main():
    raw = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]
    products = {p['ae']['productId']: p for p in json.load(open(os.path.join(REPO, 'lib', 'ae-products.json')))}
    charts = json.load(open(OUT)) if os.path.exists(OUT) and '--fresh' not in sys.argv else {}
    added = 0
    for r in raw:
        p = products.get(r['id'])
        if not p or 'error' in r:
            continue
        chart = (from_table(r['table']) if r.get('table') else None) or (from_info(r['size_info'], p['category']) if r.get('size_info') else None)
        if not chart:
            continue
        have = {norm_size(s) for s in p['sizes']}
        keep = [row for row in chart['rows'] if row[0] in have]
        if keep:
            chart['rows'] = keep
        charts[r['id']] = chart
        added += 1
    json.dump(charts, open(OUT, 'w'), separators=(',', ':'), ensure_ascii=False)
    print(f'{added} charts from {len(raw)} records, {len(charts)} in lib/size-charts.json')


if __name__ == '__main__':
    main()
