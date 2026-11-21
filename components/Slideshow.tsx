'use client';

import Link from 'next/link';
import { heroImg } from '@/lib/img';
import { useEffect, useState } from 'react';

export interface Slide { eyebrow: string; title: string; cta: string; href: string; images: string[]; alt?: { cta: string; href: string } }

/** Homepage hero: photo slides that fade every 6 seconds, with dots to jump between them. */
export default function Slideshow({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setTimeout(() => setI((n) => (n + 1) % slides.length), 6000);
    return () => clearTimeout(t);
  }, [i, paused, slides.length]);

  return (
    <section className="hero" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel">
      <div className="slides">
        {slides.map((s, n) => (
          <div key={s.href} className={`slide${n === i ? ' is-on' : ''}`} aria-hidden={n !== i} aria-roledescription="slide">
            <div className="slide-media">
              {s.images.map((src, k) => <img key={src} {...heroImg(src)} fetchPriority={n === 0 && k === 0 ? 'high' : undefined} alt="" loading={n === 0 && k === 0 ? 'eager' : 'lazy'} />)}
            </div>
            <div className="slide-copy">
              <p className="eyebrow">{s.eyebrow}</p>
              {n === 0 ? <h1>{s.title}</h1> : <h2>{s.title}</h2>}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link href={s.href} className="btn btn-white" tabIndex={n === i ? 0 : -1}>{s.cta}</Link>
                {s.alt && <Link href={s.alt.href} className="btn btn-white" tabIndex={n === i ? 0 : -1}>{s.alt.cta}</Link>}
              </div>
            </div>
          </div>
        ))}
        {slides.length > 1 && (
          <div className="slide-dots">
            {slides.map((s, n) => (
              <button key={s.href} type="button" className={`slide-dot${n === i ? ' is-on' : ''}`} onClick={() => setI(n)} aria-label={`Slide ${n + 1}: ${s.title}`} aria-current={n === i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
