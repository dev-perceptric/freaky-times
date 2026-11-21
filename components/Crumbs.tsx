import Link from 'next/link';
import { Fragment } from 'react';
import type { Crumb } from '@/lib/catalog';

export default function Crumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {items.map((c, i) => (
        <Fragment key={c.href}>
          {i > 0 && <span aria-hidden="true">/</span>}
          <Link href={c.href}>{c.label}</Link>
        </Fragment>
      ))}
    </nav>
  );
}
