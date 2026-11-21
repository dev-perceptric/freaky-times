"""Make web-sized copies of every store image on R2 and point the catalog data at them.

Product shots: 900px max, model photos: 900x1125, JPEG q80 (progressive).
Usage: python3 web_images.py shots   -> rewrites ck/site_shots.json srcs to site/web/...
       python3 web_images.py models  -> rewrites ck/site_models.json urls to site/web/...
"""
import io, json, sys, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

A = '8954ffc36634674f7163d2a03600e7fb'
PUB = 'https://pub-cf5b5b1875ae4569a8c701274e2ae2bf.r2.dev'


def web_copy(url):
    if '/site/web/' in url:
        return url
    key = url.replace(PUB + '/', '')
    new_key = 'site/web/' + key.split('site/', 1)[-1]
    im = Image.open(io.BytesIO(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 bk-web'}), timeout=120).read())).convert('RGB')
    im.thumbnail((1600, 2000), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=84, optimize=True, progressive=True)
    api = f'https://api.cloudflare.com/client/v4/accounts/{A}/r2/buckets/freaky-times/objects/{urllib.parse.quote(new_key)}'
    urllib.request.urlopen(urllib.request.Request(api, data=buf.getvalue(), method='PUT',
                           headers={'Authorization': 'Bearer dummy', 'Content-Type': 'image/jpeg'}), timeout=120)
    return f'{PUB}/{new_key}'


if __name__ == '__main__':
    which = sys.argv[1]
    path = f'/home/user/brand/ck/site_{which}.json'
    data = json.load(open(path))
    if which == 'shots':
        items = [s for p in data.values() for s in p['shots']]
        with ThreadPoolExecutor(6) as ex:
            urls = list(ex.map(lambda s: web_copy(s['src']), items))
        for s, u in zip(items, urls):
            s.setdefault('orig', s['src'])
            s['src'] = u
    else:
        keys = list(data)
        with ThreadPoolExecutor(6) as ex:
            urls = list(ex.map(lambda k: web_copy(data[k]), keys))
        data = dict(zip(keys, urls))
    json.dump(data, open(path, 'w'), indent=1)
    print(which, 'done', len(urls))
