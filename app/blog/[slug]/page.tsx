import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Crumbs from '@/components/Crumbs';
import BlogGate from '@/components/BlogGate';
import { BLOG, formatDate, getPost, relatedPosts } from '@/lib/blog';
import { SITE_URL, STORE_NAME } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug);
  if (!post) return {};
  return {
    title: post.seoTitle,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      images: post.hero ? [{ url: post.hero, width: 1600, height: 900 }] : undefined,
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();
  const updated = formatDate(post.updated);
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.description,
      image: post.hero ? [`${SITE_URL}${post.hero}`] : undefined,
      dateModified: post.updated,
      datePublished: post.updated,
      author: { '@type': 'Organization', name: `${STORE_NAME} Team` },
      publisher: { '@type': 'Organization', name: STORE_NAME },
      mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    },
    ...(post.faq.length
      ? [{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: post.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }]
      : []),
  ];
  return (
    <article className="blog-page blog-post">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <BlogGate />
      <div className="wrap">
        <Crumbs items={[{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }, { label: post.title, href: `/blog/${post.slug}` }]} />
        <header className="blog-head">
          <span className="blog-kicker">{post.category}</span>
          <h1>{post.title}</h1>
          <p className="blog-meta">
            {post.readingTime} read{updated ? ` · Updated ${updated}` : ''} · By the {STORE_NAME} Team
          </p>
        </header>
        {post.hero && <img className="blog-hero" src={post.hero} alt={post.title} width={1600} height={900} />}
        <div className="blog-body" dangerouslySetInnerHTML={{ __html: post.html }} />
        <p className="blog-disclaimer">For adults 18+. This guide is general information, not medical advice. If sex hurts or something feels wrong, talk to a doctor.</p>
        <aside className="blog-more">
          <h2>Keep reading</h2>
          <div className="blog-grid">
            {relatedPosts(post.slug).map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="blog-card">
                {p.hero && <img src={p.hero} alt="" width={1600} height={900} loading="lazy" />}
                <div className="blog-card-text">
                  <h3>{p.title}</h3>
                  <span className="blog-meta">{p.readingTime} read</span>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </article>
  );
}
