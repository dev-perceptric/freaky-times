import type { Metadata } from 'next';
import CollectionView, { type Search } from '@/components/CollectionView';
import { SHOP } from '@/lib/catalog';
import { searchProducts } from '@/lib/search';

type Props = { searchParams: Search };

export function generateMetadata({ searchParams }: Props): Metadata {
  const q = searchParams.q?.trim();
  return { title: q ? `${q} – search` : 'Search lingerie', robots: { index: false } };
}

export default function SearchPage({ searchParams }: Props) {
  const q = searchParams.q?.trim().slice(0, 80) || '';
  const list = q ? searchProducts(SHOP, q) : SHOP;
  return (
    <CollectionView
      base="/search"
      feed={`kind=search&q=${encodeURIComponent(q)}`}
      title={q ? `Results for “${q}”` : 'Search'}
      intro={q ? undefined : 'Type in the search bar at the top to find anything in the store.'}
      crumbs={[{ label: 'Home', href: '/' }, { label: 'Search', href: '/search' }]}
      products={list}
      search={searchParams}
    />
  );
}
