// Blog posts, built from content/blog/*.md by scripts/blog_build.py.
import POSTS from './blog-posts.json';

export type BlogPost = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  category: string;
  tags: string[];
  heat: string;
  readingTime: string;
  updated: string;
  hero: string;
  pillar: boolean;
  faq: { q: string; a: string }[];
  html: string;
};

export const BLOG: BlogPost[] = POSTS as BlogPost[];

export function getPost(slug: string): BlogPost | undefined {
  return BLOG.find((p) => p.slug === slug);
}

/** Up to n other posts, the pillar first. */
export function relatedPosts(slug: string, n = 3): BlogPost[] {
  return BLOG.filter((p) => p.slug !== slug).slice(0, n);
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
