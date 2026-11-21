import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import InfoPage from '@/components/InfoPage';
import ClearCart from '@/components/ClearCart';
import { getSession, getSessionLineItems } from '@/lib/stripe';
import { orderNumber } from '@/lib/orders';
import { formatPrice } from '@/lib/products';
import { SUPPORT_EMAIL } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Order confirmed', robots: { index: false } };

/** Thank-you page after Stripe Checkout, with the order number shoppers use on Track Order. */
export default async function OrderPage({ params }: { params: { id: string } }) {
  if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(params.id)) notFound();
  let session, items;
  try {
    [session, items] = await Promise.all([getSession(params.id), getSessionLineItems(params.id)]);
  } catch {
    notFound();
  }
  const paid = session.payment_status === 'paid';
  const number = orderNumber(session.id);
  return (
    <InfoPage title={paid ? 'Thank you!' : 'Order received'} intro={paid ? 'Your order is confirmed. We’re sending it to our warehouse now.' : 'We’re waiting for your payment to clear.'}>
      {paid && <ClearCart />}
      <h2>Order number</h2>
      <p><strong style={{ color: 'var(--text)', fontSize: 22 }}>{number}</strong></p>
      <p>Save it to check your order on <Link className="link" href="/track">Track Order</Link>. A receipt is on its way to {session.customer_details?.email ?? 'your email'}.</p>
      <h2>What you ordered</h2>
      {items.map((li, i) => (
        <p key={i}>{li.quantity} × {li.price?.product?.name} · {formatPrice(li.amount_total / 100)}</p>
      ))}
      <h2>What happens next</h2>
      <p>Your pieces ship from our partner warehouses within 1 to 3 business days, and most orders arrive in 6 to 17 days. Pieces can arrive in separate packages.</p>
      <p>Questions? Email <a className="link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your order number.</p>
    </InfoPage>
  );
}
