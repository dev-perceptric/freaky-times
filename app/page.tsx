import Link from 'next/link';
import { COLLECTIONS, SHOP, collectionHref, coverOf, getCollection, mixed, productsIn } from '@/lib/catalog';
import { RETURN_DAYS, WELCOME_PERCENT } from '@/lib/site';
import ProductCard from '@/components/ProductCard';
import Slideshow, { type Slide } from '@/components/Slideshow';
import Faq from '@/components/Faq';
import Newsletter from '@/components/Newsletter';
import Rail from '@/components/Rail';
import { cardImg, heroImg, tileImg } from '@/lib/img';
import { findAnyProduct, type Product } from '@/lib/products';
import featured from '@/lib/featured.json';

const col = (slug: string) => getCollection(slug)!;
/** Photos from a collection, skipping a few so tiles don't repeat each other. */
function photos(slug: string, n: number, skip = 0) {
  return productsIn(col(slug)).filter((p) => p.photos?.length).slice(skip, skip + n).map((p) => p.photos![0].src);
}

type Featured = { slides?: Record<string, string[]>; tiles?: Record<string, string[]>; circles?: Record<string, string[]>; rows?: Record<string, string[]>; themes?: Record<string, string[]>; new?: string[]; trending?: string[]; look?: { hero: string; photo?: number; items: string[] } };
const F = featured as Featured;
/** Hand-picked products for a homepage spot (lib/featured.json), skipping any already shown. */
function picked(slugs: string[] | undefined, n: number, used?: Set<string>): Product[] {
  const out: Product[] = [];
  for (const s of slugs ?? []) {
    const p = findAnyProduct(s);
    if (!p?.photos?.length || used?.has(p.slug) || out.includes(p)) continue;
    out.push(p);
    if (out.length === n) break;
  }
  return out;
}

const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export default function Home() {
  // Nothing appears twice on the page: slides, then tiles, then rows claim products in that order.
  const used = new Set<string>();
  const claim = (list: Product[]) => { list.forEach((p) => used.add(p.slug)); return list; };
  const slideImgs = (key: string, fallback: () => string[]) => {
    const list = claim(picked(F.slides?.[key], 3, used));
    return list.length === 3 ? list.map((p) => p.photos![0].src) : fallback();
  };
  // Sections follow what the store actually has: the biggest categories lead the page.
  const ranked = COLLECTIONS.filter((c) => !c.parent && !['themes', 'new', 'hidden'].includes(c.group))
    .map((c) => ({ c, n: productsIn(c).filter((p) => p.photos?.length).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).map((x) => x.c);
  const SLIDE_COPY: Record<string, [string, string]> = {
    'lingerie-sets': ['New lingerie every week', 'Lingerie Sets'], 'bodysuits-teddies': ['One piece, whole mood', 'Bodysuits & Teddies'],
    'babydolls-chemises': ['Short, sheer and flowy', 'Babydolls'], 'secretary-costumes': ['Office hours are over', 'Secretary Costumes'],
    'maid-costumes': ['At your service', 'Maid Costumes'], 'bunny-costumes': ['Ears, tails and attitude', 'Bunny Costumes'],
    'nurse-costumes': ['The doctor will see you now', 'Nurse Costumes'], 'costumes-roleplay': ['Pick a character', 'Costumes & Roleplay'],
  };
  const slides: Slide[] = ranked.slice(0, 4).map((c, n) => {
    const [eyebrow, title] = SLIDE_COPY[c.slug] ?? ['Lingerie for freaky times', c.title];
    return { eyebrow: n === 0 ? 'New drops every week' : eyebrow, title: n === 0 ? 'Lingerie for Freaky Times' : title, cta: `Shop ${c.title.replace(/ Costumes$/, '')}`, href: collectionHref(c.slug),
      ...(n === 0 ? { alt: { cta: 'Shop All', href: collectionHref('all') } } : {}), images: slideImgs(c.slug, () => photos(c.slug, 3, n * 3)) };
  }).filter((s) => s.images.length === 3);

  const big = ranked.slice(0, 3).map((c, n) => ({ slug: c.slug, label: c.title, skip: 6 + n }))
    .map((b) => ({ ...b, img: claim(picked(F.tiles?.[b.slug], 1, used))[0]?.photos![0].src ?? coverOf(productsIn(col(b.slug)), b.skip) }));

  // [collection, label, which product photo to use]
  const cats: [string, string, number][] = ranked.slice(0, 12).map((c, n) => [c.slug, c.title.replace(/ Costumes$/, ''), (n % 4) + 1]);

  // One row per category: hand-picked first, topped up from the collection.
  const row = (slug: string, n = 4) => {
    const list = picked(F.rows?.[slug], n, used);
    for (const p of productsIn(col(slug))) { if (list.length >= n) break; if (p.photos?.length && !used.has(p.slug) && !list.includes(p)) list.push(p); }
    claim(list);
    return { slug, title: col(slug).title, list };
  };
  // "Get the look": one big photo and four pieces from other categories that go with it.
  const lookHero = F.look ? findAnyProduct(F.look.hero) : undefined;
  const lookItems = lookHero?.photos?.length ? claim(picked(F.look?.items, 4, used)) : [];
  if (lookHero && lookItems.length === 4) used.add(lookHero.slug);

  // Hand-picked best of the store, or the trending list when nothing is hand-picked yet.
  const trendingPicked = claim(picked(F.trending, 10, used));
  const trending = trendingPicked.length >= 4 ? trendingPicked : claim(productsIn(col('trending')).filter((p) => p.photos?.length && !used.has(p.slug)).slice(0, 10));

  const rowsA = ranked.slice(0, 3).map((c) => row(c.slug)).filter((r) => r.list.length === 4);
  const rowsB = ranked.slice(3, 6).map((c) => row(c.slug, 8)).filter((r) => r.list.length >= 4);
  const rowsC = ranked.slice(6, 9).map((c) => row(c.slug)).filter((r) => r.list.length === 4);
  const Rows = ({ rows }: { rows: typeof rowsA }) => (
    <>
      {rows.map((r, n) => (
        <section key={r.slug} className="sec cat-row" style={n ? { paddingTop: 0 } : undefined}>
          <div className="wrap">
            <div className="sec-head"><h2>{r.title}</h2><Link href={collectionHref(r.slug)} className="link">Shop all</Link></div>
            <div className="grid">{r.list.map((p) => <ProductCard key={p.slug} product={p} />)}</div>
          </div>
        </section>
      ))}
    </>
  );

  const Rails = ({ rows }: { rows: typeof rowsB }) => (
    <>
      {rows.map((r, n) => (
        <section key={r.slug} className="sec" style={n ? { paddingTop: 0 } : undefined}>
          <Rail title={r.title} href={collectionHref(r.slug)}>
            {r.list.map((p) => <ProductCard key={p.slug} product={p} />)}
          </Rail>
        </section>
      ))}
    </>
  );

  const themes = ['lace-lingerie', 'sheer-lingerie', 'satin-silk', 'leather-latex', 'strappy-lingerie', 'cute-lingerie', 'bridal-lingerie', 'goth-lingerie',
    'plus-size-lingerie', 'red-lingerie', 'black-lingerie'].filter((s) => productsIn(col(s)).length >= 4);

  // 4 hand-picked new pieces, then a mix of other recent categories so one batch doesn't take over the row.
  const newPicked = picked(F.new, 4, used);
  const newIn = [...newPicked, ...mixed(productsIn(col('new-in')).slice(0, 600)).filter((p) => !used.has(p.slug) && !newPicked.includes(p) && !newPicked.some((q) => q.category === p.category))].slice(0, 8);
  const empty = !SHOP.length;

  return (
    <>
      {slides.length ? <Slideshow slides={slides} /> : (
        <section className="ft-hero">
          <div className="wrap ft-hero-in">
            <p className="eyebrow">New lingerie every week</p>
            <h1 className="display">Lingerie for<br /><em>freaky</em> times</h1>
            <p className="lede">Lace sets, bodysuits, babydolls, corsets, robes and thigh highs. Free shipping and discreet packaging on every order.</p>
            <div className="ft-hero-cta">
              <Link href={empty ? '/about' : collectionHref('lingerie')} className="btn btn-pink">{empty ? 'Opening soon' : 'Shop Lingerie'}</Link>
              {!empty && <Link href="/collections/all" className="btn btn-line">Shop All</Link>}
            </div>
          </div>
        </section>
      )}

      {big.length >= 2 && <section className="sec">
        <div className="wrap big-tiles">
          {big.map((b) => (
            <Link key={b.slug} href={collectionHref(b.slug)} className="big-tile">
              <div className="photo"><img {...tileImg(b.img)} alt="" loading="lazy" /></div>
              <div className="big-tile-copy"><h3>{b.label}</h3><span className="btn btn-white">Shop now</span></div>
            </Link>
          ))}
        </div>
      </section>}

      {trending.length >= 4 && (
        <section className="sec" style={{ paddingTop: 0 }}>
          <Rail title="Trending now" sub="Our favorite pieces right now" href={collectionHref('all')}>
            {trending.map((p) => <ProductCard key={p.slug} product={p} />)}
          </Rail>
        </section>
      )}

      {cats.length > 0 && <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head"><h2>Shop by category</h2><Link href="/collections/all" className="link">Shop all</Link></div>
          <div className="cat-list">
            {cats.map(([s, label, skip]) => (
              <Link key={s} href={collectionHref(s)} className="cat-item">
                <div className="photo"><img {...cardImg(picked(F.circles?.[s], 1, used)[0]?.photos![0].src ?? coverOf(productsIn(col(s)), skip))} alt="" loading="lazy" /></div>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>}

      <Rows rows={rowsA} />

      {lookHero && lookItems.length === 4 && (
        <section className="sec" style={{ paddingTop: 0 }}>
          <div className="wrap look">
            <Link href={`/product/${lookHero.slug}`} className="look-hero">
              <div className="photo"><img {...heroImg((lookHero.photos![F.look?.photo ?? 0] ?? lookHero.photos![0]).src)} sizes="(max-width: 860px) 100vw, 50vw" alt={lookHero.name} loading="lazy" /></div>
              <div className="look-copy">
                <span className="eyebrow">Get the look</span>
                <h2>The whole look</h2>
                <span className="btn btn-white">Shop the set</span>
              </div>
            </Link>
            <div className="look-items">{lookItems.map((p) => <ProductCard key={p.slug} product={p} />)}</div>
          </div>
        </section>
      )}

      <Rails rows={rowsB} />

      {themes.length > 0 && <section className="sec">
        <div className="wrap">
          <div className="sec-head"><h2>Shop by vibe</h2></div>
          <div className="theme-row">
            {themes.map((s, n) => (
              <Link key={s} href={collectionHref(s)} className="theme-tile">
                <div className="photo"><img {...cardImg(picked(F.themes?.[s], 1, used)[0]?.photos![0].src ?? coverOf(productsIn(col(s)), 3 + n))} alt="" loading="lazy" /></div>
                <span>{col(s).title.replace(/ Lingerie$/, '')}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>}

      <Rows rows={rowsC} />

      {newIn.length >= 4 && <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head"><h2>New in</h2><Link href={collectionHref('new-in')} className="link">View all</Link></div>
          <div className="grid">{newIn.map((p) => <ProductCard key={p.slug} product={p} />)}</div>
        </div>
      </section>}

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap icons-row">
          <div className="icon-card"><Icon d="M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><strong>Free shipping</strong><span>On every order, worldwide</span></div>
          <div className="icon-card"><Icon d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" /><strong>{RETURN_DAYS} day returns</strong><span>Changed your mind? No stress</span></div>
          <div className="icon-card"><Icon d="M6 11V8a6 6 0 0 1 12 0v3M5 11h14v9H5z" /><strong>Discreet packaging</strong><span>Plain box, neutral billing name</span></div>
          <div className="icon-card"><Icon d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19l1-5.8L3.5 9.2l5.9-.9L12 3Z" /><strong>New drops weekly</strong><span>Fresh lingerie every week</span></div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head" style={{ justifyContent: 'center' }}><h2>FAQ</h2></div>
          <Faq limit={5} />
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="club">
            <div>
              <h2>Get {WELCOME_PERCENT}% off your first order</h2>
              <p className="lede">Join the Freaky Club for new drops, restocks and members-only codes.</p>
            </div>
            <Newsletter />
          </div>
        </div>
      </section>
    </>
  );
}
