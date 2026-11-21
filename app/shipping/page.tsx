import type { Metadata } from 'next';
import Link from 'next/link';
import InfoPage from '@/components/InfoPage';
import { DELIVERY_MAX, DELIVERY_MIN, SHIP_COUNTRY_NAMES, SUPPORT_EMAIL } from '@/lib/site';

export const metadata: Metadata = { title: 'Shipping', description: 'Free shipping on every order. Delivery times, tracking and where we ship.' };

export default function ShippingPage() {
  return (
    <InfoPage title="Shipping" intro="Free shipping on every order, no minimum.">
      <h2>How long it takes</h2>
      <p>
        Orders are made and packed by our partner warehouses, then shipped straight to you. Most orders arrive in {DELIVERY_MIN} to {DELIVERY_MAX} days.
        Each product page shows the delivery estimate for that piece.
      </p>
      <h2>Cost</h2>
      <p>Shipping is free on every order. There are no extra fees at checkout.</p>
      <h2>Tracking</h2>
      <p>We email you a tracking number once your order ships, usually within 1 to 3 business days of ordering.</p>
      <h2>Separate packages</h2>
      <p>Pieces in one order can ship from different warehouses, so they may arrive in separate packages on different days.</p>
      <h2>Where we ship</h2>
      <p>{SHIP_COUNTRY_NAMES.join(', ')}.</p>
      <h2>Customs</h2>
      <p>Orders outside the United States may be charged import taxes or duties by your country. These are set by your local customs office and are paid by the buyer.</p>
      <h2>Questions</h2>
      <p>
        Email <a className="link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your order number. See also our <Link className="link" href="/returns">returns policy</Link>.
      </p>
    </InfoPage>
  );
}
