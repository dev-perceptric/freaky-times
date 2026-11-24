'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAdult } from './Adult';

/** Asks once per device that readers are 18+ before showing a blog article (same setting as After Dark). */
export default function BlogGate() {
  const [ok, confirm] = useAdult();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (!ready) return;
    document.body.style.overflow = ok ? '' : 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [ok, ready]);
  if (!ready || ok) return null;
  return (
    <div className="blog-gate" role="dialog" aria-modal="true" aria-labelledby="blog-gate-title">
      <div className="blog-gate-card">
        <p className="blog-gate-badge">18+</p>
        <h2 id="blog-gate-title">This guide is for adults</h2>
        <p>It talks openly about sex. Please confirm you are 18 or older to keep reading.</p>
        <div className="blog-gate-actions">
          <button type="button" className="btn" onClick={confirm}>I’m 18 or older</button>
          <Link href="/" className="btn btn-line">Take me to the shop</Link>
        </div>
      </div>
    </div>
  );
}
