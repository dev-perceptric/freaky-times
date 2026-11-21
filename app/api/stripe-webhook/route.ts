import { NextResponse } from 'next/server';
import { aeVariant, cjVariant, findAnyProduct, type Product } from '@/lib/products';
import { placeAeOrder, type AeLine, type AeOrderResult } from '@/lib/aliexpress';
import { createCjOrder, type CjLine, type CjOrderResult, type CjRecipient } from '@/lib/cj';
import {
  createOrder,
  externalIdFor,
  findSyncVariant,
  getOrderByExternalId,
  type OrderItem,
  type Recipient,
} from '@/lib/printful';
import { getSession, getSessionLineItems, stripe, verifyStripeSignature, type CheckoutSession } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Countries where Printful needs a state or province code.
const STATE_COUNTRIES = new Set(['US', 'CA', 'AU']);

const money = (cents: number | null | undefined) => ((cents ?? 0) / 100).toFixed(2);

function recipientFrom(s: CheckoutSession): Recipient {
  const ship = s.collected_information?.shipping_details ?? s.shipping_details;
  const a = ship?.address;
  if (!a?.line1 || !a.city || !a.country || !a.postal_code) {
    throw new Error(`Session ${s.id} has no full shipping address`);
  }
  const country = a.country.toUpperCase();
  return {
    name: ship?.name || s.customer_details?.name || 'Customer',
    address1: a.line1,
    address2: a.line2 || undefined,
    city: a.city,
    state_code: STATE_COUNTRIES.has(country) && a.state ? a.state : undefined,
    country_code: country,
    zip: a.postal_code,
    email: s.customer_details?.email || undefined,
    phone: s.customer_details?.phone || undefined,
  };
}

type Line = { product: Product; color: string; size: string; quantity: number; unitCents: number | null };

/** Sends the Printful part of an order. Safe to run twice for the same session. */
async function sendPrintful(session: CheckoutSession, lines: Line[]) {
  const externalId = externalIdFor(session.id);
  const existing = await getOrderByExternalId(externalId);
  if (existing) return { status: 'already_sent', orderId: existing.id, externalId };

  const items: OrderItem[] = [];
  for (const l of lines) {
    items.push({
      sync_variant_id: await findSyncVariant(l.product, l.color, l.size),
      quantity: l.quantity,
      retail_price: money(l.unitCents),
    });
  }

  const totals = session.total_details ?? {};
  const confirm = process.env.PRINTFUL_CONFIRM_ORDERS !== 'false';
  try {
    const order = await createOrder(
      {
        externalId,
        recipient: recipientFrom(session),
        items,
        retailCosts: {
          currency: (session.currency ?? 'usd').toUpperCase(),
          subtotal: money(session.amount_subtotal),
          discount: money(totals.amount_discount),
          shipping: money(totals.amount_shipping),
          tax: money(totals.amount_tax),
        },
      },
      confirm,
    );
    return { status: confirm ? 'sent' : 'draft', orderId: order.id, externalId };
  } catch (e) {
    // Two deliveries of the same event can race. If the other one won, that's fine.
    const raced = await getOrderByExternalId(externalId);
    if (raced) return { status: 'already_sent', orderId: raced.id, externalId };
    throw e;
  }
}

/** Sends the CJ part of an order: one CJ order per warehouse country. CJ rejects repeats by order number. */
async function sendCj(session: CheckoutSession, lines: Line[]) {
  const r = recipientFrom(session);
  const to: CjRecipient = {
    name: r.name, address1: r.address1, address2: r.address2, city: r.city,
    state: r.state_code ?? (session.collected_information?.shipping_details ?? session.shipping_details)?.address?.state ?? undefined,
    countryCode: r.country_code, zip: r.zip, email: r.email, phone: r.phone,
  };
  const byWarehouse = new Map<string, CjLine[]>();
  for (const l of lines) {
    const v = cjVariant(l.product, l.color, l.size);
    if (!v) throw new Error(`No CJ variant for ${l.product.slug} in ${l.color} / ${l.size}`);
    const from = l.product.cj!.from;
    byWarehouse.set(from, [...(byWarehouse.get(from) ?? []), { vid: v.vid, quantity: l.quantity }]);
  }
  const results = [];
  for (const [from, cjLines] of byWarehouse) {
    results.push(await createCjOrder(`${externalIdFor(session.id)}-${from}`, from, to, cjLines));
  }
  return results;
}

/** Sends the AliExpress part of an order as one AliExpress order. AliExpress rejects repeats by our order ID. */
async function sendAe(session: CheckoutSession, lines: Line[]) {
  const r = recipientFrom(session);
  const ship = session.collected_information?.shipping_details ?? session.shipping_details;
  const aeLines: AeLine[] = lines.map((l) => {
    const v = aeVariant(l.product, l.color, l.size);
    if (!v) throw new Error(`No AliExpress variant for ${l.product.slug} in ${l.color} / ${l.size}`);
    return { productId: l.product.ae!.productId, skuAttr: v.skuAttr, skuId: v.skuId, quantity: l.quantity };
  });
  return placeAeOrder(`${externalIdFor(session.id)}-AE`, {
    name: r.name, address1: r.address1, address2: r.address2, city: r.city,
    state: ship?.address?.state ?? undefined, countryCode: r.country_code, zip: r.zip, phone: r.phone,
  }, aeLines);
}

/** Turns one paid Stripe Checkout session into Printful, CJ and AliExpress orders. Safe to run twice. */
async function fulfil(sessionId: string) {
  const [session, lineItems] = await Promise.all([getSession(sessionId), getSessionLineItems(sessionId)]);

  const printfulLines: Line[] = [];
  const cjLines: Line[] = [];
  const aeLines: Line[] = [];
  for (const li of lineItems) {
    const meta = li.price?.product?.metadata ?? {};
    // Hidden products still get fulfilled if someone already paid for them.
    const product = meta.slug ? findAnyProduct(meta.slug) : undefined;
    if (!product) {
      console.warn(`stripe-webhook: ${sessionId} has an item not in the catalog`, meta.slug);
      continue;
    }
    const line = { product, color: meta.color ?? '', size: meta.size ?? '', quantity: li.quantity ?? 1, unitCents: li.price?.unit_amount ?? null };
    if (product.cj) cjLines.push(line);
    else if (product.ae) aeLines.push(line);
    else if (product.printful) printfulLines.push(line);
  }

  const result: { printful?: Awaited<ReturnType<typeof sendPrintful>>; cj?: CjOrderResult[]; aliexpress?: AeOrderResult } = {};
  if (printfulLines.length) result.printful = await sendPrintful(session, printfulLines);
  if (cjLines.length) result.cj = await sendCj(session, cjLines);
  if (aeLines.length) result.aliexpress = await sendAe(session, aeLines);

  // Note the supplier orders on the Stripe payment so you can find one from the other.
  // On a retry, orders that already existed keep the tags from the first run.
  const newCj = (result.cj ?? []).filter((o) => o.status !== 'already_sent');
  const newPrintful = result.printful && result.printful.status !== 'already_sent' ? result.printful : undefined;
  const newAe = result.aliexpress && result.aliexpress.status !== 'already_sent' ? result.aliexpress : undefined;
  if (session.payment_intent && (newPrintful || newCj.length || newAe)) {
    const form = new URLSearchParams();
    if (newPrintful) {
      form.append('metadata[printful_order_id]', String(newPrintful.orderId));
      form.append('metadata[printful_external_id]', newPrintful.externalId);
    }
    if (newAe) {
      form.append('metadata[aliexpress_orders]', `${newAe.outOrderId}:${(newAe.orderIds ?? []).join(',')}`.slice(0, 500));
    }
    if (newCj.length) {
      form.append('metadata[cj_orders]', newCj.map((o) => `${o.orderNumber}:${o.orderId ?? '?'}:${o.status}`).join(' ').slice(0, 500));
    }
    await stripe(`/payment_intents/${session.payment_intent}`, { method: 'POST', form }).catch((e) =>
      console.warn('stripe-webhook: could not tag payment with supplier orders', e.message),
    );
  }

  return result;
}

// Stripe calls this after checkout. Paid sessions become Printful and CJ orders.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });

  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 400 });
  }

  let event: { id: string; type: string; data: { object: CheckoutSession } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: 'Bad payload' }, { status: 400 });
  }

  const handled = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
  if (!handled.includes(event.type)) return NextResponse.json({ received: true, ignored: event.type });

  const session = event.data.object;
  // Bank-transfer style payments finish later and come back as async_payment_succeeded.
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
    return NextResponse.json({ received: true, waiting: session.payment_status });
  }

  try {
    const result = await fulfil(session.id);
    console.log(`stripe-webhook: ${event.type} ${session.id}`, result);
    return NextResponse.json({ received: true, ...result });
  } catch (e) {
    // A 500 makes Stripe retry for up to 3 days, so a fix to the catalog or a Printful outage heals itself.
    console.error(`stripe-webhook: failed for ${session.id}`, e);
    return NextResponse.json({ error: 'Could not send the order to a supplier' }, { status: 500 });
  }
}
