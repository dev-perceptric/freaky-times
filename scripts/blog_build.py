#!/usr/bin/env python3
"""Build the blog: content/blog/*.md -> lib/blog-posts.json (read by app/blog).

Run after adding or editing an article:
    pip install markdown
    python3 scripts/blog_build.py

Each article is Markdown with front matter (see any file in content/blog). Editor notes are left out of the live
page: [[POLL: ...]], [[AFF: ...]], [CITE: ...], [READER QUOTE: ...], [MEDICAL REVIEW]. [[GEAR BOX: a | b]] becomes a
plain "Gear for this" list. Links to /position/... and /define/... stay plain text until those pages exist, and
images that are not in public/blog/images are dropped.
"""
import glob, html, json, os, re
import markdown

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'content', 'blog')
IMG_DIR = os.path.join(ROOT, 'public', 'blog', 'images')
OUT = os.path.join(ROOT, 'lib', 'blog-posts.json')
IMGS = set(os.listdir(IMG_DIR)) if os.path.isdir(IMG_DIR) else set()


def front(text):
    m = re.match(r'^---\n(.*?)\n---\n', text, re.S)
    meta = {}
    for line in m.group(1).splitlines():
        if line.strip().startswith('#') or ':' not in line:
            continue
        k, v = line.split(':', 1)
        v = re.sub(r'\s+#.*$', '', v).strip()
        if v.startswith('['):
            v = [x.strip().strip('"\'') for x in v.strip('[]').split(',') if x.strip()]
        else:
            v = v.strip('"\'')
        meta[k.strip()] = v
    return meta, text[m.end():]


def clean(body, slugs, hero):
    out = []
    for line in body.splitlines():
        s = line.strip()
        if s.startswith('[[POLL:') or re.match(r'^#{2,4}\s.*\bpoll\b', s, re.I):
            continue
        if s.startswith('*FreakyTimes may earn a commission'):
            continue
        if re.match(r'^\[See the full .*\]\(/position/[^)]*\)\s*$', s):
            continue
        out.append(line)
    b = '\n'.join(out)
    # sentences that point at the removed poll
    b = re.sub(r'[^.!?\n]*\]\(#reader-poll\)[^.!?\n]*[.!?]?', '', b)
    b = re.sub(r'\[\[GEAR BOX:\s*(.*?)\]\]', lambda m: '\n<div class="blog-gear"><p class="blog-gear-title">Gear for this</p><ul>'
               + ''.join(f'<li>{html.escape(i.strip())}</li>' for i in m.group(1).split('|') if i.strip()) + '</ul></div>\n', b)
    b = re.sub(r'\s?\[\[AFF:[^\]]*\]\]', '', b)
    b = re.sub(r'\s?\[(CITE|READER QUOTE)(:[^\]]*)?\]', '', b)
    b = re.sub(r'\s?\[MEDICAL REVIEW\]', '', b)
    # images: keep only files we have; drop the hero (shown at the top of the page)
    def img(m):
        name = m.group(2)
        if name == hero or name not in IMGS:
            return ''
        return f'![{m.group(1)}](/blog/images/{name})'
    b = re.sub(r'!\[([^\]]*)\]\(/images/([^)\s]+)\)', img, b)
    # links
    b = re.sub(r'\[([^\]]+)\]\(/(?:position|define)/[^)]*\)', r'\1', b)
    b = re.sub(r'\[([^\]]+)\]\(/([a-z0-9-]+)/?(#[^)]*)?\)',
               lambda m: f'[{m.group(1)}](/blog/{m.group(2)}{m.group(3) or ""})' if m.group(2) in slugs else m.group(1), b)
    md = markdown.Markdown(extensions=['tables', 'toc', 'sane_lists'])
    h = md.convert(b)
    h = re.sub(r'<p>\s*</p>|<blockquote>\s*</blockquote>|<li>\s*</li>', '', h)
    h = re.sub(r'<(h[23]) id="[^"]*">[^<]*</\1>\s*(?=<h[2]|$)', '', h)  # headings left with nothing under them
    h = h.replace('<table>', '<div class="blog-table"><table>').replace('</table>', '</table></div>')
    h = h.replace('<img ', '<img loading="lazy" decoding="async" ')
    faq = []
    fm = re.search(r'<h2 id="faq">FAQ</h2>(.*?)(?=<h2|$)', h, re.S)
    if fm:
        for q, a in re.findall(r'<h3[^>]*>(.*?)</h3>\s*(.*?)(?=<h3|$)', fm.group(1), re.S):
            faq.append({'q': html.unescape(re.sub('<[^>]+>', '', q)).strip(), 'a': html.unescape(re.sub('<[^>]+>', '', a)).strip()})
    return h, faq


def main():
    files = sorted(glob.glob(os.path.join(SRC, '*.md')))
    metas = []
    for f in files:
        meta, body = front(open(f, encoding='utf-8').read())
        metas.append((meta, body))
    slugs = {m['slug'] for m, _ in metas}
    posts = []
    for meta, body in metas:
        hero = os.path.basename(meta.get('hero_image', ''))
        h, faq = clean(body, slugs, hero)
        words = len(re.sub('<[^>]+>', ' ', h).split())
        posts.append({
            'slug': meta['slug'],
            'title': meta['title'],
            'seoTitle': re.sub(r'\s*\|\s*FreakyTimes\s*$', '', meta.get('seo_title', meta['title'])),
            'description': meta.get('meta_description', ''),
            'category': meta.get('category', 'Sex Tips'),
            'tags': meta.get('tags', []),
            'heat': meta.get('heat_level', ''),
            'readingTime': f'{max(1, round(words / 230))} min',
            'updated': meta.get('last_updated', ''),
            'hero': f'/blog/images/{hero}' if hero in IMGS else '',
            'pillar': meta['slug'] == 'best-sex-positions-for-women',
            'faq': faq,
            'html': h,
        })
    posts.sort(key=lambda p: (not p['pillar'], p['title']))
    json.dump(posts, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
    left = [(p['slug'], m) for p in posts for m in re.findall(r'\[\[[^\]]*\]\]|\[(?:CITE|READER QUOTE|MEDICAL REVIEW)[^\]]*\]', p['html'])]
    print(f'{len(posts)} posts -> {os.path.relpath(OUT, ROOT)}; leftover markers: {len(left)}')
    for s, m in left[:10]:
        print('  ', s, m)


if __name__ == '__main__':
    main()
