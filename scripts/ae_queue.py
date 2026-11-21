"""Work through the AliExpress import list saved on the server (filled by the browser button).

  python3 scripts/ae_queue.py status                  counts: waiting / added / skipped
  python3 scripts/ae_queue.py pull batch.json [N]     save the next N waiting items (default: all) for ae_import.py
  python3 scripts/ae_queue.py sync batch.json         after ae_catalog.py: mark each item added (it's in the store) or skipped

A batch, start to finish:
  python3 scripts/ae_queue.py pull /tmp/batch.json 150
  python3 scripts/ae_import.py /tmp/batch.json
  python3 scripts/ae_catalog.py
  (check the photos, remove anything risky from scripts/ae_picks.json, run ae_catalog.py again)
  python3 scripts/ae_queue.py sync /tmp/batch.json

Calls https://freakytimes.com/api/aliexpress/queue with the X-Admin-Token header (ADMIN_TOKEN; the cloud dev box injects it).
"""
import json
import os
import sys
import urllib.error
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = os.environ.get('QUEUE_URL', 'https://freakytimes.com/api/aliexpress/queue')
TOKEN = os.environ.get('ADMIN_TOKEN', 'proxy-injected')


def call(method, path='', body=None):
    req = urllib.request.Request(URL + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Content-Type': 'application/json', 'X-Admin-Token': TOKEN, 'User-Agent': 'Mozilla/5.0 (FreakyTimes import)'})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=60).read())
    except urllib.error.HTTPError as e:
        sys.exit(f'Queue {method} failed: HTTP {e.code} {e.read().decode()[:200]}')


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    cmd = sys.argv[1]
    if cmd == 'status':
        r = call('GET', '?limit=1')
        print(f"{r['pending']} waiting, {r['added']} added, {r['skipped']} skipped, {r['total']} total")
    elif cmd == 'pull':
        out = sys.argv[2]
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 5000
        r = call('GET', f'?status=pending&limit={limit}')
        json.dump([{'id': i['id'], 'title': i['title']} for i in r['items']], open(out, 'w'), indent=1, ensure_ascii=False)
        print(f"Saved {len(r['items'])} of {r['pending']} waiting to {out}")
    elif cmd == 'sync':
        batch = [str(i['id']) for i in json.load(open(sys.argv[2]))]
        live = {p['ae']['productId'] for p in json.load(open(os.path.join(REPO, 'lib', 'ae-products.json')))}
        added = [i for i in batch if i in live]
        skipped = [i for i in batch if i not in live]
        if added:
            call('PATCH', body={'ids': added, 'status': 'added'})
        if skipped:
            r = call('PATCH', body={'ids': skipped, 'status': 'skipped', 'note': 'filtered out'})
        else:
            r = call('GET', '?limit=1')
        print(f"Marked {len(added)} added, {len(skipped)} skipped. {r['pending']} still waiting.")
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
