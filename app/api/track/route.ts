import { NextResponse } from 'next/server';
import { findOrder } from '@/lib/orders';

// Track Order lookup: email + order number (FT-XXXXXXXX). Answers the same way for "wrong email" and "wrong number".
export async function POST(req: Request) {
  let email = '';
  let order = '';
  try {
    const body = await req.json();
    email = String(body.email ?? '').trim();
    order = String(body.order ?? '').trim();
  } catch {
    /* handled below */
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || order.length < 6) {
    return NextResponse.json({ error: 'Enter the email you ordered with and your order number (it starts with FT-).' }, { status: 400 });
  }
  try {
    const status = await findOrder(email, order);
    if (!status) return NextResponse.json({ error: 'We couldn’t find that order. Check the email and order number, or email us.' }, { status: 404 });
    return NextResponse.json(status);
  } catch (e) {
    console.error('track: lookup failed', e);
    return NextResponse.json({ error: 'Order lookup is down for a moment. Try again soon or email us.' }, { status: 503 });
  }
}
