// The store's collections: every page under /collections/<slug>. Collections are built from each product's
// category, name and photo tags (lib/tags.ts), so new imports land in the right places on their own.
// FreakyTimes is women-only, so there are no department pages (DEPTS is empty; the types stay for old code).
import { PRODUCTS, type Product } from './products';
import { vibeMatches } from './filters';

export type DeptId = 'womens' | 'mens';
export const DEPTS: { id: DeptId; label: string; short: string; blurb: string }[] = [];
export const getDept = (id?: string) => DEPTS.find((d) => d.id === id);
export const inDept = (p: Product, d?: DeptId) => !d || p.depts.includes(d === 'womens' ? 'women' : 'men');

export type GroupId = 'lingerie' | 'sleep' | 'legwear' | 'costumes' | 'clubwear' | 'accessories' | 'themes' | 'new' | 'hidden';

export const GROUPS: { id: GroupId; label: string }[] = [
  { id: 'lingerie', label: 'Lingerie' },
  { id: 'sleep', label: 'Sleep & Lounge' },
  { id: 'legwear', label: 'Legwear' },
  { id: 'costumes', label: 'Costumes' },
  { id: 'clubwear', label: 'Clubwear & Swim' },
  { id: 'accessories', label: 'Accessories' },
];

export interface CollectionDef {
  slug: string;
  title: string;
  group: GroupId;
  /** The group's main collection ("All Lingerie"). */
  parent?: boolean;
  blurb: string;
  test: (p: Product) => boolean;
  /** Sort the list (default: store order). */
  order?: 'new';
  /** Kept for old code; every collection is women's. */
  womenOnly?: boolean;
}

const cat = (...ids: string[]) => (p: Product) => ids.includes(p.category);
const sub = (...ids: string[]) => (p: Product) => !!p.attrs?.sub && ids.includes(p.attrs.sub);
const mat = (id: string) => (p: Product) => !!p.attrs?.material?.includes(id);
const named = (re: RegExp) => (p: Product) => re.test(p.name);
const and = (...fs: ((p: Product) => boolean)[]) => (p: Product) => fs.every((f) => f(p));
const or = (...fs: ((p: Product) => boolean)[]) => (p: Product) => fs.some((f) => f(p));
const vibe = (id: string) => (p: Product) => vibeMatches(p, id);
const LINGERIE = cat('bra-sets', 'bodysuits', 'babydolls', 'corsets', 'bras', 'panties', 'garters');

export const COLLECTIONS: CollectionDef[] = [
  // Lingerie
  { slug: 'lingerie', title: 'Lingerie', group: 'lingerie', parent: true, test: LINGERIE,
    blurb: 'Bra sets, bodysuits, babydolls, corsets and more. Lace, mesh and bad ideas.' },
  { slug: 'lingerie-sets', title: 'Lingerie Sets', group: 'lingerie', test: cat('bra-sets'),
    blurb: 'Matching bra and panty sets, from sweet lace to strappy three piece sets with garters.' },
  { slug: 'bodysuits-teddies', title: 'Bodysuits & Teddies', group: 'lingerie', test: cat('bodysuits'),
    blurb: 'One piece, zero effort. Lace, mesh and cut-out bodysuits and teddies.' },
  { slug: 'babydolls-chemises', title: 'Babydolls & Chemises', group: 'lingerie', test: cat('babydolls'),
    blurb: 'Short, sheer and flowy. Babydolls and chemises that do the talking.' },
  { slug: 'corsets-bustiers', title: 'Corsets & Bustiers', group: 'lingerie', test: cat('corsets'),
    blurb: 'Lace-up corsets, bustiers and waist cinchers for a snatched waist.' },
  { slug: 'bras-bralettes', title: 'Bras & Bralettes', group: 'lingerie', test: cat('bras'),
    blurb: 'Lace bralettes, push-ups and open cup bras.' },
  { slug: 'panties-thongs', title: 'Panties & Thongs', group: 'lingerie', test: cat('panties'),
    blurb: 'Thongs, G-strings, cheekies and the ones with surprises in the back.' },
  { slug: 'garters-harnesses', title: 'Garters & Harnesses', group: 'lingerie', test: cat('garters'),
    blurb: 'Garter belts, leg garters and strappy body harnesses.' },

  // Sleep & lounge
  { slug: 'sleep-lounge', title: 'Sleep & Lounge', group: 'sleep', parent: true, test: cat('robes', 'pajamas', 'slips'),
    blurb: 'Silky robes, slips and pajama sets for staying in on purpose.' },
  { slug: 'robes-kimonos', title: 'Robes & Kimonos', group: 'sleep', test: cat('robes'), blurb: 'Satin, lace and sheer robes to throw over anything (or nothing).' },
  { slug: 'pajama-sets', title: 'Pajama Sets', group: 'sleep', test: cat('pajamas'), blurb: 'Satin cami sets, lace shorts sets and silky long pajamas.' },
  { slug: 'slips-nightgowns', title: 'Slips & Nightgowns', group: 'sleep', test: cat('slips'), blurb: 'Slip dresses and nightgowns, short and silky.' },

  // Legwear
  { slug: 'legwear', title: 'Legwear', group: 'legwear', parent: true, test: cat('stockings', 'bodystockings'),
    blurb: 'Thigh highs, fishnets and bodystockings that finish the look.' },
  { slug: 'stockings-thigh-highs', title: 'Stockings & Thigh Highs', group: 'legwear', test: cat('stockings'), blurb: 'Lace top thigh highs, fishnet stockings and sheer tights.' },
  { slug: 'bodystockings', title: 'Bodystockings & Fishnets', group: 'legwear', test: cat('bodystockings'), blurb: 'Head to toe fishnet and mesh bodystockings.' },

  // Costumes
  { slug: 'costumes-roleplay', title: 'Costumes & Roleplay', group: 'costumes', parent: true, test: cat('costumes'),
    blurb: 'Bunny, maid, nurse, kitty and more. Pick a character, play the part.' },
  { slug: 'bunny-costumes', title: 'Bunny Costumes', group: 'costumes', test: and(cat('costumes'), or(sub('bunny'), named(/bunny|rabbit/i))), blurb: 'Ears, tails and attitude.' },
  { slug: 'maid-costumes', title: 'Maid Costumes', group: 'costumes', test: and(cat('costumes'), or(sub('maid'), named(/maid/i))), blurb: 'Lace aprons, frills and a feather duster energy.' },
  { slug: 'nurse-costumes', title: 'Nurse Costumes', group: 'costumes', test: and(cat('costumes'), or(sub('nurse'), named(/nurse/i))), blurb: 'The doctor will see you now.' },
  { slug: 'kitty-costumes', title: 'Kitty Costumes', group: 'costumes', test: and(cat('costumes'), or(sub('cat'), named(/\b(cat|kitty|kitten)\b/i))), blurb: 'Cat ears, collars and claws out.' },

  // Clubwear & swim
  { slug: 'clubwear-swim', title: 'Clubwear & Swim', group: 'clubwear', parent: true, test: cat('dresses', 'sets', 'bikinis'),
    blurb: 'Bodycon dresses, sheer sets and bikinis for going out and showing off.' },
  { slug: 'bodycon-dresses', title: 'Bodycon & Mini Dresses', group: 'clubwear', test: cat('dresses'), blurb: 'Tight, short and sheer dresses for the club.' },
  { slug: 'matching-sets', title: 'Matching Sets', group: 'clubwear', test: cat('sets'), blurb: 'Two piece sets, catsuits and jumpsuits.' },
  { slug: 'bikinis-swim', title: 'Bikinis & Swim', group: 'clubwear', test: cat('bikinis'), blurb: 'Micro bikinis, one pieces and cover ups.' },

  // Accessories
  { slug: 'accessories', title: 'Accessories', group: 'accessories', parent: true, test: cat('chokers', 'body-jewelry', 'masks', 'gloves', 'pasties'),
    blurb: 'Chokers, body chains, masks, gloves and the little extras.' },
  { slug: 'chokers-collars', title: 'Chokers & Collars', group: 'accessories', test: cat('chokers'), blurb: 'Lace chokers, leather collars and O-rings.' },
  { slug: 'body-chains', title: 'Body Chains & Jewelry', group: 'accessories', test: cat('body-jewelry'), blurb: 'Body chains, waist chains and sparkly extras.' },
  { slug: 'masks-blindfolds', title: 'Masks & Blindfolds', group: 'accessories', test: cat('masks'), blurb: 'Lace masks, masquerade masks and satin blindfolds.' },
  { slug: 'gloves-sleeves', title: 'Gloves & Sleeves', group: 'accessories', test: cat('gloves'), blurb: 'Lace, satin and fishnet gloves.' },
  { slug: 'pasties-covers', title: 'Pasties & Covers', group: 'accessories', test: cat('pasties'), blurb: 'Pasties, nipple covers and body tape.' },

  // Vibes
  { slug: 'lace-lingerie', title: 'Lace Lingerie', group: 'themes', test: or(mat('lace'), vibe('lace')), blurb: 'Lace on lace on lace.' },
  { slug: 'sheer-lingerie', title: 'Sheer & Mesh', group: 'themes', test: or(mat('mesh'), vibe('sheer')), blurb: 'See-through on purpose.' },
  { slug: 'satin-silk', title: 'Satin & Silk', group: 'themes', test: or(mat('satin'), vibe('satin')), blurb: 'Smooth, shiny and soft to the touch.' },
  { slug: 'leather-latex', title: 'Leather & Latex', group: 'themes', test: or(mat('faux-leather'), mat('latex'), vibe('leather')), blurb: 'Faux leather, vinyl and wet look.' },
  { slug: 'strappy-lingerie', title: 'Strappy & Cut-Out', group: 'themes', test: vibe('strappy'), blurb: 'Straps, cut-outs and open backs.' },
  { slug: 'cute-lingerie', title: 'Cute & Coquette', group: 'themes', test: vibe('cute'), blurb: 'Bows, ruffles and a sweet face.' },
  { slug: 'bridal-lingerie', title: 'Bridal & White', group: 'themes', test: vibe('bridal'), blurb: 'White lace for the big night, or any night.' },
  { slug: 'goth-lingerie', title: 'Goth & Dark', group: 'themes', test: vibe('dark'), blurb: 'Black lace, chains and a little danger.' },
  { slug: 'plus-size-lingerie', title: 'Plus Size', group: 'themes', test: vibe('plus'), blurb: 'Curves welcome, in sizes up to 5XL.' },
  { slug: 'red-lingerie', title: 'Red Lingerie', group: 'themes', test: or((p) => p.attrs?.color === 'red', named(/\b(red|wine|burgundy)\b/i)), blurb: 'Red means go.' },
  { slug: 'black-lingerie', title: 'Black Lingerie', group: 'themes', test: or((p) => p.attrs?.color === 'black', named(/\bblack\b/i)), blurb: 'Always in style, never innocent.' },

  // New
  { slug: 'new-in', title: 'New In', group: 'new', order: 'new', test: () => true, blurb: 'The latest drops. Get them before they sell out.' },
  { slug: 'trending', title: 'Trending Now', group: 'new', test: () => true, blurb: 'What everyone is adding to their bag right now.' },
  { slug: 'under-20', title: 'Under $20', group: 'new', test: (p) => p.price < 20, blurb: 'Freaky on a budget.' },
];

/** Everything shoppers can browse (After Dark pieces and extras stay out of collections). */
export const SHOP = PRODUCTS.filter((p) => !p.afterDark && p.category !== 'extras');
const ORDER = new Map(SHOP.map((p, i) => [p.slug, i]));
/** The most recently imported pieces get a "New" badge. */
const NEW_FROM = SHOP.length - 200;
export const isNew = (p: Product) => (ORDER.get(p.slug) ?? -1) >= NEW_FROM;

export const ALL: CollectionDef = { slug: 'all', title: 'Shop All', group: 'hidden', test: () => true, blurb: 'Every piece in the store: lingerie, sleepwear, legwear, costumes, clubwear and accessories.' };
export const getCollection = (slug: string) => (slug === 'all' ? ALL : COLLECTIONS.find((c) => c.slug === slug));

/** Core lingerie first, so mixed rows lead with sets and bodysuits instead of accessories. */
const MIX_ORDER = ['bra-sets', 'bodysuits', 'babydolls', 'corsets', 'robes', 'stockings', 'bras', 'panties', 'costumes', 'garters', 'pajamas',
  'slips', 'bodystockings', 'dresses', 'sets', 'bikinis', 'chokers', 'body-jewelry', 'masks', 'gloves', 'pasties'];

/** Newest pieces first, taking one from each category in turn so no one category takes over. */
export function mixed(list: Product[], rank: (a: Product, b: Product) => number = (a, b) => ORDER.get(b.slug)! - ORDER.get(a.slug)!) {
  const byCat = new Map<string, Product[]>(MIX_ORDER.map((c) => [c, []]));
  for (const p of [...list].sort(rank)) {
    if (byCat.has(p.category)) byCat.get(p.category)!.push(p);
  }
  const out: Product[] = [];
  for (let i = 0; ; i++) {
    let added = false;
    for (const l of byCat.values()) if (l[i]) { out.push(l[i]); added = true; }
    if (!added) break;
  }
  return out;
}

const cache = new Map<string, Product[]>();
/** Products in a collection. */
export function productsIn(c: CollectionDef, dept?: DeptId): Product[] {
  const key = `${c.slug}/${dept ?? ''}`;
  if (cache.has(key)) return cache.get(key)!;
  let list = SHOP.filter((p) => inDept(p, dept) && c.test(p));
  if (c.order === 'new') list = [...list].sort((a, b) => ORDER.get(b.slug)! - ORDER.get(a.slug)!);
  // Trending: pieces sold in the most colors and sizes (usually the seller's best sellers), mixed across categories.
  if (c.slug === 'trending') list = mixed(list, (a, b) => b.colors.length * b.sizes.length - a.colors.length * a.sizes.length || ORDER.get(b.slug)! - ORDER.get(a.slug)!);
  cache.set(key, list);
  return list;
}

export function collectionHref(slug: string, dept?: DeptId) {
  return `/collections/${slug}${dept ? `/${dept}` : ''}`;
}

export function collectionTitle(c: CollectionDef, dept?: DeptId) {
  const d = getDept(dept);
  return d ? `${c.title} for ${d.label}` : c.title;
}

/** Every /collections path that has products, for static generation and the sitemap. */
export function allCollectionPaths(): { slug: string; dept?: DeptId }[] {
  return [ALL, ...COLLECTIONS].filter((c) => productsIn(c).length).map((c) => ({ slug: c.slug }));
}

/** The main collection for a category, used for breadcrumbs and old links. */
export const CATEGORY_COLLECTION: Record<string, string> = {
  'bra-sets': 'lingerie-sets', bodysuits: 'bodysuits-teddies', babydolls: 'babydolls-chemises', corsets: 'corsets-bustiers', bras: 'bras-bralettes',
  panties: 'panties-thongs', garters: 'garters-harnesses', robes: 'robes-kimonos', pajamas: 'pajama-sets', slips: 'slips-nightgowns',
  stockings: 'stockings-thigh-highs', bodystockings: 'bodystockings', costumes: 'costumes-roleplay', dresses: 'bodycon-dresses', sets: 'matching-sets',
  bikinis: 'bikinis-swim', chokers: 'chokers-collars', 'body-jewelry': 'body-chains', masks: 'masks-blindfolds', gloves: 'gloves-sleeves', pasties: 'pasties-covers',
};

export interface Crumb { label: string; href: string }

/** Breadcrumbs for a product: Home / Lingerie / Lingerie Sets. */
export function productTrail(p: Product): Crumb[] {
  const own = getCollection(CATEGORY_COLLECTION[p.category] ?? '');
  const parent = own && COLLECTIONS.find((c) => c.group === own.group && c.parent);
  const trail: Crumb[] = [{ label: 'Home', href: '/' }];
  if (parent && parent !== own) trail.push({ label: parent.title, href: collectionHref(parent.slug) });
  if (own) trail.push({ label: own.title, href: collectionHref(own.slug) });
  return trail;
}

// ---------- menus ----------

export interface MenuLink { label: string; href: string; count: number }
export interface MenuGroup { id: GroupId; label: string; href: string; links: MenuLink[] }
export interface MenuDept { id: DeptId; label: string; href: string; groups: MenuGroup[]; cover?: string }
export interface Menu { all: MenuGroup[]; depts: MenuDept[]; themes: MenuLink[]; fresh: MenuLink[] }

/** First photo of a list, for tiles and menu covers. */
export function coverOf(list: Product[], skip = 0) {
  const withPhotos = list.filter((p) => p.photos?.length);
  return (withPhotos[skip] ?? withPhotos[0])?.photos?.[0]?.src;
}

function menuGroups(): MenuGroup[] {
  return GROUPS.map((g) => {
    const cols = COLLECTIONS.filter((c) => c.group === g.id);
    const parent = cols.find((c) => c.parent);
    const links = cols.filter((c) => !c.parent).map((c) => ({ label: c.title, href: collectionHref(c.slug), count: productsIn(c).length }))
      .filter((l) => l.count >= 1);
    return { id: g.id, label: g.label, href: parent ? collectionHref(parent.slug) : '#', links, count: parent ? productsIn(parent).length : 0 };
  }).filter((g) => g.count > 0).map(({ count: _c, ...g }) => g);
}

export function buildMenu(): Menu {
  const links = (group: GroupId, min = 3) => COLLECTIONS.filter((c) => c.group === group)
    .map((c) => ({ label: c.title, href: collectionHref(c.slug), count: productsIn(c).length }))
    .filter((l) => l.count >= min);
  return { all: menuGroups(), depts: [], themes: links('themes'), fresh: links('new', 1) };
}

// ---------- old /shop links ----------

/** Where an old /shop/... link goes now. */
export function legacyHref(path: string[] = [], query: Record<string, string | undefined> = {}): string {
  const q = new URLSearchParams(Object.entries(query).filter(([k, v]) => v && k !== 'c') as [string, string][]);
  if (q.has('q')) return `/search?${q}`;
  const tail = q.toString() ? `?${q}` : '';
  const [a, b] = path;
  if (!a) return `/collections/all${tail}`;
  if (a === 'new') return `/collections/new-in${tail}`;
  const slug = (b && CATEGORY_COLLECTION[b]) || CATEGORY_COLLECTION[a] || (getCollection(a) ? a : 'all');
  return `${collectionHref(slug)}${tail}`;
}
