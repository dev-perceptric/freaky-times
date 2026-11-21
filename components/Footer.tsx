import Link from 'next/link';
import { Wordmark } from './Media';
import Newsletter from './Newsletter';
import { buildMenu } from '@/lib/catalog';

export default function Footer() {
  const menu = buildMenu();
  const lingerie = menu.all.find((g) => g.id === 'lingerie');
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <nav aria-label="Shop">
          <h4>Shop</h4>
          <Link href="/collections/all">Shop All</Link>
          {menu.all.map((g) => <Link key={g.id} href={g.href}>{g.label}</Link>)}
          {menu.fresh.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
        </nav>
        {lingerie && (
          <nav aria-label="Lingerie links">
            <h4>Lingerie</h4>
            {lingerie.links.slice(0, 8).map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
          </nav>
        )}
        {menu.themes.length > 0 && (
          <nav aria-label="Shop by vibe">
            <h4>Shop by Vibe</h4>
            {menu.themes.slice(0, 8).map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
          </nav>
        )}
        <nav aria-label="Help">
          <h4>Help</h4>
          <Link href="/track">Track Order</Link>
          <Link href="/shipping">Shipping</Link>
          <Link href="/returns">Returns</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
        <div className="footer-news">
          <h4>Join the Freaky Club</h4>
          <p>New drops, restocks and members-only codes. No spam, just spice.</p>
          <Newsletter />
        </div>
      </div>
      <div className="wrap footer-mark">
        <Wordmark className="wordmark-xl" />
      </div>
      <div className="wrap footer-bottom">
        <span>© {new Date().getFullYear()} FreakyTimes · Lingerie, shipped discreetly worldwide</span>
        <span>Dressed to be undressed</span>
      </div>
    </footer>
  );
}
