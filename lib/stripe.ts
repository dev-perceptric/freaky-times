import crypto from 'node:crypto';

const API = 'https://api.stripe.com/v1';
const TOLERANCE_SECONDS = 300;

/**
 * Checks the Stripe-Signature header against the raw request body.
 * Returns true only when one of the v1 signatures matches and the timestamp is recent.
 */
export function verifyStripeSignature(payload: string, header: string | null, secret: string, now = Date.now()) {
  if (!header) return false;
  let timestamp = '';
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const [k, v] = part.split('=', 2);
    if (k === 't') timestamp = v;
    if (k === 'v1' && v) signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return false;

  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest();
  return signatures.some((sig) => {
    const given = Buffer.from(sig, 'hex');
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
}

export async function stripe<T = any>(path: string, init: { method?: string; form?: URLSearchParams } = {}): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  const res = await fetch(API + path, {
    method: init.method ?? 'GET',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: init.form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe ${path} failed: ${data?.error?.message ?? res.status}`);
  return data as T;
}

export interface Address {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export interface CheckoutSession {
  id: string;
  payment_status: string;
  payment_intent?: string | null;
  currency?: string | null;
  customer_details?: { email?: string | null; name?: string | null; phone?: string | null; address?: Address | null } | null;
  /** Older Stripe API versions put the shipping address here. */
  shipping_details?: { name?: string | null; address?: Address | null } | null;
  /** Newer Stripe API versions put it here. */
  collected_information?: { shipping_details?: { name?: string | null; address?: Address | null } | null } | null;
  total_details?: { amount_shipping?: number; amount_tax?: number; amount_discount?: number } | null;
  amount_subtotal?: number | null;
}

export interface SessionLineItem {
  quantity: number | null;
  amount_total: number;
  price: { unit_amount: number | null; product: { name: string; metadata: Record<string, string> } } | null;
}

export async function getSession(id: string) {
  return stripe<CheckoutSession>(`/checkout/sessions/${encodeURIComponent(id)}`);
}

/** Every line item on a Checkout session, with each product's metadata (slug, color, size). */
export async function getSessionLineItems(id: string) {
  const items: SessionLineItem[] = [];
  let after = '';
  for (;;) {
    const q = new URLSearchParams({ limit: '100' });
    q.append('expand[]', 'data.price.product');
    if (after) q.set('starting_after', after);
    const page = await stripe<{ data: (SessionLineItem & { id: string })[]; has_more: boolean }>(
      `/checkout/sessions/${encodeURIComponent(id)}/line_items?${q}`,
    );
    items.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    after = page.data[page.data.length - 1].id;
  }
  return items;
}
