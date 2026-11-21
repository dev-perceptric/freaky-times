"""Search CJ Dropshipping for products to add to scripts/cj_picks.json.

Run:  python3 scripts/cj_search.py "rolling tray"          (all warehouses)
      python3 scripts/cj_search.py "rolling tray" --us     (US warehouse stock only, faster shipping)
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

API = 'https://developers.cjdropshipping.com/api2.0/v1'
TOKEN = os.environ.get('CJ_ACCESS_TOKEN', 'proxy-injected')


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        sys.exit(__doc__)
    params = {'keyWord': ' '.join(args), 'page': 1, 'size': 30}
    if '--us' in sys.argv:
        params['countryCode'] = 'US'
    req = urllib.request.Request(f'{API}/product/listV2?{urllib.parse.urlencode(params)}', headers={'CJ-Access-Token': TOKEN})
    try:
        out = json.loads(urllib.request.urlopen(req, timeout=60).read().decode())
    except urllib.error.HTTPError as e:
        out = json.loads(e.read().decode() or '{}')
    if out.get('code') != 200:
        sys.exit(f"CJ said no: {out.get('code')} {out.get('message')}")
    rows = [p for c in (out.get('data') or {}).get('content') or [] for p in c.get('productList') or []]
    print(f"{'pid':<38} {'cost':>8}  {'stock':>6}  name")
    for p in rows:
        print(f"{p.get('id', ''):<38} {str(p.get('sellPrice', '')):>8}  {str(p.get('warehouseInventoryNum', '')):>6}  {(p.get('nameEn') or '')[:80]}")


if __name__ == '__main__':
    main()
