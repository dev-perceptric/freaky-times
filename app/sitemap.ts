import type { MetadataRoute } from 'next';
import { SHOP, allCollectionPaths, collectionHref } from '@/lib/catalog';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = ['', '/about', '/faq', '/shipping', '/returns', '/contact', '/track'].map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now }));
  const collections = allCollectionPaths().map((c) => ({ url: `${SITE_URL}${collectionHref(c.slug, c.dept)}`, lastModified: now, changeFrequency: 'daily' as const }));
  const products = SHOP.map((p) => ({ url: `${SITE_URL}/product/${p.slug}`, lastModified: now }));
  return [...pages, ...collections, ...products];
}
