'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCart } from './CartProvider';
import { Wordmark } from './Media';
import SearchBox from './SearchBox';
import type { DeptId, Menu, MenuGroup } from '@/lib/catalog';

type Tab = 'all' | DeptId | 'themes' | 'new' | 'lingerie';

const Caret = () => (
  <svg className="caret" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
);
const BagIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 12.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5 8Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M9 10V7a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
);

const Chevron = () => (
  <svg className="chev" viewBox="0 0 10 10" aria-hidden="true"><path d="M3.5 1.5 7 5l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
);

type Panel = { allLabel?: string; allHref?: string; groups?: MenuGroup[]; links?: { label: string; href: string }[] };

/** Cascading dropdown: groups on the left, the hovered group's sub-collections fly out to the right. */
function Dropdown({ panel, onPick }: { panel: Panel; onPick: () => void }) {
  const [sub, setSub] = useState<string | null>(null);
  const idx = panel.groups?.findIndex((g) => g.id === sub) ?? -1;
  const cur = idx >= 0 ? panel.groups![idx] : undefined;
  const offset = Math.min(idx + (panel.allLabel ? 1 : 0), 4) * 38;
  return (
    <div className="dd" onMouseLeave={() => setSub(null)}>
      <div className="dd-list">
        {panel.allLabel && panel.allHref && <Link href={panel.allHref} className="dd-row dd-all" onClick={onPick} onMouseEnter={() => setSub(null)}>{panel.allLabel}</Link>}
        {panel.groups?.map((g) => (
          <Link key={g.id} href={g.href} className={`dd-row${sub === g.id ? ' is-on' : ''}`} onClick={onPick} onMouseEnter={() => setSub(g.id)} onFocus={() => setSub(g.id)}>
            {g.label} {g.links.length > 0 && <Chevron />}
          </Link>
        ))}
        {panel.links?.map((l) => <Link key={l.href} href={l.href} className="dd-row" onClick={onPick}>{l.label}</Link>)}
      </div>
      {cur && cur.links.length > 0 && (
        <div className="dd-list dd-fly" style={{ marginTop: offset }}>
          <Link href={cur.href} className="dd-row" onClick={onPick}>All {cur.label}</Link>
          {cur.links.map((l) => <Link key={l.href} href={l.href} className="dd-row" onClick={onPick}>{l.label}</Link>)}
        </div>
      )}
    </div>
  );
}

/** menu: built on the server (lib/catalog buildMenu) so only sections with products show. */
export default function Header({ menu }: { menu: Menu }) {
  const { count, setOpen } = useCart();
  const pathname = usePathname();
  const [mega, setMega] = useState<Tab | null>(null);
  const [mobile, setMobile] = useState(false);
  const [mDept, setMDept] = useState<DeptId>('womens');
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const menuBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMega(null); setMobile(false); }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMega(null);
      setMobile((m) => { if (m) menuBtn.current?.focus(); return false; });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobile ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobile]);

  const openMega = (t: Tab) => { clearTimeout(closeTimer.current); setMega(t); };
  const closeMega = () => { closeTimer.current = setTimeout(() => setMega(null), 140); };
  const tabs: { id: Tab; label: string; href: string; panel: Panel }[] = [
    { id: 'all', label: 'Shop', href: '/collections/all', panel: { allLabel: 'Shop All', allHref: '/collections/all', groups: menu.all } },
    ...menu.depts.map((d) => ({ id: d.id as Tab, label: d.label, href: d.href, panel: { allLabel: `All ${d.label === 'Women' ? "Women's" : "Men's"}`, allHref: d.href, groups: d.groups } })),
    ...menu.all.filter((g) => g.id === 'lingerie').map((g) => ({ id: 'lingerie' as Tab, label: g.label, href: g.href, panel: { allLabel: `All ${g.label}`, allHref: g.href, links: g.links } })),
    { id: 'themes', label: 'Shop by Vibe', href: menu.themes[0]?.href ?? '/collections/all', panel: { links: menu.themes } },
    { id: 'new', label: 'New In', href: '/collections/new-in', panel: { allLabel: 'All New In', allHref: '/collections/new-in', links: menu.fresh.filter((l) => !l.href.endsWith('/new-in')) } },
  ];
  const mobileDept = menu.depts.find((d) => d.id === mDept) ?? menu.depts[0];

  return (
    <header className="site-header" onMouseLeave={closeMega}>
      <div className="wrap header-row">
        <button ref={menuBtn} type="button" className="menu-btn" onClick={() => setMobile(true)} aria-expanded={mobile} aria-controls="mobile-menu">
          <span className="menu-icon" aria-hidden="true"><i /><i /><i /></span>
          <span className="sr-only">Menu</span>
        </button>

        <Link href="/" className="brand" aria-label="FreakyTimes home"><Wordmark /></Link>

        <nav className="nav" aria-label="Shop">
          {tabs.map((t) => (
            <div key={t.id} className="nav-item" data-open={mega === t.id} onMouseEnter={() => openMega(t.id)} onMouseLeave={closeMega}>
              <Link href={t.href} aria-haspopup="true" aria-expanded={mega === t.id} onFocus={() => openMega(t.id)}>{t.label} <Caret /></Link>
              {mega === t.id && <Dropdown panel={t.panel} onPick={() => setMega(null)} />}
            </div>
          ))}
          <Link href="/about" className={pathname === '/about' ? 'is-on' : ''} onMouseEnter={() => setMega(null)}>About</Link>
          <Link href="/track" className={pathname === '/track' ? 'is-on' : ''} onMouseEnter={() => setMega(null)}>Track Order</Link>
        </nav>

        <div className="header-right">
          <SearchBox />
          <button type="button" className="icon-btn" onClick={() => setOpen(true)} aria-label={`Open bag, ${count} item${count === 1 ? '' : 's'}`}>
            <BagIcon />
            {count > 0 && <span className="bag-count">{count}</span>}
          </button>
        </div>
      </div>

      <div id="mobile-menu" className={`mobile-root${mobile ? ' is-open' : ''}`} aria-hidden={!mobile}>
        <div className="drawer-scrim" onClick={() => setMobile(false)} />
        <aside className="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="drawer-head">
            <Wordmark />
            <button type="button" className="text-btn" onClick={() => setMobile(false)}>Close</button>
          </div>
          {menu.depts.length > 1 && <div className="m-tabs" role="tablist">
            {menu.depts.map((d) => (
              <button key={d.id} type="button" role="tab" aria-selected={mDept === d.id} className={`m-tab${mDept === d.id ? ' is-on' : ''}`} onClick={() => setMDept(d.id)}>{d.label}</button>
            ))}
          </div>}
          <nav className="mobile-nav" aria-label="Shop">
            {mobileDept && <Link href={mobileDept.href} className="m-top">Shop all {mobileDept.label}</Link>}
            {(mobileDept?.groups ?? menu.all).map((g) => (
              <details key={`${mobileDept?.id ?? 'all'}-${g.id}`} className="m-group">
                <summary className="m-top">{g.label}</summary>
                <div className="m-cats">
                  <Link href={g.href} className="m-all">All {g.label}</Link>
                  {g.links.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
                </div>
              </details>
            ))}
            <details className="m-group">
              <summary className="m-top">Shop by Vibe</summary>
              <div className="m-cats">{menu.themes.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}</div>
            </details>
            <details className="m-group">
              <summary className="m-top">New In</summary>
              <div className="m-cats">{menu.fresh.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}</div>
            </details>
            <Link href="/collections/all" className="m-top">Shop All</Link>
            <Link href="/track" className="m-top">Track Order</Link>
            <Link href="/about" className="m-top">About</Link>
            <Link href="/faq" className="m-top">FAQ</Link>
          </nav>
        </aside>
      </div>
    </header>
  );
}
