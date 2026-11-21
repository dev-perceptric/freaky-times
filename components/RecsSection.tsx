'use client';

import { useEffect, useState } from 'react';
import InfiniteGrid from './InfiniteGrid';
import DropdownCloser from './DropdownCloser';

const KEY = 'ft-recs-group';

/**
 * "You may also like" with a picker: More like this (default, server-rendered) or one category
 * (Tops, Skirts, Shoes...) ranked by how well it goes with this piece. The choice is remembered in the browser.
 */
export default function RecsSection({ slug, options, next, children }: {
  slug: string; options: { id: string; label: string; count: number }[]; next: number | null; children: React.ReactNode;
}) {
  const [group, setGroup] = useState('');
  useEffect(() => {
    try { const g = localStorage.getItem(KEY); if (g && options.some((o) => o.id === g)) setGroup(g); } catch { /* private mode */ }
  }, [options]);
  const pick = (g: string) => {
    setGroup(g);
    try { if (g) localStorage.setItem(KEY, g); else localStorage.removeItem(KEY); } catch { /* private mode */ }
  };
  const label = options.find((o) => o.id === group)?.label ?? 'More like this';
  return (
    <>
      <DropdownCloser />
      <div className="sec-head recs-head">
        <h2>You may also like</h2>
        <details className="filter sort-menu">
          <summary>Show: {label}</summary>
          <div className="filter-menu filter-menu-right">
            <button type="button" className={`filter-opt${group === '' ? ' is-active' : ''}`} onClick={() => pick('')}>More like this</button>
            {options.map((o) => (
              <button key={o.id} type="button" className={`filter-opt${group === o.id ? ' is-active' : ''}`} onClick={() => pick(o.id)}>
                {o.label} <span>{o.count}</span>
              </button>
            ))}
          </div>
        </details>
      </div>
      <InfiniteGrid key={group || 'like'} feed={`kind=like&slug=${slug}${group ? `&group=${group}` : ''}`} next={group ? 1 : next}>
        {group ? null : children}
      </InfiniteGrid>
    </>
  );
}
