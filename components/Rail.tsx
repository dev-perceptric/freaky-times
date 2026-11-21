'use client';

import { useRef } from 'react';
import Link from 'next/link';

/** A section head with arrows, over a row of cards that scrolls sideways. */
export default function Rail({ title, sub, href, linkText = 'Shop all', children }: { title: string; sub?: string; href?: string; linkText?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };
  return (
    <div className="wrap">
      <div className="sec-head">
        <div>
          <h2>{title}</h2>
          {sub && <p className="sec-sub">{sub}</p>}
        </div>
        <div className="rail-tools">
          {href && <Link href={href} className="link">{linkText}</Link>}
          <button type="button" className="rail-arrow" onClick={() => go(-1)} aria-label="Scroll left">‹</button>
          <button type="button" className="rail-arrow" onClick={() => go(1)} aria-label="Scroll right">›</button>
        </div>
      </div>
      <div className="rail" ref={ref}>{children}</div>
    </div>
  );
}
