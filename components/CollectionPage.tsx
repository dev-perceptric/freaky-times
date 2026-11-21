import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  ALL, COLLECTIONS, DEPTS, collectionHref, collectionTitle, getCollection, getDept, productsIn,
  type CollectionDef, type Crumb, type DeptId,
} from '@/lib/catalog';
import CollectionView, { type Search } from './CollectionView';

function resolve(slug: string, deptId?: string) {
  const c = getCollection(slug);
  const dept = deptId ? getDept(deptId) : undefined;
  if (!c || (deptId && !dept)) return null;
  const list = productsIn(c, dept?.id);
  if (!list.length) return null;
  return { c, dept, list };
}

function intro(c: CollectionDef, dept?: DeptId) {
  const d = getDept(dept);
  const who = d ? ` ${d.short.toLowerCase()} ` : ' ';
  return `${c.blurb} Shop${who}${c.title.toLowerCase()} at FreakyTimes with free shipping on every order.`;
}

export function collectionMetadata(slug: string, deptId?: string): Metadata {
  const r = resolve(slug, deptId);
  if (!r) return { title: 'Not found' };
  const title = collectionTitle(r.c, r.dept?.id);
  return { title, description: intro(r.c, r.dept?.id), alternates: { canonical: collectionHref(r.c.slug, r.dept?.id) } };
}

export default function CollectionPage({ slug, dept: deptId, search }: { slug: string; dept?: string; search: Search }) {
  const r = resolve(slug, deptId);
  if (!r) notFound();
  const { c, dept, list } = r;
  const d = dept?.id;

  // Department tabs: All / Women / Men, where this collection has pieces.
  const tabs = [{ label: 'All', href: collectionHref(c.slug), active: !d },
    ...DEPTS.filter((x) => productsIn(c, x.id).length).map((x) => ({ label: x.label, href: collectionHref(c.slug, x.id), active: d === x.id }))];

  // Chips: the other collections in the same group (categories), or the department's groups on "All".
  const siblings = c === ALL
    ? COLLECTIONS.filter((x) => x.parent)
    : COLLECTIONS.filter((x) => x.group === c.group && x.group !== 'hidden');
  const chips = siblings
    .filter((x) => !(x.womenOnly && d === 'mens'))
    .map((x) => ({ label: x.title, href: collectionHref(x.slug, d), count: productsIn(x, d).length, active: x.slug === c.slug }))
    .filter((x) => x.count > 0);

  const parent = COLLECTIONS.find((x) => x.group === c.group && x.parent && x !== c);
  const crumbs: Crumb[] = [{ label: 'Home', href: '/' }];
  if (dept) crumbs.push({ label: dept.label, href: collectionHref('all', d) });
  if (parent) crumbs.push({ label: parent.title, href: collectionHref(parent.slug, d) });
  if (c !== ALL || dept) crumbs.push({ label: c === ALL ? 'All' : c.title, href: collectionHref(c.slug, d) });

  return (
    <CollectionView
      base={collectionHref(c.slug, d)}
      feed={`kind=collection&slug=${c.slug}${d ? `&dept=${d}` : ''}`}
      title={c === ALL && dept ? `${dept.short} Lingerie` : c.title}
      eyebrow={dept && c !== ALL ? dept.short : undefined}
      intro={c === ALL && dept ? `${dept.blurb} Free shipping on every order.` : intro(c, d)}
      crumbs={crumbs}
      products={list}
      search={search}
      tabs={tabs.length > 2 ? tabs : []}
      chips={chips.length > 1 ? chips : []}
    />
  );
}
