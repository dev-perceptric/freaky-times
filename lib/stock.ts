// Variant and stock checks. These only read the product passed in, so browser code can use them
// without loading the whole catalog (lib/products imports the JSON files).
import type { Product } from './products';

/** The CJ variant for a color and size, if CJ stocks that combo. */
export function cjVariant(p: Product, color: string, size: string) {
  return p.cj?.variants.find((v) => v.color === color && v.size === size);
}

/** The AliExpress variant for a color and size, if that combo exists. */
export function aeVariant(p: Product, color: string, size: string) {
  return p.ae?.variants.find((v) => v.color === color && v.size === size);
}

/** Dropship items only come in the combos the supplier stocks. Printful pieces come in all of them. */
export function inStock(p: Product, color: string, size: string) {
  if (p.cj) return !!cjVariant(p, color, size);
  if (p.ae) return !!aeVariant(p, color, size);
  return true;
}
