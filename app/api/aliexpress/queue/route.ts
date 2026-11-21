import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { addToQueue, listQueue, markQueue, type QueueItem } from '@/lib/queue';

export const dynamic = 'force-dynamic';

const denied = () => NextResponse.json({ error: 'Not allowed' }, { status: 403 });
const STATUSES = new Set(['pending', 'added', 'skipped']);

// List: GET ?status=pending&limit=200
export async function GET(req: Request) {
  if (!isAdmin(req.headers.get('x-admin-token'))) return denied();
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const limit = Math.min(5000, Number(url.searchParams.get('limit')) || 1000);
  return NextResponse.json(await listQueue(status && STATUSES.has(status) ? (status as QueueItem['status']) : undefined, limit));
}

// Add: POST { items: [{ id, title }], source }
export async function POST(req: Request) {
  if (!isAdmin(req.headers.get('x-admin-token'))) return denied();
  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items.slice(0, 2000) : [];
  if (!items.length) return NextResponse.json({ error: 'No items' }, { status: 400 });
  return NextResponse.json(await addToQueue(items, body.source));
}

// Mark done: PATCH { ids: [...], status: 'added' | 'skipped' | 'pending', note }
export async function PATCH(req: Request) {
  if (!isAdmin(req.headers.get('x-admin-token'))) return denied();
  const body = await req.json().catch(() => ({}));
  if (!Array.isArray(body.ids) || !STATUSES.has(body.status)) return NextResponse.json({ error: 'Need ids and status' }, { status: 400 });
  return NextResponse.json(await markQueue(body.ids, body.status, typeof body.note === 'string' ? body.note.slice(0, 200) : undefined));
}
