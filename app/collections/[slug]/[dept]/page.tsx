import CollectionPage, { collectionMetadata } from '@/components/CollectionPage';
import type { Search } from '@/components/CollectionView';
import { allCollectionPaths } from '@/lib/catalog';

type Props = { params: { slug: string; dept: string }; searchParams: Search };

export function generateStaticParams() {
  return allCollectionPaths().filter((p) => p.dept).map((p) => ({ slug: p.slug, dept: p.dept! }));
}

export function generateMetadata({ params }: Props) {
  return collectionMetadata(params.slug, params.dept);
}

export default function Page({ params, searchParams }: Props) {
  return <CollectionPage slug={params.slug} dept={params.dept} search={searchParams} />;
}
