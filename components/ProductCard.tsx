import Link from 'next/link';
import type { Product } from '@/lib/products';
import { formatPrice } from '@/lib/products';
import { isNew } from '@/lib/catalog';
import { ProductPhoto } from './Media';
import { img } from '@/lib/img';
import { quickData } from '@/lib/quick';
import { AdultBlur } from './Adult';
import QuickAdd from './QuickAdd';

/** White product card: photo (second photo on hover), name, price, color dots and a quick add button. */
export default function ProductCard({ product, eager = false, kicker }: { product: Product; eager?: boolean; kicker?: string }) {
  const photo = <ProductPhoto product={product} hover eager={eager} />;
  const colors = product.colors.filter((c) => !/photo|default/i.test(c.name));
  const quick = quickData(product);
  return (
    <div className="tile">
      <Link href={`/product/${product.slug}`} className="tile-link">
        <div className="tile-media">
          {product.afterDark ? <AdultBlur>{photo}</AdultBlur> : photo}
          {isNew(product) && <span className="badge">New</span>}
        </div>
        <div className="tile-info">
          {kicker && <span className="tile-kicker">{kicker}</span>}
          <span className="tile-name">{product.name}</span>
          <span className="tile-price">{formatPrice(product.price)}</span>
          {colors.length > 1 && (
            <span className="tile-dots" aria-label={`${colors.length} colors`}>
              {colors.slice(0, 5).map((c) => (
                <i key={c.name} className="tile-dot" style={{ background: c.image ? `center / cover url(${img(c.image, 96)}), ${c.hex}` : c.hex }} />
              ))}
              {colors.length > 5 && <span className="tile-more">+{colors.length - 5}</span>}
            </span>
          )}
        </div>
      </Link>
      {quick.item && quick.sizes.length > 0 && <QuickAdd item={quick.item} sizes={quick.sizes} showColor={quick.showColor} />}
    </div>
  );
}
