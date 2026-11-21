import { NextResponse } from 'next/server';
import { aeVariant, cjVariant, getProduct, inStock } from '@/lib/products';
import { isOversized, sizeLabel } from '@/lib/sizing';

interface Line { slug: string; color: string; size: string; qty: number }

// Creates a Stripe Checkout session from the bag. Prices always come from the
// server-side catalog, never from the browser.
export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({ error: 'Checkout isn’t connected yet. It turns on once a Stripe key is added.' }, { status: 503 });
  }

  let items: Line[] = [];
  try {
    items = ((await req.json()).items ?? []) as Line[];
  } catch {
    return NextResponse.json({ error: 'The bag could not be read. Refresh and try again.' }, { status: 400 });
  }

  const lines = items
    .map((i) => ({ i, p: getProduct(i.slug) }))
    .filter(({ i, p }) => p && p.sizes.includes(i.size) && p.colors.some((c) => c.name === i.color) && i.qty > 0 && i.qty <= 10)
    // CJ items only sell in the color and size combos CJ actually stocks.
    .filter(({ i, p }) => inStock(p!, i.color, i.size));
  if (lines.length === 0) return NextResponse.json({ error: 'Your bag is empty.' }, { status: 400 });

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const body = new URLSearchParams();
  body.append('mode', 'payment');
  body.append('success_url', `${origin}/order/{CHECKOUT_SESSION_ID}`);
  body.append('allow_promotion_codes', 'true');
  body.append('cancel_url', `${origin}/?order=cancelled`);
  body.append('billing_address_collection', 'auto');
  ['US', 'CA', 'GB', 'AU', 'NZ', 'IE', 'DE', 'FR', 'NL', 'ES', 'IT', 'SE', 'DK'].forEach((c) =>
    body.append('shipping_address_collection[allowed_countries][]', c),
  );
  lines.forEach(({ i, p }, n) => {
    const shown = i.size === 'One Size' ? '' : sizeLabel(i.size, p!.category, isOversized(p!)).text;
    const variant = [/^(default|as photo)$/i.test(i.color) ? '' : i.color, shown].filter(Boolean).join(' / ') || 'One Size';
    body.append(`line_items[${n}][quantity]`, String(i.qty));
    body.append(`line_items[${n}][price_data][currency]`, 'usd');
    body.append(`line_items[${n}][price_data][unit_amount]`, String(Math.round(p!.price * 100)));
    body.append(`line_items[${n}][price_data][product_data][name]`, `${p!.name} (${variant})`);
    body.append(`line_items[${n}][price_data][product_data][metadata][slug]`, p!.slug);
    body.append(`line_items[${n}][price_data][product_data][metadata][color]`, i.color);
    body.append(`line_items[${n}][price_data][product_data][metadata][size]`, i.size);
    if (p!.printful) {
      body.append(`line_items[${n}][price_data][product_data][metadata][supplier]`, 'printful');
      body.append(`line_items[${n}][price_data][product_data][metadata][printful_product_id]`, String(p!.printful.productId));
    } else if (p!.cj) {
      body.append(`line_items[${n}][price_data][product_data][metadata][supplier]`, 'cj');
      body.append(`line_items[${n}][price_data][product_data][metadata][cj_vid]`, cjVariant(p!, i.color, i.size)!.vid);
    } else if (p!.ae) {
      body.append(`line_items[${n}][price_data][product_data][metadata][supplier]`, 'aliexpress');
      body.append(`line_items[${n}][price_data][product_data][metadata][ae_sku]`, aeVariant(p!, i.color, i.size)!.skuId);
    }
  });

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Stripe checkout error', data?.error?.message);
    return NextResponse.json({ error: 'Checkout could not start. Try again in a minute.' }, { status: 502 });
  }
  return NextResponse.json({ url: data.url });
}
