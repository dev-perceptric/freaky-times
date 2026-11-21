'use client';

import Link from 'next/link';
import { useState } from 'react';

/** Tab buttons over server-rendered panels (used for "Trending now"). */
export default function Tabs({ tabs }: { tabs: { label: string; href: string; panel: React.ReactNode }[] }) {
  const [i, setI] = useState(0);
  const cur = tabs[i];
  return (
    <>
      <div className="tab-row" role="tablist">
        {tabs.map((t, n) => (
          <button key={t.href} type="button" role="tab" aria-selected={n === i} className={`tab-btn${n === i ? ' is-on' : ''}`} onClick={() => setI(n)}>{t.label}</button>
        ))}
      </div>
      <div role="tabpanel">{cur.panel}</div>
      <div className="center"><Link href={cur.href} className="btn btn-line">Shop all {cur.label}</Link></div>
    </>
  );
}
