// Detailed tags read from each product's photos (see scripts/ae_tags.py). One list feeds the filters,
// the collection pages and search.
import VOCAB from './tag-vocab.json';

export interface Attrs {
  sub?: string;
  print?: string;
  themes?: string[];
  cut?: string[];
  neck?: string;
  sleeve?: string;
  length?: string;
  material?: string[];
  color?: string;
  vibe?: string;
  vibes?: string[];
  unisex?: boolean;
}

export interface TagOption { id: string; label: string }

const opts = (pairs: string[][]): TagOption[] => pairs.map(([id, label]) => ({ id, label })).filter((o) => o.id !== 'none');

/** Sub-types per category, e.g. jackets → leather, denim, bomber... */
export const SUBTYPES: Record<string, TagOption[]> = Object.fromEntries(Object.entries(VOCAB.sub).map(([cat, pairs]) => [cat, opts(pairs)]));
export const ALL_SUBTYPES: TagOption[] = Object.values(SUBTYPES).flat();
export const PRINTS = opts(VOCAB.print);
export const THEMES = opts(VOCAB.themes);
export const CUTS = opts(VOCAB.cut);
export const NECKS = opts(VOCAB.neck);
export const SLEEVES = opts(VOCAB.sleeve);
export const LENGTHS = opts(VOCAB.length);
export const MATERIALS = opts(VOCAB.material);
export const COLORS = opts(VOCAB.color);

const label = (list: TagOption[], id?: string) => (id ? list.find((o) => o.id === id)?.label : undefined);
export const subLabel = (id?: string) => label(ALL_SUBTYPES, id);

/** Plain words for every tag on a product, used by search. */
export function attrWords(a?: Attrs): string {
  if (!a) return '';
  return [
    subLabel(a.sub), label(PRINTS, a.print), label(NECKS, a.neck), label(SLEEVES, a.sleeve), label(LENGTHS, a.length), label(COLORS, a.color),
    ...(a.themes ?? []).map((t) => label(THEMES, t)), ...(a.cut ?? []).map((t) => label(CUTS, t)), ...(a.material ?? []).map((t) => label(MATERIALS, t)),
    a.vibe, ...(a.vibes ?? []),
  ].filter(Boolean).join(' ');
}
