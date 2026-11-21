'use client';

import Link from 'next/link';
import { thumbImg } from '@/lib/img';
import { useEffect, useRef, useState } from 'react';
import { useCart } from './CartProvider';
import { formatPrice } from '@/lib/money';

export default function CartDrawer() {
  const { items, open, setOpen, setQty, remove, subtotal, count } = useCart();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, setOpen]);

  // Warm up the connection to Stripe while the bag is open so checkout opens faster.
  useEffect(() => {
    if (!open || document.getElementById('stripe-preconnect')) return;
    for (const [i, href] of ['https://checkout.stripe.com', 'https://js.stripe.com'].entries()) {
      const l = document.createElement('link');
      l.rel = 'preconnect'; l.href = href; if (i === 0) l.id = 'stripe-preconnect';
      document.head.appendChild(l);
    }
  }, [open]);

  // Coming back from Stripe with the Back button restores this page from memory: un-stick the button.
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => { if (e.persisted) { setBusy(false); setMsg(''); } };
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);

  async function checkout() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        // If the browser doesn't leave (blocked, very slow), give the button back after a while.
        setTimeout(() => setBusy(false), 12000);
        return;
      }
      setMsg(data.error || 'Checkout did not start. Try again in a minute.');
    } catch {
      setMsg('Could not reach checkout. Check your connection and try again.');
    }
    setBusy(false);
  }

  return (
    <div className={`drawer-root${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <div className="drawer-scrim" onClick={() => setOpen(false)} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Your bag">
        <div className="drawer-head">
          <h2>Bag ({count})</h2>
          <button ref={closeRef} type="button" className="text-btn" onClick={() => setOpen(false)}>Close</button>
        </div>

        {items.length === 0 ? (
          <div className="drawer-empty">
            <p>Your bag is empty.</p>
            <Link href="/collections/new-in" className="btn" onClick={() => setOpen(false)}>Shop new in</Link>
          </div>
        ) : (
          <>
            <ul className="drawer-list">
              {items.map((item, i) => {
                return (
                  <li key={`${item.slug}-${item.color}-${item.size}`} className="line">
                    <Link href={`/product/${item.slug}`} className="line-media" onClick={() => setOpen(false)}>
                      <div className="photo">{item.image && <img {...thumbImg(item.image)} alt="" loading="lazy" />}</div>
                    </Link>
                    <div className="line-info">
                      <strong>{item.name}</strong>
                      <span className="line-opts">{[/^(default|as photo)$/i.test(item.color) ? '' : item.color, item.size === 'One Size' ? '' : item.sizeLabel ?? item.size].filter(Boolean).join(' · ')}</span>
                      <div className="qty">
                        <button type="button" onClick={() => setQty(i, item.qty - 1)} aria-label={`One less ${item.name}`}>−</button>
                        <span aria-live="polite">{item.qty}</span>
                        <button type="button" onClick={() => setQty(i, item.qty + 1)} aria-label={`One more ${item.name}`}>+</button>
                      </div>
                      <button type="button" className="text-btn line-remove" onClick={() => remove(i)}>Remove</button>
                    </div>
                    <span className="line-price">{formatPrice(item.price * item.qty)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="drawer-foot">
              <div className="subtotal"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
              <p className="fine">Free shipping. Discount codes and tax are added at checkout.</p>
              <button type="button" className="btn btn-block" onClick={checkout} disabled={busy}>
                {busy ? 'Opening checkout…' : 'Check out'}
              </button>
              {msg && <p className="drawer-msg" role="status">{msg}</p>}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
