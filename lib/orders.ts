// Order numbers and the Track Order lookup. An order number is "FT-" plus the end of the Stripe Checkout session ID.
import { stripe, type CheckoutSession } from './stripe';
import { ae } from './aliexpress';

export const orderNumber = (sessionId: string) => `FT-${sessionId.replace(/^cs_(live|test)_/, '').slice(-8).toUpperCase()}`;

export interface OrderStatus {
  number: string;
  placed: string;
  paid: boolean;
  sentToWarehouse: boolean;
  tracking: { number: string; carrier?: string; url: string }[];
}

interface PaymentIntent { metadata?: Record<string, string> }

/** Best effort: tracking numbers for an AliExpress order. Returns [] until the parcel ships or if the lookup fails. */
async function aeTracking(aeOrderId: string) {
  try {
    const data = await ae('aliexpress.ds.order.tracking.get', { ae_order_id: aeOrderId, language: 'en_US' });
    const text = JSON.stringify(data);
    const numbers = new Set<string>();
    for (const m of text.matchAll(/"(?:mail_no|tracking_number|logistics_no)"\s*:\s*"([A-Z0-9]{8,30})"/gi)) numbers.add(m[1]);
    const carrier = /"(?:carrier_name|logistics_company|service_name)"\s*:\s*"([^"]{2,60})"/i.exec(text)?.[1];
    return [...numbers].map((n) => ({ number: n, carrier, url: `https://parcelsapp.com/en/tracking/${n}` }));
  } catch {
    return [];
  }
}

/** Finds an order by email and order number. Null when nothing matches. */
export async function findOrder(email: string, number: string): Promise<OrderStatus | null> {
  const want = number.trim().toUpperCase().replace(/^#/, '');
  const list = await stripe<{ data: (CheckoutSession & { created: number; payment_intent?: string | null; payment_status?: string })[] }>(
    `/checkout/sessions?limit=30&customer_details[email]=${encodeURIComponent(email.trim().toLowerCase())}`,
  );
  const session = list.data.find((s) => orderNumber(s.id) === want || orderNumber(s.id) === `FT-${want}`);
  if (!session) return null;
  const pi = session.payment_intent ? await stripe<PaymentIntent>(`/payment_intents/${session.payment_intent}`) : null;
  const meta = pi?.metadata ?? {};
  const aeIds = (meta.aliexpress_orders ?? '').split(':')[1]?.split(',').filter(Boolean) ?? [];
  const tracking = (await Promise.all(aeIds.map(aeTracking))).flat();
  return {
    number: orderNumber(session.id),
    placed: new Date(session.created * 1000).toISOString(),
    paid: session.payment_status === 'paid',
    sentToWarehouse: !!(meta.aliexpress_orders || meta.cj_orders || meta.printful_order_id),
    tracking,
  };
}
