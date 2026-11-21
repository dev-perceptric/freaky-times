// Data for adding a product to the bag straight from a card: the pictured color and its in-stock sizes.
import type { Product } from './products';
import type { QuickItem, QuickSize } from '@/components/QuickAdd';
import { inStock } from './stock';
import { isOversized, sizeLabel } from './sizing';
import { shotsFor } from './images';

/** The color in the card's first photo, so quick add puts the pictured piece in the bag. */
function pictured(product: Product) {
  const first = shotsFor(product)[0]?.color;
  return product.colors.find((c) => c.name === first) ?? product.colors[0];
}

/** The item and sizes quick add needs, or no sizes for pieces that can't be added from a card (After Dark). */
export function quickData(product: Product): { item?: QuickItem; sizes: QuickSize[]; showColor: boolean } {
  const colors = product.colors.filter((c) => !/photo|default/i.test(c.name));
  const color = pictured(product);
  if (product.afterDark || !color) return { sizes: [], showColor: false };
  const oversized = isOversized(product);
  const sizes = product.sizes
    .filter((s) => inStock(product, color.name, s))
    .map((s) => {
      const l = sizeLabel(s, product.category, oversized);
      return { size: s, label: l.main, text: l.text };
    });
  const item = { slug: product.slug, name: product.name, price: product.price, color: color.name, image: shotsFor(product, color.name)[0]?.src };
  return { item, sizes, showColor: colors.length > 1 };
}
