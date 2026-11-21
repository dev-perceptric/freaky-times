// Server side of infinite scrolling: builds the same product lists the pages show and turns them into light card data.
import type { Product } from './products';
import { formatPrice } from './money';
import { shotsFor } from './images';
import { img } from './img';
import { COLLECTIONS, GROUPS, SHOP, getCollection, getDept, isNew, productsIn, type GroupId } from './catalog';
import { FILTER_KEYS, applyFilters, type Filters } from './filters';
import { searchProducts } from './search';

export const PER_PAGE = 60;
export const RECS_FIRST = 12;
export const RECS_PER_PAGE = 24;

export interface Card {
  slug: string; name: string; price: string; isNew: boolean;
  img?: string; imgClass?: string; img2?: string; img2Class?: string;
  dots: string[]; more: number;
}

export function cardOf(p: Product): Card {
  const shots = shotsFor(p);
  const colors = p.colors.filter((c) => !/photo|default/i.test(c.name));
  return {
    slug: p.slug, name: p.name, price: formatPrice(p.price), isNew: isNew(p),
    img: shots[0]?.src ?? p.photos?.[0]?.src, imgClass: shots[0]?.style === 'Model' ? undefined : 'is-product',
    img2: shots[1]?.src, img2Class: shots[1] ? `photo-alt${shots[1].style === 'Model' ? '' : ' is-product'}` : undefined,
    dots: colors.length > 1 ? colors.slice(0, 5).map((c) => (c.image ? `center / cover url(${img(c.image, 96)}), ${c.hex}` : c.hex)) : [],
    more: colors.length > 5 ? colors.length - 5 : 0,
  };
}

export const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'new', label: 'Newest' },
  { id: 'price-asc', label: 'Price, low to high' },
  { id: 'price-desc', label: 'Price, high to low' },
];

/** Filters + sort, shared by the collection pages and the feed API so both show the same order. */
export function filterAndSort(products: Product[], search: Partial<Record<string, string>>) {
  const filters: Filters = {};
  for (const k of FILTER_KEYS) if (search[k]) filters[k] = search[k];
  const sort = SORTS.some((s) => s.id === search.sort) ? search.sort! : 'featured';
  let list = applyFilters(products, filters);
  if (sort === 'new') list = [...list].reverse();
  if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
  return { list, filters, sort };
}

/** Pieces that share the most photo tags with this one. */
export function similar(product: Product, pool: Product[]) {
  const a = product.attrs ?? {};
  const score = (p: Product) => {
    const b = p.attrs ?? {};
    let s = 0;
    if (b.sub && b.sub === a.sub) s += 3;
    if (b.vibe && b.vibe === a.vibe) s += 2;
    if (b.print && b.print === a.print) s += 1;
    s += (b.themes ?? []).filter((t) => a.themes?.includes(t)).length;
    s += (b.material ?? []).filter((t) => a.material?.includes(t)).length * 0.5;
    return s;
  };
  return pool.map((p) => ({ p, s: score(p) })).sort((x, y) => y.s - x.s).map((x) => x.p);
}

/** "You may also like": same category first (closest match first), then the same vibe from other categories. */
export function alsoLike(product: Product) {
  const others = SHOP.filter((p) => p.slug !== product.slug);
  const same = similar(product, others.filter((p) => p.category === product.category));
  const vibe = similar(product, others.filter((p) => p.category !== product.category && p.attrs?.vibe && p.attrs.vibe === product.attrs?.vibe));
  return [...same, ...vibe];
}

const NEUTRAL = new Set(['black', 'white', 'nude', 'grey']);
const STRONG_PRINT = new Set(['floral', 'leopard', 'hearts', 'polka-dot', 'pattern']);
const BLING = new Set(['rhinestone', 'lace', 'mesh', 'satin', 'feathers', 'pearl', 'chain', 'faux-leather', 'latex']);
/** How eye-catching a piece is (bold print, bling, colors, photos). Used to break ties. */
export function heroScore(p: Product) {
  const a = p.attrs ?? {};
  let s = 0;
  if (a.print && STRONG_PRINT.has(a.print)) s += 2;
  s += (a.material ?? []).filter((m) => BLING.has(m)).length;
  s += (a.themes ?? []).length * 0.5;
  s += Math.min(p.colors?.length ?? 0, 5) * 0.3;
  if ((p.photos?.length ?? 0) >= 4) s += 1;
  return s;
}

const groupTest = (g: GroupId) => COLLECTIONS.find((c) => c.group === g && c.parent)?.test;

/** How well a piece goes with this product: same vibe, shared themes, matching colors and materials. */
function pairScorer(product: Product) {
  const a = product.attrs ?? {};
  const myVibes = new Set([a.vibe, ...(a.vibes ?? [])].filter(Boolean));
  return (p: Product) => {
    const b = p.attrs ?? {};
    let s = 0;
    if (b.vibe && b.vibe === a.vibe) s += 4;
    else if (b.vibe && myVibes.has(b.vibe)) s += 2;
    s += (b.vibes ?? []).filter((v) => myVibes.has(v)).length;
    s += (b.themes ?? []).filter((t) => a.themes?.includes(t)).length * 1.5;
    if (b.print && b.print === a.print) s += 0.5;
    s += (b.material ?? []).filter((m) => a.material?.includes(m)).length * 0.75;
    if (b.color && a.color) s += b.color === a.color ? 1 : NEUTRAL.has(b.color) || NEUTRAL.has(a.color) ? 0.5 : 0;
    return s + heroScore(p) * 0.15;
  };
}

/** Pieces from one group (Skirts, Shoes...) that go with this product. */
export function pairWith(product: Product, group: GroupId) {
  const test = groupTest(group);
  if (!test) return [];
  const score = pairScorer(product);
  return SHOP.filter((p) => p.slug !== product.slug && test(p)).map((p) => ({ p, s: score(p) })).sort((x, y) => y.s - x.s).map((x) => x.p);
}

// ---------- Complete the look: one piece from each slot that finishes an outfit ----------

interface Slot { cats: string[]; sub?: string[]; not?: RegExp }
const LINGERIE = ['bra-sets', 'bodysuits', 'babydolls', 'corsets', 'bras', 'panties', 'garters'];
const SLEEP = ['robes', 'pajamas', 'slips'];
const ACCESSORIES = ['chokers', 'body-jewelry', 'masks', 'gloves', 'pasties', 'extras'];
const S: Record<string, Slot> = {
  set: { cats: ['bra-sets', 'bodysuits', 'babydolls'] },
  undies: { cats: ['bra-sets', 'bras', 'panties', 'bodysuits'] },
  robe: { cats: ['robes'] },
  legs: { cats: ['stockings', 'bodystockings'] },
  garter: { cats: ['garters'] },
  choker: { cats: ['chokers'] },
  jewelry: { cats: ['body-jewelry', 'chokers'] },
  mask: { cats: ['masks', 'gloves'] },
  accessory: { cats: ['chokers', 'body-jewelry', 'masks', 'gloves'] },
};
const PLANS: [string[], Slot[]][] = [
  [LINGERIE, [S.legs, S.garter, S.robe, S.choker]],
  [SLEEP, [S.set, S.legs, S.mask, S.jewelry]],
  [['stockings', 'bodystockings'], [S.set, S.garter, S.robe, S.accessory]],
  [['costumes'], [S.legs, S.choker, S.mask, S.undies]],
  [['dresses', 'sets', 'bikinis'], [S.legs, S.jewelry, S.choker, S.undies]],
  [ACCESSORIES, [S.set, S.legs, S.robe, S.accessory]],
];

const SUB_LABEL: Record<string, string> = {
  'thigh-highs': 'Thigh Highs', 'lace-top-stockings': 'Stockings', 'fishnet-stockings': 'Fishnets', tights: 'Tights',
  choker: 'Choker', collar: 'Collar', 'body-chain': 'Body Chain', 'garter-belt': 'Garter Belt', harness: 'Harness', blindfold: 'Blindfold',
};
const CAT_LABEL: Record<string, string> = {
  'bra-sets': 'Set', bodysuits: 'Bodysuit', babydolls: 'Babydoll', corsets: 'Corset', bras: 'Bra', panties: 'Panties', garters: 'Garter',
  robes: 'Robe', pajamas: 'Pajamas', slips: 'Slip', stockings: 'Stockings', bodystockings: 'Bodystocking', costumes: 'Costume',
  dresses: 'Dress', sets: 'Set', bikinis: 'Bikini', chokers: 'Choker', 'body-jewelry': 'Body Jewelry', masks: 'Mask', gloves: 'Gloves', pasties: 'Pasties',
};
/** Short name for a piece's role in the look ("Skirt", "Tights", "Choker"). */
export function lookLabel(p: Product) {
  const sub = p.attrs?.sub;
  if (sub && SUB_LABEL[sub]) return SUB_LABEL[sub];
  return CAT_LABEL[p.category] ?? 'Accessory';
}

/** Up to four pieces, one per slot, that turn this product into a full outfit. */
export function completeLook(product: Product) {
  const plan = PLANS.find(([cats]) => cats.includes(product.category))?.[1] ?? PLANS[0][1];
  const score = pairScorer(product);
  const used = new Set([product.slug]);
  const out: Product[] = [];
  plan.forEach((slot, i) => {
    const ranked = SHOP
      .filter((p) => !used.has(p.slug) && !p.afterDark && slot.cats.includes(p.category) && !(slot === S.accessory && p.category === product.category))
      .filter((p) => (!slot.sub || slot.sub.includes(p.attrs?.sub ?? '')) && !slot.not?.test(p.name))
      .map((p) => ({ p, s: score(p) }))
      .sort((x, y) => y.s - x.s);
    if (!ranked.length) return;
    // Pick from the close matches, the same one each time for this product, so one piece doesn't show up on every page.
    const close = ranked.filter((r) => r.s >= ranked[0].s - 1).slice(0, 6);
    const pick = close[hash(`${product.slug}:${i}`) % close.length].p;
    used.add(pick.slug);
    out.push(pick);
  });
  return out;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

let groupCounts: Map<GroupId, number> | undefined;
/** The choices for the "You may also like" picker, with how many pieces each has. */
export function recOptions(product: Product) {
  void product;
  groupCounts ??= new Map(GROUPS.map((g) => [g.id, SHOP.filter((p) => groupTest(g.id)?.(p)).length]));
  return GROUPS
    .map((g) => ({ id: g.id as string, label: g.label, count: groupCounts!.get(g.id)! }))
    .filter((o) => o.count >= 5);
}

/** One page of cards for the feed API. Returns null for an unknown source. */
export function feedPage(q: URLSearchParams): { cards: Card[]; next: number | null } | null {
  const page = Math.max(1, Number(q.get('page')) || 1);
  const kind = q.get('kind');
  let list: Product[];
  let first = PER_PAGE, per = PER_PAGE;
  if (kind === 'collection') {
    const c = getCollection(q.get('slug') ?? '');
    const dept = q.get('dept') ? getDept(q.get('dept')!) : undefined;
    if (!c || (q.get('dept') && !dept)) return null;
    list = filterAndSort(productsIn(c, dept?.id), Object.fromEntries(q)).list;
  } else if (kind === 'search') {
    const term = (q.get('q') ?? '').trim().slice(0, 80);
    list = filterAndSort(term ? searchProducts(SHOP, term) : SHOP, Object.fromEntries(q)).list;
  } else if (kind === 'like') {
    const p = SHOP.find((x) => x.slug === q.get('slug'));
    if (!p) return null;
    const g = q.get('group');
    list = g && GROUPS.some((x) => x.id === g) ? pairWith(p, g as GroupId) : alsoLike(p);
    first = RECS_FIRST; per = RECS_PER_PAGE;
  } else return null;
  const start = page === 1 ? 0 : first + (page - 2) * per;
  const size = page === 1 ? first : per;
  const slice = list.slice(start, start + size);
  return { cards: slice.map(cardOf), next: start + size < list.length ? page + 1 : null };
}
