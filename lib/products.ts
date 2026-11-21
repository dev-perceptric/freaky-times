import type { CategoryId, Dept, LineId } from './taxonomy';
import type { Attrs } from './tags';
import CJ_PRODUCTS from './cj-products.json';
import AE_PRODUCTS from './ae-products.json';

export interface Color {
  name: string;
  hex: string;
  /** Small photo for the swatch when the option is a print or finish, not a plain color (CJ). */
  image?: string;
}

export interface CjVariant {
  color: string;
  size: string;
  vid: string;
  /** What CJ charges us, in USD, before shipping. */
  cost: number;
}

export interface CjInfo {
  pid: string;
  /** Warehouse country CJ ships from (US or CN). */
  from: string;
  /** Typical delivery time shown on the product page, e.g. "5-9 business days". */
  delivery?: string;
  variants: CjVariant[];
}

export interface AeVariant {
  color: string;
  size: string;
  /** AliExpress sku_attr, e.g. "14:193#Black;5:100014064". Needed to order this exact variant. */
  skuAttr: string;
  skuId: string;
  cost: number;
}

export interface AeInfo {
  productId: string;
  delivery?: string;
  variants: AeVariant[];
}

export interface Product {
  slug: string;
  code: string;
  name: string;
  /** Departments this piece is listed under. Unisex pieces list both. */
  depts: Dept[];
  line: LineId;
  category: CategoryId;
  /** Printed edge to edge (swim, AOP). One "Full print" color, no color picker. */
  allOver?: boolean;
  design: string;
  drop: string;
  price: number;
  colors: Color[];
  sizes: string[];
  blurb: string;
  afterDark?: boolean;
  /** Set when Printful prints and ships this piece. */
  printful?: { productId: number; syncProductId: number; blank: string };
  /** Set when CJ Dropshipping ships this piece. One entry per color and size. */
  cj?: CjInfo;
  /** Set when AliExpress ships this piece. */
  ae?: AeInfo;
  /** Photos for products that don't use mockups.json (CJ). color '*' means every color. */
  photos?: { src: string; color: string }[];
  details: string[];
  /** Long description, one paragraph per entry. */
  description?: string[];
  /** Earlier web addresses, so orders paid under an old one can still be fulfilled. Not redirected. */
  oldSlugs?: string[];
  /** Theme tags such as 'anime', used by theme collections. */
  tags?: string[];
  /** Detailed tags read from the photos (lib/tags.ts). */
  attrs?: Attrs;
}

// CJ Dropshipping products, written by scripts/cj_catalog.py from scripts/cj_picks.json.

/** Everything we've ever listed, hidden or not. Used to fulfil orders already paid for. */
export const ALL_PRODUCTS: Product[] = [...(AE_PRODUCTS as Product[]), ...(CJ_PRODUCTS as Product[])];

/** What the store shows and sells. */
export const PRODUCTS: Product[] = ALL_PRODUCTS;

export function getProduct(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug);
}

/** Finds a product even if it's hidden from the store. */
export function findAnyProduct(slug: string) {
  return ALL_PRODUCTS.find((p) => p.slug === slug || p.oldSlugs?.includes(slug));
}

export { cjVariant, aeVariant, inStock } from './stock';
export { formatPrice } from './money';
