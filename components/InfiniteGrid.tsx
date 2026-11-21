'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Card } from '@/lib/feed';
import { cardImg, img } from '@/lib/img';

function CardTile({ c }: { c: Card }) {
  return (
    <Link href={`/product/${c.slug}`} className="tile">
      <div className="tile-media">
        <div className={`photo${c.img2 ? ' has-hover' : ''}`}>
          {c.img && <img {...cardImg(c.img)} alt={c.name} loading="lazy" className={c.imgClass} />}
          {c.img2 && <img className={c.img2Class} {...cardImg(c.img2)} alt="" aria-hidden="true" loading="lazy" />}
        </div>
        {c.isNew && <span className="badge">New</span>}
      </div>
      <div className="tile-info">
        <span className="tile-name">{c.name}</span>
        <span className="tile-price">{c.price}</span>
        {c.dots.length > 0 && (
          <span className="tile-dots" aria-label={`${c.dots.length + c.more} colors`}>
            {c.dots.map((bg, i) => <i key={i} className="tile-dot" style={{ background: bg }} />)}
            {c.more > 0 && <span className="tile-more">+{c.more}</span>}
          </span>
        )}
      </div>
    </Link>
  );
}

/**
 * Product grid that keeps growing as you scroll: the first page is rendered on the server (children),
 * later pages come from /api/feed and are added to the same grid.
 */
export default function InfiniteGrid({ children, feed, next }: { children: React.ReactNode; feed: string; next: number | null }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [page, setPage] = useState<number | null>(next);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const seen = useRef(new Set<string>());

  // A new list (filters, sort, search) starts over.
  useEffect(() => { setCards([]); setPage(next); setFailed(false); seen.current = new Set(); }, [feed, next]);

  const load = useCallback(async () => {
    if (page === null || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/feed?${feed}&page=${page}`);
      if (!r.ok) throw new Error(String(r.status));
      const d: { cards: Card[]; next: number | null } = await r.json();
      setCards((old) => [...old, ...d.cards.filter((c) => !seen.current.has(c.slug) && seen.current.add(c.slug))]);
      setPage(d.next);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [feed, page, busy]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || page === null || failed) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) load(); }, { rootMargin: '1200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [load, page, failed]);

  return (
    <>
      <div className="grid">
        {children}
        {cards.map((c) => <CardTile key={c.slug} c={c} />)}
      </div>
      <div ref={sentinel} className="feed-more" aria-live="polite">
        {busy && <span className="feed-spin" aria-label="Loading more" />}
        {failed && <button type="button" className="btn btn-line" onClick={() => { setFailed(false); load(); }}>Load more</button>}
      </div>
    </>
  );
}
