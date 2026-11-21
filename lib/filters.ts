// Filters for collection and search pages (type, vibe, print, theme, fit...), read from each product's photo tags.
import type { Product } from './products';
import { COLOR_FAMILIES, PRICE_RANGES, SIZE_ORDER, VIBES, getVibe, vibeText } from './taxonomy';
import { euFor, isOversized, usSize } from './sizing';
import { ALL_SUBTYPES, CUTS, LENGTHS, MATERIALS, PRINTS, SLEEVES, SUBTYPES, THEMES, type TagOption } from './tags';

/** Vibes come from the photo tags; products without tags fall back to words in the name. */
export function vibeMatches(p: Product, vibeId: string) {
  const a = p.attrs;
  if (vibeId === 'anime' && (p.tags?.includes('anime') || a?.print === 'anime')) return true;
  if (a?.vibe) return a.vibe === vibeId || !!a.vibes?.includes(vibeId);
  return !!getVibe(vibeId)?.match.test(vibeText(p));
}

// ---------- filters ----------

export type Filters = Partial<Record<FilterKey, string>>;

export const FILTER_KEYS = ['type', 'vibe', 'print', 'theme', 'fit', 'sleeve', 'length', 'material', 'color', 'size', 'price'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

/** Main color from the photo tags; untagged products fall back to their color options. */
const colorFamilies = (p: Product) =>
  p.attrs?.color ? [p.attrs.color] : COLOR_FAMILIES.filter((f) => p.colors.some((c) => f.match.test(c.name)) || f.match.test(p.name)).map((f) => f.id);

export function matchesFilter(p: Product, key: FilterKey, value: string) {
  const a = p.attrs;
  switch (key) {
    case 'type': return a?.sub === value;
    case 'vibe': return vibeMatches(p, value);
    case 'print': return a?.print === value;
    case 'theme': return !!a?.themes?.includes(value);
    case 'fit': return !!a?.cut?.includes(value);
    case 'sleeve': return a?.sleeve === value;
    case 'length': return a?.length === value;
    case 'material': return !!a?.material?.includes(value);
    case 'color': return colorFamilies(p).includes(value);
    case 'size': return usSizes(p).includes(value);
    case 'price': {
      const r = PRICE_RANGES.find((x) => x.id === value);
      return !!r && p.price >= r.min && p.price < r.max;
    }
  }
}

export function applyFilters(list: Product[], f: Filters, except?: FilterKey) {
  return list.filter((p) => FILTER_KEYS.every((k) => k === except || !f[k] || matchesFilter(p, k, f[k]!)));
}

export interface FacetOption { id: string; label: string; count: number }
export interface Facet { key: FilterKey; label: string; options: FacetOption[] }

const usCache = new WeakMap<Product, string[]>();
/** The US letter sizes a product comes in (shown on the site instead of the seller's own sizes). */
function usSizes(p: Product) {
  let v = usCache.get(p);
  if (!v) { const o = isOversized(p); v = p.sizes.map((s) => usSize(s, o)).filter((x): x is string => !!x); usCache.set(p, v); }
  return v;
}

/** Filter groups for a list, with counts that respect the other active filters. Empty options are left out. */
export function facetsFor(list: Product[], f: Filters, hide: FilterKey[] = []): Facet[] {
  const opts = (key: FilterKey, defs: { id: string; label: string }[]) => {
    const base = applyFilters(list, f, key);
    return defs.map((d) => ({ id: d.id, label: d.label, count: base.filter((p) => matchesFilter(p, key, d.id)).length })).filter((o) => o.count > 0);
  };
  const sizes = SIZE_ORDER.filter((s) => list.some((p) => usSizes(p).includes(s))).map((s) => ({ id: s, label: euFor(s) ? `US ${s} / EU ${euFor(s)}` : `US ${s}` }));
  // Sub-types: only those for the categories in this list, in category order.
  const cats = new Set(list.map((p) => p.category));
  const types: TagOption[] = cats.size ? Object.entries(SUBTYPES).filter(([c]) => cats.has(c as Product['category'])).flatMap(([, o]) => o) : ALL_SUBTYPES;
  const facets: Facet[] = [
    { key: 'type', label: 'Type', options: opts('type', types) },
    { key: 'vibe', label: 'Vibe', options: opts('vibe', VIBES) },
    { key: 'print', label: 'Print', options: opts('print', PRINTS) },
    { key: 'theme', label: 'Theme', options: opts('theme', THEMES) },
    { key: 'fit', label: 'Fit', options: opts('fit', CUTS) },
    { key: 'sleeve', label: 'Sleeve', options: opts('sleeve', SLEEVES) },
    { key: 'length', label: 'Length', options: opts('length', LENGTHS) },
    { key: 'material', label: 'Material', options: opts('material', MATERIALS) },
    { key: 'color', label: 'Color', options: opts('color', COLOR_FAMILIES) },
    { key: 'size', label: 'Size', options: opts('size', sizes) },
    { key: 'price', label: 'Price', options: opts('price', PRICE_RANGES) },
  ];
  return facets.filter((x) => !hide.includes(x.key) && x.options.length > 1);
}
