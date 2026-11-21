// Product photos are served as ready-made WebP files from the freaky-times R2 bucket. Its public URL is the
// r2.dev address below until img.freakytimes.com is connected (then change IMG here, in next.config.mjs and in
// scripts/make_sizes.py). scripts/make_sizes.py writes 200, 480, 828 and 1200 px copies of each photo, so
// the server never resizes images. Photos without ready-made copies fall back to the site's own image
// service (/_next/image). Client-safe.

const IMG = 'https://pub-cf5b5b1875ae4569a8c701274e2ae2bf.r2.dev';
/** Widths made by scripts/make_sizes.py (must match SIZES there). */
const READY = [200, 480, 828, 1200] as const;
const HOSTS = ['pub-cf5b5b1875ae4569a8c701274e2ae2bf.r2.dev', 'ae01.alicdn.com'];
/** Widths the fallback image service makes (must match next.config images.deviceSizes / imageSizes). */
export const WIDTHS = [96, 160, 256, 480, 768, 1080, 1600] as const;
export type Width = (typeof WIDTHS)[number];

const ready = (src?: string) => !!src && src.startsWith(`${IMG}/`);
const ok = (src?: string) => !!src && HOSTS.some((h) => src.startsWith(`https://${h}/`));
/** Smallest ready-made width that covers w. */
const fit = (w: number) => READY.find((r) => r >= w) ?? READY[READY.length - 1];
/** https://pub-cf5b5b1875ae4569a8c701274e2ae2bf.r2.dev/cj/ae-1/abc.jpg -> https://pub-cf5b5b1875ae4569a8c701274e2ae2bf.r2.dev/w/cj/ae-1/abc-480.webp */
const sized = (src: string, w: number) => `${IMG}/w/${src.slice(IMG.length + 1).replace(/\.[A-Za-z]+$/, '')}-${fit(w)}.webp`;

/** URL of a resized WebP copy of a product photo (or the original for anything else). */
export function img(src: string | undefined, w: Width, q = 75): string {
  if (!src) return '';
  if (ready(src)) return sized(src, w);
  return ok(src) ? `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}` : src;
}

/** srcset for a photo at the given widths. */
export function srcSet(src: string | undefined, widths: Width[]): string | undefined {
  if (ready(src)) return Array.from(new Set(widths.map(fit))).map((w) => `${sized(src!, w)} ${w}w`).join(', ');
  return ok(src) ? widths.map((w) => `${img(src, w)} ${w}w`).join(', ') : undefined;
}

/** Ready-made props for the main sizes the site uses. */
export const cardImg = (src?: string) => ({ src: img(src, 480), srcSet: srcSet(src, [256, 480, 768]), sizes: '(max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw' });
export const heroImg = (src?: string) => ({ src: img(src, 1080), srcSet: srcSet(src, [480, 768, 1080, 1600]), sizes: '(max-width: 600px) 100vw, 34vw' });
export const galleryImg = (src?: string) => ({ src: img(src, 1080), srcSet: srcSet(src, [480, 768, 1080, 1600]), sizes: '(max-width: 860px) 100vw, 55vw' });
export const thumbImg = (src?: string) => ({ src: img(src, 160), srcSet: srcSet(src, [160, 256]), sizes: '96px' });
export const tileImg = (src?: string) => ({ src: img(src, 768), srcSet: srcSet(src, [480, 768, 1080]), sizes: '(max-width: 600px) 100vw, 33vw' });
