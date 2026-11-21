"""Search AliExpress (best sellers first, shipping to the US) for products to add to scripts/ae_picks.json.

Run:  python3 scripts/ae_search.py "lace lingerie set"
      python3 scripts/ae_search.py "lace lingerie set" --pages 3 --json out.json
      python3 scripts/ae_search.py "crop" --category 200000778     (inside one AliExpress category)
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ae_catalog import admin, arr  # noqa: E402


def search(q, pages=1, category=None):
    rows = []
    for page in range(1, pages + 1):
        resp = admin('aliexpress.ds.text.search', {'keyWord': q, 'local': 'en_US', 'countryCode': 'US', 'currency': 'USD',
                                                    'sortBy': 'orders,desc', 'pageSize': 50, 'pageIndex': page,
                                                    **({'categoryId': category} if category else {})})
        data = (resp.get('aliexpress_ds_text_search_response') or resp).get('data') or {}
        got = arr(data.get('products'))
        rows += got
        if not got:
            break
    return rows


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        sys.exit(__doc__)
    pages = int(sys.argv[sys.argv.index('--pages') + 1]) if '--pages' in sys.argv else 1
    category = sys.argv[sys.argv.index('--category') + 1] if '--category' in sys.argv else None
    for flag in ('--pages', '--category'):
        if flag in sys.argv:
            args = [a for a in args if a != sys.argv[sys.argv.index(flag) + 1]]
    if '--json' in sys.argv:
        args = [a for a in args if a != sys.argv[sys.argv.index('--json') + 1]]
    rows = search(' '.join(args), pages, category)
    print(f"{'id':<18} {'price':>7} {'orders':>7} {'rating':>7}  title")
    for p in rows:
        print(f"{p.get('itemId', ''):<18} {p.get('targetSalePrice', p.get('salePrice', '')):>7} {p.get('orders', ''):>7} {p.get('evaluateRate', ''):>7}  {(p.get('title') or '')[:80]}")
    if '--json' in sys.argv:
        json.dump(rows, open(sys.argv[sys.argv.index('--json') + 1], 'w'), indent=1)


if __name__ == '__main__':
    main()
