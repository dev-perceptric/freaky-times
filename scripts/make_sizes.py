"""Make ready-made WebP sizes of every product photo on R2, so the site never resizes images itself.

For each photo this writes w/<key without extension>-<width>.webp at 200, 480, 828 and 1200 px wide
(never larger than the original), then points the catalog at https://pub-cf5b5b1875ae4569a8c701274e2ae2bf.r2.dev/<key>.
lib/img.ts sees that host and links straight to the ready-made files, served from Cloudflare's cache.
Photos still on AliExpress's CDN are copied into R2 first, under ext/alicdn/.

Usage:
  python3 scripts/make_sizes.py              # every photo in lib/ae-products.json and lib/cj-products.json
  python3 scripts/make_sizes.py --limit 50   # try a few first
Safe to stop and run again: photos already on pub-cf5b5b1875ae4569a8c701274e2ae2bf.r2.dev are skipped.
cj_catalog.upload() calls make_sizes() too, so new imports get their sizes right away.
"""
import io
import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

from PIL import Image, ImageOps

ACCOUNT = '8954ffc36634674f7163d2a03600e7fb'
BUCKET = 'freaky-times'
TOKEN = os.environ.get('CLOUDFLARE_API_TOKEN', 'dummy')
PUB = 'https://pub-cf5b5b1875ae4569a8c701274e2ae2bf.r2.dev'
IMG = 'https://pub-cf5b5b1875ae4569a8c701274e2ae2bf.r2.dev'
# Must match READY in lib/img.ts.
SIZES = (200, 480, 828, 1200)
QUALITY = 75
CACHE = 'public, max-age=31536000, immutable'

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = [os.path.join(REPO, 'lib', f) for f in ('ae-products.json', 'cj-products.json')]
API = f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/r2/buckets/{BUCKET}/objects/'


def key_for(src):
    """R2 key for a photo URL, or None if it is not a photo we can copy."""
    for base in (IMG, PUB):
        if src.startswith(base + '/'):
            return src[len(base) + 1:]
    u = urllib.parse.urlparse(src)
    if u.netloc.endswith('alicdn.com') and u.path:
        return 'ext/alicdn' + u.path
    return None


def sized_key(key, w):
    """w/cj/ae-1/abc.jpg -> w/cj/ae-1/abc-480.webp (same rule as lib/img.ts)."""
    return f"w/{re.sub(r'\.[A-Za-z]+$', '', key)}-{w}.webp"


def _request(url, data=None, method='GET', headers=None, timeout=60):
    """HTTP call with retries for rate limits, server errors and dropped connections."""
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, data=data, method=method, headers={'User-Agent': 'Mozilla/5.0 bk-sizes', **(headers or {})})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code not in (408, 429, 500, 502, 503, 504) or attempt == 5:
                raise
            wait = int(e.headers.get('Retry-After') or 0) or 2 ** attempt
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            if attempt == 5:
                raise
            wait = 2 ** attempt
        time.sleep(wait)


def put(key, body, ctype):
    _request(API + urllib.parse.quote(key), data=body, method='PUT', timeout=120,
             headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': ctype, 'Cache-Control': CACHE})


def fetch(src, key):
    """Download the original: public URL first, then the R2 API if the public URL is slow or limited."""
    try:
        return _request(src if not src.startswith(IMG) else f'{PUB}/{key}')
    except Exception:  # noqa: BLE001
        if src.startswith((PUB, IMG)):
            return _request(API + urllib.parse.quote(key), headers={'Authorization': f'Bearer {TOKEN}'})
        raise


def make_sizes(key, original):
    """Write the WebP sizes for one photo. `original` is the image file's bytes."""
    im = ImageOps.exif_transpose(Image.open(io.BytesIO(original)))
    alpha = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
    im = im.convert('RGBA' if alpha else 'RGB')
    for w in SIZES:
        copy = im.copy()
        if copy.width > w:
            copy = copy.resize((w, round(copy.height * w / copy.width)), Image.LANCZOS)
        buf = io.BytesIO()
        copy.save(buf, 'WEBP', quality=QUALITY, method=4)
        put(sized_key(key, w), buf.getvalue(), 'image/webp')


def process(src):
    """Make sizes for one photo URL and return its new URL on pub-cf5b5b1875ae4569a8c701274e2ae2bf.r2.dev."""
    key = key_for(src)
    if not key:
        raise ValueError('not an R2 or AliExpress photo')
    original = fetch(src, key)
    if not src.startswith((PUB, IMG)):
        ext = os.path.splitext(key)[1].lower()
        put(key, original, {'.png': 'image/png', '.webp': 'image/webp'}.get(ext, 'image/jpeg'))
    make_sizes(key, original)
    return f'{IMG}/{key}'


def photo_urls(node, out):
    """Every photo URL in the catalog: photos[].src and colors[].image."""
    if isinstance(node, dict):
        for k, v in node.items():
            if k in ('src', 'image') and isinstance(v, str) and v.startswith('http'):
                out.append(v)
            else:
                photo_urls(v, out)
    elif isinstance(node, list):
        for v in node:
            photo_urls(v, out)
    return out


def rewrite(node, done):
    if isinstance(node, dict):
        for k, v in node.items():
            if k in ('src', 'image') and isinstance(v, str) and v in done:
                node[k] = done[v]
            else:
                rewrite(v, done)
    elif isinstance(node, list):
        for v in node:
            rewrite(v, done)


def save(catalogs, done):
    for path, data in catalogs.items():
        rewrite(data, done)
        tmp = path + '.tmp'
        with open(tmp, 'w') as f:
            json.dump(data, f, indent=1, ensure_ascii=False)
        os.replace(tmp, path)


def main():
    limit = int(sys.argv[sys.argv.index('--limit') + 1]) if '--limit' in sys.argv else None
    workers = int(sys.argv[sys.argv.index('--workers') + 1]) if '--workers' in sys.argv else 12
    catalogs = {p: json.load(open(p)) for p in FILES if os.path.exists(p)}
    todo = [u for u in dict.fromkeys(u for d in catalogs.values() for u in photo_urls(d, [])) if not u.startswith(IMG) and key_for(u)]
    if limit:
        todo = todo[:limit]
    print(f'{len(todo)} photos to size ({len(SIZES)} WebP files each), {workers} at a time')
    done, failed, lock, start = {}, {}, threading.Lock(), time.time()
    with ThreadPoolExecutor(workers) as ex:
        jobs = {ex.submit(process, u): u for u in todo}
        for n, job in enumerate(as_completed(jobs), 1):
            src = jobs[job]
            try:
                done[src] = job.result()
            except Exception as e:  # noqa: BLE001
                failed[src] = str(e)[:200]
            if n % 100 == 0 or n == len(todo):
                rate = n / (time.time() - start)
                print(f'  {n}/{len(todo)} ({len(failed)} failed), {rate:.1f}/s, ~{(len(todo) - n) / rate / 60:.0f} min left', flush=True)
            if n % 2000 == 0:
                with lock:
                    save(catalogs, done)
    save(catalogs, done)
    print(f'Done: {len(done)} sized, {len(failed)} failed')
    for src, err in list(failed.items())[:20]:
        print(f'  failed {src}: {err}')


if __name__ == '__main__':
    main()
