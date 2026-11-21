import { NextResponse } from 'next/server';
import { PRODUCTS, formatPrice } from '@/lib/products';
import { searchProducts } from '@/lib/search';

const LIST = PRODUCTS.filter((p) => !p.afterDark);

/** Quick results for the search box as you type. */
export function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').slice(0, 80);
  if (q.trim().length < 2) return NextResponse.json({ total: 0, results: [] });
  const hits = searchProducts(LIST, q);
  return NextResponse.json({
    total: hits.length,
    results: hits.slice(0, 6).map((p) => ({ name: p.name, href: `/product/${p.slug}`, price: formatPrice(p.price), img: p.photos?.[0]?.src })),
  });
}
