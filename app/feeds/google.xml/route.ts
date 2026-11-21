import { PRODUCTS, type Product } from '@/lib/products';
import { getCategory } from '@/lib/taxonomy';
import { COLORS, CUTS, MATERIALS, subLabel } from '@/lib/tags';
import { BRAND, DELIVERY_MAX, DELIVERY_MIN, SITE_URL, STORE_NAME } from '@/lib/site';

// Google Merchant Center product feed: one item per color and size, grouped by product.
// Built once at build time, so it always matches the catalog that is live.
export const dynamic = 'force-static';

/** Pieces Google Shopping may reject (After Dark and extras). Those stay on the site but not in the feed. */
const RISKY_PRINTS = new Set(['music', 'anime', 'screen', 'logo']);
function inFeed(p: Product) {
  if (p.afterDark || p.category === 'extras') return false;
  if (p.tags?.includes('anime') || p.tags?.includes('nofeed')) return false;
  if (p.attrs?.print && RISKY_PRINTS.has(p.attrs.print)) return false;
  return true;
}

const GOOGLE_CATEGORY: Record<string, string> = {
  tops: 'Apparel & Accessories > Clothing > Shirts & Tops',
  knits: 'Apparel & Accessories > Clothing > Shirts & Tops',
  hoodies: 'Apparel & Accessories > Clothing > Activewear > Sweatshirts',
  jackets: 'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets',
  skirts: 'Apparel & Accessories > Clothing > Skirts',
  jeans: 'Apparel & Accessories > Clothing > Pants',
  pants: 'Apparel & Accessories > Clothing > Pants',
  shorts: 'Apparel & Accessories > Clothing > Shorts',
  dresses: 'Apparel & Accessories > Clothing > Dresses',
  sets: 'Apparel & Accessories > Clothing > Outfit Sets',
  bikinis: 'Apparel & Accessories > Clothing > Swimwear',
  jewelry: 'Apparel & Accessories > Jewelry',
  legwear: 'Apparel & Accessories > Clothing > Underwear & Socks > Socks',
  'arm-warmers': 'Apparel & Accessories > Clothing Accessories > Arm Warmers & Sleeves',
  hats: 'Apparel & Accessories > Clothing Accessories > Hats',
  hair: 'Apparel & Accessories > Clothing Accessories > Hair Accessories',
  bags: 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags',
  belts: 'Apparel & Accessories > Clothing Accessories > Belts',
  shoes: 'Apparel & Accessories > Shoes',
};
const googleCategory = (p: Product) => GOOGLE_CATEGORY[p.category] ?? GOOGLE_CATEGORY[p.line] ?? 'Apparel & Accessories > Clothing';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const tag = (k: string, v?: string | number) => (v === undefined || v === '' ? '' : `<g:${k}>${esc(String(v))}</g:${k}>`);
const idPart = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
const label = (list: { id: string; label: string }[], id?: string) => list.find((o) => o.id === id)?.label;

function description(p: Product) {
  const a = p.attrs;
  const bits = [
    p.blurb,
    a?.sub && `${subLabel(a.sub)?.replace(/s$/, '')}.`,
    a?.material?.length && `Material: ${a.material.map((m) => label(MATERIALS, m)).join(', ')}.`,
    a?.cut?.length && `Fit: ${a.cut.map((c) => label(CUTS, c)).join(', ')}.`,
    ...(p.details ?? []).filter((d) => !/overseas partner/i.test(d)).map((d) => (/[.!?]$/.test(d) ? d : `${d}.`)),
    `Free shipping. Arrives in about ${p.ae?.delivery ?? p.cj?.delivery ?? `${DELIVERY_MIN}-${DELIVERY_MAX} days`}.`,
  ];
  return `${p.name}. ${bits.filter(Boolean).join(' ')}`.slice(0, 4900);
}

/** In-stock color and size combos for a product. */
function variants(p: Product): { color: string; size: string }[] {
  if (p.ae) return p.ae.variants.map((v) => ({ color: v.color, size: v.size }));
  if (p.cj) return p.cj.variants.map((v) => ({ color: v.color, size: v.size }));
  return p.colors.flatMap((c) => p.sizes.map((s) => ({ color: c.name, size: s })));
}

function items(p: Product): string[] {
  const photos = p.photos ?? [];
  const group = p.code || p.slug;
  const gender = p.depts.includes('men') ? 'unisex' : 'female';
  const plainColor = label(COLORS, p.attrs?.color) ?? '';
  const seen = new Set<string>();
  return variants(p).flatMap(({ color, size }) => {
    const id = `${group}-${idPart(color)}-${idPart(size)}`.slice(0, 50);
    if (seen.has(id)) return [];
    seen.add(id);
    const forColor = photos.filter((ph) => ph.color === color);
    const imgs = [...forColor, ...photos.filter((ph) => ph.color !== color)].map((ph) => ph.src);
    if (!imgs.length) return [];
    // "As Photo" style option names mean nothing to a shopper: use the color read from the photo.
    const colorName = /photo|picture|default|style|^\d+$/i.test(color) ? plainColor : color;
    return [
      '<item>' +
        tag('id', id) +
        tag('item_group_id', group) +
        `<title>${esc(p.name.slice(0, 150))}</title>` +
        `<description>${esc(description(p))}</description>` +
        `<link>${esc(`${SITE_URL}/product/${p.slug}`)}</link>` +
        tag('image_link', imgs[0]) +
        imgs.slice(1, 11).map((src) => tag('additional_image_link', src)).join('') +
        tag('availability', 'in_stock') +
        tag('price', `${p.price.toFixed(2)} USD`) +
        tag('condition', 'new') +
        tag('brand', BRAND) +
        tag('identifier_exists', 'no') +
        tag('google_product_category', googleCategory(p)) +
        tag('product_type', [getCategory(p.category)?.label, subLabel(p.attrs?.sub)].filter(Boolean).join(' > ')) +
        tag('gender', gender) +
        tag('age_group', 'adult') +
        tag('color', colorName.slice(0, 100)) +
        tag('size', size === 'One Size' ? 'One Size' : size) +
        `<g:shipping><g:country>US</g:country><g:price>0.00 USD</g:price></g:shipping>` +
        '</item>',
    ];
  });
}

export function GET() {
  const body = PRODUCTS.filter(inFeed).flatMap(items).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${esc(STORE_NAME)}</title>
<link>${esc(SITE_URL)}</link>
<description>Lingerie, sleepwear, legwear, costumes and clubwear for women.</description>
${body}
</channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
