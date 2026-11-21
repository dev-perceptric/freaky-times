// How the store is organized: lines (Lingerie, Sleep & Lounge...), the categories inside them, plus vibes
// for browsing and filtering. FreakyTimes is a women's lingerie store, so there are no departments.

/** Kept for the import scripts and the hidden Printful catalog, which still list departments. */
export type Dept = 'women' | 'men';

export type LineId = 'lingerie' | 'sleep' | 'legwear' | 'costumes' | 'clubwear' | 'accessories';

export type CategoryId =
  // Lingerie
  | 'bra-sets' | 'bodysuits' | 'babydolls' | 'corsets' | 'bras' | 'panties' | 'garters'
  // Sleep & lounge
  | 'robes' | 'pajamas' | 'slips'
  // Legwear
  | 'stockings' | 'bodystockings'
  // Costumes
  | 'costumes'
  // Clubwear
  | 'dresses' | 'sets' | 'bikinis'
  // Accessories
  | 'chokers' | 'body-jewelry' | 'masks' | 'gloves' | 'pasties' | 'extras';

export const CDN = 'https://img.freakytimes.com';

export interface LineDef {
  id: LineId;
  label: string;
  blurb: string;
}

export const LINES: LineDef[] = [
  { id: 'lingerie', label: 'Lingerie', blurb: 'Bra sets, bodysuits, babydolls and corsets. Lace, mesh and bad ideas.' },
  { id: 'sleep', label: 'Sleep & Lounge', blurb: 'Silky robes, slips and pajama sets for staying in on purpose.' },
  { id: 'legwear', label: 'Legwear', blurb: 'Thigh highs, fishnets and bodystockings that finish the look.' },
  { id: 'costumes', label: 'Costumes & Roleplay', blurb: 'Bunny, maid, nurse and more. Pick a character, play the part.' },
  { id: 'clubwear', label: 'Clubwear & Swim', blurb: 'Bodycon dresses, matching sets and bikinis for going out.' },
  { id: 'accessories', label: 'Accessories', blurb: 'Chokers, body chains, masks and the little extras.' },
];

export interface CategoryDef {
  id: CategoryId;
  label: string;
  line: LineId;
  /** Kept so the import scripts can read this file; always women. */
  depts: Dept[];
}

const W: Dept[] = ['women'];

export const CATEGORIES: CategoryDef[] = [
  { id: 'bra-sets', label: 'Bra & Panty Sets', line: 'lingerie', depts: W },
  { id: 'bodysuits', label: 'Bodysuits & Teddies', line: 'lingerie', depts: W },
  { id: 'babydolls', label: 'Babydolls & Chemises', line: 'lingerie', depts: W },
  { id: 'corsets', label: 'Corsets & Bustiers', line: 'lingerie', depts: W },
  { id: 'bras', label: 'Bras & Bralettes', line: 'lingerie', depts: W },
  { id: 'panties', label: 'Panties & Thongs', line: 'lingerie', depts: W },
  { id: 'garters', label: 'Garters & Harnesses', line: 'lingerie', depts: W },

  { id: 'robes', label: 'Robes & Kimonos', line: 'sleep', depts: W },
  { id: 'pajamas', label: 'Pajama Sets', line: 'sleep', depts: W },
  { id: 'slips', label: 'Slips & Nightgowns', line: 'sleep', depts: W },

  { id: 'stockings', label: 'Stockings & Thigh Highs', line: 'legwear', depts: W },
  { id: 'bodystockings', label: 'Bodystockings & Fishnets', line: 'legwear', depts: W },

  { id: 'costumes', label: 'Costumes & Roleplay', line: 'costumes', depts: W },

  { id: 'dresses', label: 'Bodycon & Mini Dresses', line: 'clubwear', depts: W },
  { id: 'sets', label: 'Matching Sets', line: 'clubwear', depts: W },
  { id: 'bikinis', label: 'Bikinis & Swim', line: 'clubwear', depts: W },

  { id: 'chokers', label: 'Chokers & Collars', line: 'accessories', depts: W },
  { id: 'body-jewelry', label: 'Body Chains & Jewelry', line: 'accessories', depts: W },
  { id: 'masks', label: 'Masks & Blindfolds', line: 'accessories', depts: W },
  { id: 'gloves', label: 'Gloves & Sleeves', line: 'accessories', depts: W },
  { id: 'pasties', label: 'Pasties & Covers', line: 'accessories', depts: W },
  { id: 'extras', label: 'Extras', line: 'accessories', depts: W },
];

export const getLine = (id: string) => LINES.find((l) => l.id === id);
export const getCategory = (id: string) => CATEGORIES.find((c) => c.id === id);

/** Categories in a line. */
export function categoriesFor(line: LineId) {
  return CATEGORIES.filter((c) => c.line === line);
}

// ---------- vibes (a second way to browse) ----------

export interface VibeDef {
  id: string;
  label: string;
  blurb: string;
  match: RegExp;
}

/** Read from the words in each product name ("Red Lace Bra Set") and its #tags. */
export const VIBES: VibeDef[] = [
  { id: 'lace', label: 'Lace', blurb: 'Lace on lace on lace.', match: /\blace\b/i },
  { id: 'sheer', label: 'Sheer & Mesh', blurb: 'See-through on purpose.', match: /\b(sheer|mesh|see[- ]through|transparent|fishnet)\b/i },
  { id: 'satin', label: 'Satin & Silk', blurb: 'Smooth, shiny and soft to the touch.', match: /\b(satin|silk|silky)\b/i },
  { id: 'leather', label: 'Leather & Latex', blurb: 'Faux leather, vinyl and wet look.', match: /\b(leather|latex|vinyl|pvc|wet look|patent)\b/i },
  { id: 'strappy', label: 'Strappy & Cut-Out', blurb: 'Straps, cut-outs and open backs.', match: /\b(strappy|cut[- ]?out|caged|open|harness|bandage)\b/i },
  { id: 'cute', label: 'Cute & Coquette', blurb: 'Bows, ruffles and a sweet face.', match: /\b(bow|bows|ruffle|ruffled|coquette|kawaii|heart|hearts|cherry|frill)\b/i },
  { id: 'bridal', label: 'Bridal & White', blurb: 'White lace for the big night (or any night).', match: /\b(bridal|bride|wedding|honeymoon)\b/i },
  { id: 'dark', label: 'Goth & Dark', blurb: 'Black lace, crosses and a little danger.', match: /\b(goth|gothic|punk|dark|spike|spiked|studded|chain)\b/i },
  { id: 'plus', label: 'Plus Size', blurb: 'Curves welcome. Sizes up to 5XL.', match: /\b(plus size|plus|curvy|5xl|4xl)\b|#plus\b/i },
];

export const getVibe = (id: string) => VIBES.find((v) => v.id === id);

/** Text vibes match against: the name plus #tags. */
export const vibeText = (p: { name: string; tags?: string[] }) => [p.name, ...(p.tags ?? []).map((t) => `#${t}`)].join(' ');

// ---------- filters ----------

export interface TagDef {
  id: string;
  label: string;
  match: RegExp;
}

/** Basic color families, read from each product's color options. */
export const COLOR_FAMILIES: TagDef[] = [
  { id: 'black', label: 'Black', match: /black|charcoal|ink/i },
  { id: 'white', label: 'White', match: /white|ivory|cream|off white/i },
  { id: 'red', label: 'Red', match: /\bred\b|burgundy|wine|claret|maroon|scarlet/i },
  { id: 'pink', label: 'Pink', match: /pink|rose|fuchsia|magenta|blush/i },
  { id: 'purple', label: 'Purple', match: /purple|violet|lavender|lilac/i },
  { id: 'blue', label: 'Blue', match: /blue|navy|sky/i },
  { id: 'green', label: 'Green', match: /green|olive|mint|sage|emerald/i },
  { id: 'nude', label: 'Nude & Beige', match: /nude|skin|beige|khaki|apricot|champagne|tan\b|brown|coffee/i },
  { id: 'grey', label: 'Grey & Silver', match: /gr[ae]y|silver/i },
  { id: 'yellow', label: 'Yellow & Gold', match: /yellow|orange|gold/i },
];

export const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', 'One Size'];

export const PRICE_RANGES = [
  { id: 'under-20', label: 'Under $20', min: 0, max: 20 },
  { id: '20-30', label: '$20 to $30', min: 20, max: 30 },
  { id: '30-40', label: '$30 to $40', min: 30, max: 40 },
  { id: '40-up', label: '$40 and up', min: 40, max: Infinity },
];
