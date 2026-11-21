'use client';

import { useEffect, useRef, useState } from 'react';
import type { Product } from '@/lib/products';
import { formatPrice } from '@/lib/money';
import { inStock } from '@/lib/stock';
import { shotsFor, printSrc } from '@/lib/images';
import { AdultBlur, AdultConfirm } from './Adult';
import { RETURN_DAYS } from '@/lib/site';
import { useCart } from './CartProvider';
import SizeGuide from './SizeGuide';
import { galleryImg, img, thumbImg } from '@/lib/img';
import { isOversized, sizeLabel, type SizeChart } from '@/lib/sizing';

export default function ProductView({ product, chart }: { product: Product; chart?: SizeChart }) {
  const oversized = isOversized(product);
  const label = (s: string) => sizeLabel(s, product.category, oversized);
  const [color, setColor] = useState(product.colors[0]);
  const [active, setActive] = useState(0);
  const [size, setSize] = useState(product.sizes.length === 1 ? product.sizes[0] : '');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { add, setOpen } = useCart();
  const isBikini = !!product.allOver;

  const shots = shotsFor(product, color.name);
  const gallery = shots.length ? shots.map((s) => s.src) : [printSrc(product)];
  const current = gallery[Math.min(active, gallery.length - 1)];
  const currentIsProduct = shots.length > 0 && shots[Math.min(active, shots.length - 1)].style !== 'Model';
  const count = gallery.length;
  const go = (step: number) => setActive((i) => (Math.min(i, count - 1) + step + count) % count);
  const touchX = useRef<number | null>(null);
  const wheelLock = useRef(0);

  // Left / right arrow keys move through the photos.
  useEffect(() => {
    if (count < 2) return;
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Download the other gallery photos in the background once the page has loaded,
  // so the next photo is already there when the shopper clicks, swipes or picks a color.
  const galleryKey = gallery.join('|');
  useEffect(() => {
    if (count < 2) return;
    const preload = () => gallery.forEach((src) => {
      const p = galleryImg(src);
      const im = new Image();
      im.decoding = 'async';
      if (p.sizes) im.sizes = p.sizes;
      if (p.srcSet) im.srcset = p.srcSet;
      im.src = p.src;
    });
    if (document.readyState === 'complete') {
      const t = setTimeout(preload, 150);
      return () => clearTimeout(t);
    }
    window.addEventListener('load', preload, { once: true });
    return () => window.removeEventListener('load', preload);
    // gallery is rebuilt on every render; galleryKey only changes when the photos do.
  }, [galleryKey]);

  // Keep the picked thumbnail in view when the row scrolls sideways.
  useEffect(() => {
    document.getElementById(`thumb-${active}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  function onWheel(e: React.WheelEvent) {
    // Sideways trackpad scroll flips photos; normal page scrolling is left alone.
    if (count < 2 || Math.abs(e.deltaX) < Math.abs(e.deltaY) || Math.abs(e.deltaX) < 20) return;
    const now = Date.now();
    if (now - wheelLock.current < 450) return;
    wheelLock.current = now;
    go(e.deltaX > 0 ? 1 : -1);
  }

  // CJ products only come in the color and size combos CJ stocks. Printful pieces come in all of them.
  const stocked = (c: string, s: string) => inStock(product, c, s);

  function pickColor(c: typeof color) {
    setColor(c);
    if (size && !stocked(c.name, size)) setSize(product.sizes.length === 1 && stocked(c.name, product.sizes[0]) ? product.sizes[0] : '');
    // Jump to Printful's product shot in the picked color (the model photo stays first in the row).
    setActive(shotsFor(product, c.name)[0]?.style === 'Model' ? 1 : 0);
  }

  function addToBag() {
    if (!size) return;
    add({ slug: product.slug, color: color.name, size, sizeLabel: label(size).text, name: product.name, price: product.price, image: gallery[0] }, qty);
    setAdded(true);
    setOpen(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const main = (
    <div
      className={`photo pdp-photo${shots.length ? '' : ' photo-print'}`}
      style={shots.length ? undefined : { background: isBikini ? '#151315' : color.hex }}
      onWheel={onWheel}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}
    >
      <img {...galleryImg(current)} fetchPriority="high" alt={product.name} className={currentIsProduct ? 'is-product' : undefined} draggable={false} />
      {count > 1 && (
        <>
          <button type="button" className="pdp-arrow pdp-prev" onClick={() => go(-1)} aria-label="Previous photo">‹</button>
          <button type="button" className="pdp-arrow pdp-next" onClick={() => go(1)} aria-label="Next photo">›</button>
          <span className="pdp-count" aria-hidden="true">{Math.min(active, count - 1) + 1} / {count}</span>
        </>
      )}
    </div>
  );

  return (
    <div className="pdp">
      <div className="pdp-gallery">
        {product.afterDark ? <AdultBlur>{main}</AdultBlur> : main}
        {gallery.length > 1 && (
          <div className="thumbs" role="group" aria-label="More photos">
            {gallery.map((src, i) => (
              <button key={src} type="button" id={`thumb-${i}`} className={`thumb${i === active ? ' is-on' : ''}`} onClick={() => setActive(i)} aria-label={`Photo ${i + 1}`} aria-pressed={i === active}>
                <img {...thumbImg(src)} alt="" loading="eager" decoding="async" />
              </button>
            ))}
          </div>
        )}
        {product.afterDark && <AdultConfirm />}
      </div>

      <div className="pdp-info">
        <h1>{product.name}</h1>
        <p className="pdp-price">{formatPrice(product.price)}</p>
        <p className="pdp-blurb">{product.blurb}</p>
        <div className="pdp-ship">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
          <span><strong>Free shipping.</strong> Arrives in about {product.ae?.delivery ?? product.cj?.delivery ?? '6-17 days'}.</span>
        </div>

        {!isBikini && !((product.cj || product.ae) && product.colors.length === 1) && (
          <fieldset className="opt">
            <legend>{product.colors.some((c) => c.image) ? 'Style' : 'Color'} <span>{color.name}</span></legend>
            <div className="swatch-row">
              {product.colors.map((c) => (
                <button key={c.name} type="button" id={`color-${c.name.toLowerCase().replace(/\s+/g, '-')}`} className={`swatch${c.name === color.name ? ' is-on' : ''}`} style={{ background: c.image ? `center / cover no-repeat url(${img(c.image, 160)}), ${c.hex}` : c.hex }} onClick={() => pickColor(c)} aria-label={c.name} aria-pressed={c.name === color.name} />
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="opt">
          <legend>Size {size ? <span>{label(size).text}</span> : null}</legend>
          <div className="size-row">
            {product.sizes.map((s) => (
              <button key={s} type="button" id={`size-${s}`} className={`size${s === size ? ' is-on' : ''}${label(s).sub ? ' has-us' : ''}`} onClick={() => setSize(s)} aria-pressed={s === size} aria-label={label(s).text} disabled={!stocked(color.name, s)}>
                {label(s).main}{label(s).sub && <small>{label(s).sub}</small>}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="buy-row">
          <div className="qty qty-lg">
            <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="One less">−</button>
            <span aria-live="polite">{qty}</span>
            <button type="button" onClick={() => setQty(Math.min(10, qty + 1))} aria-label="One more">+</button>
          </div>
          <button type="button" className="btn btn-grow" onClick={addToBag} disabled={!size}>
            {!size ? 'Select a size' : added ? 'Added' : 'Add to bag'}
          </button>
        </div>

        {product.description && product.description.length > 0 && (
          <details className="acc" open>
            <summary>Description</summary>
            <div className="pdp-desc">
              {product.description.map((para) => <p key={para}>{para}</p>)}
            </div>
          </details>
        )}
        <details className="acc">
          <summary>Details</summary>
          <ul>
            {product.details.map((d) => <li key={d}>{d}</li>)}
            {product.printful && <li>{product.printful.blank}</li>}
          </ul>
        </details>
        <details className="acc" open={product.sizes.some((s) => !/one size/i.test(s)) || undefined}>
          <summary>Size guide</summary>
          <SizeGuide chart={chart} sizes={product.sizes} category={product.category} oversized={oversized} />
        </details>
        <details className="acc">
          <summary>Shipping & returns</summary>
          <p>
            {product.cj
              ? `Ships from our ${product.cj.from === 'US' ? 'US' : 'overseas'} warehouse${product.cj.delivery ? ` in about ${product.cj.delivery}` : ''}, straight to your door. Pieces in one order can arrive in separate packages.`
              : product.ae
                ? `Free shipping from our partner warehouse${product.ae.delivery ? `, arriving in about ${product.ae.delivery}` : ''}. Pieces in one order can arrive in separate packages.`
                : 'Each piece is printed after you order. Shipping cost and timing show at checkout.'}
          </p>
          <p>Changed your mind? Return unworn pieces within {RETURN_DAYS} days of delivery. <a className="link" href="/returns">Returns policy</a></p>
        </details>
      </div>
    </div>
  );
}
