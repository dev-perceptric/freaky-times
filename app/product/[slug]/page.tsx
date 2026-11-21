import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { PRODUCTS, findAnyProduct, getProduct, type Product } from '@/lib/products';
import { SHOP, productTrail } from '@/lib/catalog';
import { SITE_URL, BRAND } from '@/lib/site';
import ProductView from '@/components/ProductView';
import ProductCard from '@/components/ProductCard';
import sizeCharts from '@/lib/size-charts.json';
import type { SizeChart } from '@/lib/sizing';
import RecsSection from '@/components/RecsSection';
import { RECS_FIRST, alsoLike, completeLook, lookLabel, recOptions } from '@/lib/feed';
import { quickData } from '@/lib/quick';
import Look, { type LookPiece } from '@/components/Look';
import Crumbs from '@/components/Crumbs';

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getProduct(params.slug);
  if (!p) return { title: 'Not found' };
  const img = p.photos?.[0]?.src;
  return {
    title: p.name,
    description: `${p.name}. ${p.blurb} Free shipping on every order.`,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: img ? { images: [img], title: p.name } : undefined,
  };
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = getProduct(params.slug);
  if (!product) {
    // Renamed pieces forward to their new link; pieces taken off the store go to the shop.
    const old = findAnyProduct(params.slug);
    if (old && getProduct(old.slug)) permanentRedirect(`/product/${old.slug}`);
    if (old) permanentRedirect('/collections/all');
    notFound();
  }
  const likeAll = alsoLike(product);
  const like = likeAll.slice(0, RECS_FIRST);
  const look = completeLook(product)
    .map((p) => ({ p, label: lookLabel(p), q: quickData(p) }))
    .filter((x) => x.q.item && x.q.sizes.length > 0);
  const pieces: LookPiece[] = look.map((x) => ({ label: x.label, item: x.q.item!, sizes: x.q.sizes }));

  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: `${product.blurb} ${product.details.join('. ')}`,
    image: (product.photos ?? []).slice(0, 6).map((ph) => ph.src), sku: product.code, brand: { '@type': 'Brand', name: BRAND },
    offers: { '@type': 'Offer', url: `${SITE_URL}/product/${product.slug}`, priceCurrency: 'USD', price: product.price.toFixed(2), availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition' },
  };

  return (
    <>
      <section className="sec product">
        <div className="wrap">
          <Crumbs items={productTrail(product)} />
          <ProductView product={product} chart={product.ae ? (sizeCharts as Record<string, SizeChart>)[product.ae.productId] : undefined} />
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      </section>
      {look.length >= 3 && (
        <section className="sec" style={{ paddingTop: 0 }}>
          <Look pieces={pieces}>
            {look.map((x) => <ProductCard key={x.p.slug} product={x.p} kicker={x.label} />)}
          </Look>
        </section>
      )}
      {like.length > 0 && (
        <section className="sec" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <RecsSection slug={product.slug} options={recOptions(product)} next={likeAll.length > RECS_FIRST ? 2 : null}>
              {like.map((p) => <ProductCard key={p.slug} product={p} />)}
            </RecsSection>
          </div>
        </section>
      )}
    </>
  );
}
