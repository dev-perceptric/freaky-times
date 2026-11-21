import { NextResponse } from 'next/server';

// Adds an email to the Freaky Club audience in Resend.
export async function POST(req: Request) {
  let email = '';
  try {
    email = String((await req.json()).email ?? '').trim().toLowerCase();
  } catch {
    /* handled below */
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'That email doesn’t look right.' }, { status: 400 });
  }

  const key = process.env.RESEND_API_KEY;
  const audience = process.env.RESEND_AUDIENCE_ID;
  if (!key || !audience) {
    return NextResponse.json({ error: 'Sign-ups open soon. Check back in a few days.' }, { status: 503 });
  }

  const res = await fetch(`https://api.resend.com/audiences/${audience}/contacts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, unsubscribed: false }),
  });
  if (!res.ok) {
    return NextResponse.json({ error: 'That didn’t work. Try again in a minute.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
