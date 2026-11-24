import type { Metadata } from 'next';
import Link from 'next/link';
import Crumbs from '@/components/Crumbs';
import { BLOG } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'The FreakyTimes Blog: Sex Positions, Tips & Pleasure Guides',
  description: 'Honest, fun guides to sex positions, pleasure and confidence, written for women. From the best positions for her to first-time tips.',
  alternates: { canonical: '/blog' },
};

export default function BlogIndex() {
  const [pillar, ...rest] = BLOG;
  return (
    <section className="blog-page">
      <div className="wrap">
        <Crumbs items={[{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }]} />
        <div className="shop-head"><h1>The Freaky Blog</h1></div>
        <p className="lede">Sex positions, pleasure tips and real talk, written for women. For adults 18+.</p>

        {pillar && (
          <Link href={`/blog/${pillar.slug}`} className="blog-feature">
            {pillar.hero && <img src={pillar.hero} alt="" width={1600} height={900} />}
            <div className="blog-feature-text">
              <span className="blog-kicker">Start here</span>
              <h2>{pillar.title}</h2>
              <p>{pillar.description}</p>
              <span className="blog-meta">{pillar.readingTime} read</span>
            </div>
          </Link>
        )}

        <div className="blog-grid">
          {rest.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="blog-card">
              {p.hero && <img src={p.hero} alt="" width={1600} height={900} loading="lazy" />}
              <div className="blog-card-text">
                <span className="blog-kicker">{p.category}</span>
                <h3>{p.title}</h3>
                <p>{p.description}</p>
                <span className="blog-meta">{p.readingTime} read</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
