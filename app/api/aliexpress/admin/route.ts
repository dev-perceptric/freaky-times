import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { ae, connectionStatus } from '@/lib/aliexpress';

export const dynamic = 'force-dynamic';

// Read-only AliExpress calls for building the catalog. Ordering only happens in the Stripe webhook.
const ALLOWED = new Set([
  'aliexpress.ds.text.search',
  'aliexpress.ds.product.get',
  'aliexpress.ds.freight.query',
  'aliexpress.ds.category.get',
  'aliexpress.ds.feed.itemids.get',
  'aliexpress.ds.image.searchV2',
  'aliexpress.trade.ds.order.get',
  'aliexpress.ds.order.tracking.get',
]);

export async function GET(req: Request) {
  if (!isAdmin(req.headers.get('x-admin-token'))) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  return NextResponse.json(await connectionStatus());
}

export async function POST(req: Request) {
  if (!isAdmin(req.headers.get('x-admin-token'))) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  let body: { method?: string; params?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }
  if (!body.method || !ALLOWED.has(body.method)) return NextResponse.json({ error: 'Method not allowed' }, { status: 400 });
  try {
    return NextResponse.json(await ae(body.method, body.params ?? {}));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
