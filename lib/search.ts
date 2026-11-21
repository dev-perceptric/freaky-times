import type { Product } from './products';
import { getCategory, getLine } from './taxonomy';
import { attrWords } from './tags';

/** Words that mean the same thing to shoppers. Left side is what people type. */
const SYNONYMS: Record<string, string> = {
  lingerie: 'lingerie', bra: 'bra', bras: 'bra', bralette: 'bra', bralettes: 'bra', panty: 'panties', pantie: 'panties', knickers: 'panties',
  thongs: 'thong', gstring: 'string', teddy: 'bodysuit', teddies: 'bodysuit', bodysuits: 'bodysuit', babydolls: 'babydoll', chemises: 'chemise',
  nightie: 'nightgown', nighty: 'nightgown', pjs: 'pajama', pyjama: 'pajama', pyjamas: 'pajama', pajamas: 'pajama', robes: 'robe',
  stocking: 'stockings', thighhighs: 'thigh', fishnets: 'fishnet', corsets: 'corset', bustiers: 'bustier', costumes: 'costume',
  sheer: 'mesh', seethrough: 'mesh', silk: 'satin', latex: 'leather', vinyl: 'leather', gothic: 'goth', kitty: 'cat', kitten: 'cat',
  grey: 'gray', bunny: 'bunny', rabbit: 'bunny',
};

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9$ ]+/g, ' ').replace(/\s+/g, ' ').trim();

const stem = (w: string) => {
  const s = SYNONYMS[w] ?? w;
  return s.length > 3 && s.endsWith('s') && !s.endsWith('ss') ? s.slice(0, -1) : s;
};

interface Doc { p: Product; name: string; all: string }

let cache: { list: Product[]; docs: Doc[] } | null = null;

function docsFor(list: Product[]): Doc[] {
  if (cache?.list === list) return cache.docs;
  const docs = list.map((p) => {
    const name = norm(p.name).split(' ').map(stem).join(' ');
    const extra = [getCategory(p.category)?.label, getLine(p.line)?.label, attrWords(p.attrs), ...(p.tags ?? []), ]
      .filter(Boolean).join(' ');
    return { p, name, all: `${name} ${norm(extra).split(' ').map(stem).join(' ')}` };
  });
  cache = { list, docs };
  return docs;
}

/** Products matching every word of the query, best matches first (words in the name count most). */
export function searchProducts(list: Product[], query: string): Product[] {
  const words0 = norm(query).split(' ').filter(Boolean);
  const words = words0.map(stem);
  if (!words.length) return list;
  const hit = (text: string, w: string) => (` ${text} `).includes(` ${w}`);
  const scored: { p: Product; score: number }[] = [];
  for (const d of docsFor(list)) {
    let score = 0;
    let ok = true;
    for (const w of words) {
      if (hit(d.name, w)) score += 3;
      else if (hit(d.all, w)) score += 1;
      else { ok = false; break; }
    }
    if (ok) scored.push({ p: d.p, score: score + (d.name.startsWith(words[0]) ? 1 : 0) });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.p);
}
