'use client';

import Link from 'next/link';
import { thumbImg } from '@/lib/img';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface Hit { name: string; href: string; price: string; img?: string }

/** Search button in the header. Opens a bar with results as you type; Enter shows them all on /shop?q=. */
export default function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [total, setTotal] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); setTotal(0); return; }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((d: { total: number; results: Hit[] }) => { setHits(d.results); setTotal(d.total); })
        .catch(() => {});
    }, 140);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <>
      <button type="button" className="icon-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="search-panel" aria-label="Search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <div id="search-panel" className="search-panel">
          <div className="wrap">
            <form className="search-form" onSubmit={submit} role="search">
              <input ref={input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lace sets, bodysuits, robes, thigh highs..." aria-label="Search products" autoComplete="off" />
              <button type="button" className="text-btn" onClick={() => setOpen(false)}>Close</button>
            </form>
            {hits.length > 0 && (
              <div className="search-hits">
                {hits.map((h) => (
                  <Link key={h.href} href={h.href} className="search-hit" onClick={() => setOpen(false)}>
                    {h.img && <img {...thumbImg(h.img)} alt="" loading="lazy" />}
                    <span className="search-hit-name">{h.name}</span>
                    <span className="search-hit-price">{h.price}</span>
                  </Link>
                ))}
                <Link href={`/search?q=${encodeURIComponent(q.trim())}`} className="link search-all" onClick={() => setOpen(false)}>
                  See all {total} results
                </Link>
              </div>
            )}
            {q.trim().length >= 2 && hits.length === 0 && <p className="search-empty">Nothing yet for “{q.trim()}”. Try fewer words.</p>}
          </div>
        </div>
      )}
    </>
  );
}
