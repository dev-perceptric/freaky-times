import { feedPage } from '@/lib/feed';

export const dynamic = 'force-dynamic';

/** GET /api/feed?kind=collection|search|like&...&page=N: the next page of product cards for infinite scrolling. */
export function GET(req: Request) {
  const out = feedPage(new URL(req.url).searchParams);
  if (!out) return Response.json({ error: 'unknown source' }, { status: 404 });
  return Response.json(out, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
