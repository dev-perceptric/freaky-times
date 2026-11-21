import type { Product } from '@/lib/products';
import { shotsFor, printSrc } from '@/lib/images';
import { cardImg } from '@/lib/img';

/** Main product photo, with an optional second photo shown on hover. */
export function ProductPhoto({ product, color, hover = false, eager = false, className = '' }: { product: Product; color?: string; hover?: boolean; eager?: boolean; className?: string }) {
  const shots = shotsFor(product, color);
  const hex = (product.colors.find((c) => c.name === color) ?? product.colors[0]).hex;
  if (!shots.length) {
    return (
      <div className={`photo photo-print ${className}`} style={{ background: product.allOver ? '#151315' : hex }}>
        <img src={printSrc(product)} alt={`${product.name} print`} loading={eager ? 'eager' : 'lazy'} />
      </div>
    );
  }
  return (
    <div className={`photo ${hover && shots[1] ? 'has-hover' : ''} ${className}`}>
      <img {...cardImg(shots[0].src)} alt={product.name} loading={eager ? 'eager' : 'lazy'} className={shots[0].style === 'Model' ? undefined : 'is-product'} />
      {hover && shots[1] && <img className={`photo-alt${shots[1].style === 'Model' ? '' : ' is-product'}`} {...cardImg(shots[1].src)} alt="" aria-hidden="true" loading="lazy" />}
    </div>
  );
}

/** The FreakyTimes logo: "freaky times" in a heavy lowercase type, the dot of the i is a pink heart. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`wordmark ${className}`} role="img" aria-label="FreakyTimes">
      <span aria-hidden="true">
        freaky t<span className="wm-i">ı<svg viewBox="0 0 30 26"><path d="M15 25C6.5 18.5 1 13.5 1 7.6A6.6 6.6 0 0 1 15 4.8a6.6 6.6 0 0 1 14 2.8c0 5.9-5.5 10.9-14 17.4Z" /></svg></span>mes
      </span>
    </span>
  );
}
