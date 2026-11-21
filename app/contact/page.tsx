import type { Metadata } from 'next';
import Link from 'next/link';
import InfoPage from '@/components/InfoPage';
import { SUPPORT_EMAIL } from '@/lib/site';

export const metadata: Metadata = { title: 'Contact', description: `Questions about an order? Email ${SUPPORT_EMAIL}.` };

export default function ContactPage() {
  return (
    <InfoPage title="Contact" intro="Questions about an order, sizing or a return? We're here.">
      <h2>Email</h2>
      <p><a className="link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
      <p>We reply within 1 to 2 business days. Include your order number if you have one.</p>
      <h2>Helpful pages</h2>
      <p><Link className="link" href="/shipping">Shipping</Link> · <Link className="link" href="/returns">Returns & Refunds</Link> · <Link className="link" href="/privacy">Privacy</Link></p>
    </InfoPage>
  );
}
