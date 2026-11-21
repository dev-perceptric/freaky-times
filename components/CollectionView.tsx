import Link from 'next/link';
import type { Product } from '@/lib/products';
import { FILTER_KEYS, facetsFor, type FilterKey } from '@/lib/filters';
import type { Crumb } from '@/lib/catalog';
import ProductCard from './ProductCard';
import Crumbs from './Crumbs';
import InfiniteGrid from './InfiniteGrid';
import DropdownCloser from './DropdownCloser';
import { PER_PAGE, SORTS, filterAndSort } from '@/lib/feed';

export type Search = { sort?: string; page?: string; q?: string } & Partial<Record<FilterKey, string>>;

/** Link to the same page with search params changed (undefined removes one). Filters and sorting reset the page. */
export function hrefWith(base: string, search: Search, change: Partial<Search>) {
  const q = new URLSearchParams();
  for (const k of ['q', ...FILTER_KEYS, 'sort', 'page'] as const) {
    const v = k in change ? change[k] : k === 'page' ? undefined : search[k];
    if (v && !(k === 'sort' && v === 'featured') && !(k === 'page' && v === '1')) q.set(k, v);
  }
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

export interface Chip { label: string; href: string; count?: number; active?: boolean }

export default function CollectionView({
  base, feed, title, eyebrow, intro, crumbs, products, search, chips = [], tabs = [], hide = [],
}: {
  base: string; feed: string; title: string; eyebrow?: string; intro?: string; crumbs: Crumb[]; products: Product[]; search: Search;
  chips?: Chip[]; tabs?: Chip[]; hide?: FilterKey[];
}) {
  const { list, filters, sort } = filterAndSort(products, search);
  const facets = facetsFor(products, filters, hide);
  const active = facets.flatMap((f) => (filters[f.key] ? [{ key: f.key, label: f.options.find((o) => o.id === filters[f.key])?.label ?? filters[f.key]! }] : []));
  // What the feed API needs to continue this exact list (source + filters + sort).
  const feedQuery = new URLSearchParams(feed);
  for (const k of [...FILTER_KEYS, 'sort'] as const) if (search[k]) feedQuery.set(k, search[k]!);

  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(search.page) || 1));
  const shown = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <section className="coll">
      <div className="wrap">
        <Crumbs items={crumbs} />
        <header className="coll-head">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {intro && <p className="coll-intro">{intro}</p>}
        </header>

        {tabs.length > 0 && (
          <nav className="dept-tabs" aria-label="Department">
            {tabs.map((t) => <Link key={t.href} href={t.href} className={`dept-tab${t.active ? ' is-on' : ''}`} aria-current={t.active ? 'page' : undefined}>{t.label}</Link>)}
          </nav>
        )}

        {chips.length > 0 && (
          <nav className="chips" aria-label="Browse">
            {chips.map((c) => (
              <Link key={c.href} href={c.href} className={`chip${c.active ? ' is-active' : ''}`} aria-current={c.active ? 'page' : undefined}>
                {c.label}{c.count !== undefined && <span className="chip-count">{c.count}</span>}
              </Link>
            ))}
          </nav>
        )}

        <DropdownCloser />
        <div className="coll-sticky">
        <div className="toolbar">
          <div className="filters" aria-label="Filter">
            {facets.map((f) => (
              <details key={f.key} className={`filter${filters[f.key] ? ' is-on' : ''}`}>
                <summary>{f.label}{filters[f.key] ? `: ${active.find((a) => a.key === f.key)?.label}` : ''}</summary>
                <div className="filter-menu">
                  {f.options.map((o) => (
                    <Link key={o.id} href={hrefWith(base, search, { [f.key]: filters[f.key] === o.id ? undefined : o.id })}
                      className={`filter-opt${filters[f.key] === o.id ? ' is-active' : ''}`} scroll={false}>
                      {o.label} <span>{o.count}</span>
                    </Link>
                  ))}
                </div>
              </details>
            ))}
          </div>
          <details className="filter sort-menu">
            <summary>Sort: {SORTS.find((s) => s.id === sort)!.label}</summary>
            <div className="filter-menu filter-menu-right">
              {SORTS.map((s) => (
                <Link key={s.id} href={hrefWith(base, search, { sort: s.id })} className={`filter-opt${s.id === sort ? ' is-active' : ''}`} scroll={false}>{s.label}</Link>
              ))}
            </div>
          </details>
        </div>

        {active.length > 0 && (
          <div className="filter-active">
            {active.map((a) => (
              <Link key={a.key} href={hrefWith(base, search, { [a.key]: undefined })} className="chip is-active" scroll={false}>{a.label} ✕</Link>
            ))}
            <Link href={hrefWith(base, { sort: search.sort, q: search.q }, {})} className="link" scroll={false}>Clear all</Link>
          </div>
        )}
        </div>

        <p className="count coll-count">{list.length} {list.length === 1 ? 'piece' : 'pieces'}</p>

        {shown.length > 0 ? (
          <InfiniteGrid feed={feedQuery.toString()} next={page < pages ? page + 1 : null}>
            {shown.map((p, i) => <ProductCard key={p.slug} product={p} eager={i < 4} />)}
          </InfiniteGrid>
        ) : (
          <p className="lede empty">Nothing matches all of those. <Link href={hrefWith(base, { q: search.q }, {})} className="link">Clear the filters</Link></p>
        )}

        {pages > 1 && (
          <nav className="pager sr-only" aria-label="Pages">
            {page > 1 && <Link href={hrefWith(base, search, { page: String(page - 1) })} className="pager-btn">← Previous</Link>}
            <span className="pager-info">Page {page} of {pages}</span>
            {page < pages && <Link href={hrefWith(base, search, { page: String(page + 1) })} className="pager-btn">Next →</Link>}
          </nav>
        )}
      </div>
    </section>
  );
}
