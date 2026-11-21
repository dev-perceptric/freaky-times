import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { RETURN_DAYS, SUPPORT_EMAIL } from '@/lib/site';

export const metadata: Metadata = { title: 'Returns & Refunds', description: `Returns accepted within ${RETURN_DAYS} days of delivery.` };

export default function ReturnsPage() {
  return (
    <InfoPage title="Returns & Refunds" intro={`Changed your mind? You can return items within ${RETURN_DAYS} days of delivery.`}>
      <h2>What can be returned</h2>
      <p>Items must be unworn, unwashed and in their original condition with any tags attached. For hygiene reasons, earrings, body jewelry and socks can only be returned if they arrive damaged or faulty.</p>
      <h2>How to return</h2>
      <p>
        Email <a className="link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> within {RETURN_DAYS} days of delivery with your order number and the items you want to return.
        We reply with the return address and steps. Please don't send items back before we reply.
      </p>
      <h2>Return shipping</h2>
      <p>The customer pays for return shipping. We recommend a tracked service, since we can't refund items that don't reach us.</p>
      <h2>Refunds</h2>
      <p>Once your return arrives and is checked, we refund the item price to your original payment method. Refunds usually show up within 5 to 10 business days.</p>
      <h2>Damaged, faulty or wrong items</h2>
      <p>
        If something arrives damaged, faulty or isn't what you ordered, email us within {RETURN_DAYS} days of delivery with a photo. We send a free replacement or a full refund, and you don't pay for return shipping.
      </p>
      <h2>Lost orders</h2>
      <p>If your tracking hasn't updated for 30 days or your order hasn't arrived within 30 days, email us and we will reship it or refund you.</p>
    </InfoPage>
  );
}
