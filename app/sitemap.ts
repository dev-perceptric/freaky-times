import type { MetadataRoute } from 'next';
import { SHOP, allCollectionPaths, collectionHref } from '@/lib/catalog';
import { SITE_URL } from '@/lib/site';
import { BLOG } from '@/lib/blog';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = ['', '/about', '/faq', '/shipping', '/returns', '/contact', '/track'].map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now }));
  const collections = allCollectionPaths().map((c) => ({ url: `${SITE_URL}${collectionHref(c.slug, c.dept)}`, lastModified: now, changeFrequency: 'daily' as const }));
  const products = SHOP.map((p) => ({ url: `${SITE_URL}/product/${p.slug}`, lastModified: now }));
  const blog = [{ url: `${SITE_URL}/blog`, lastModified: now }, ...BLOG.map((b) => ({ url: `${SITE_URL}/blog/${b.slug}`, lastModified: new Date(`${b.updated}T12:00:00Z`) }))];
  return [...pages, ...blog, ...collections, ...products];
}
