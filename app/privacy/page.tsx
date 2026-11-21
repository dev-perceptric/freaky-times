import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { SUPPORT_EMAIL } from '@/lib/site';

export const metadata: Metadata = { title: 'Privacy', description: 'How FreakyTimes uses your information.' };

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy" intro="What we collect, why, and who we share it with.">
      <h2>What we collect</h2>
      <p>When you order, we collect your name, email, shipping address and the items you bought. If you join our newsletter, we keep your email address.</p>
      <h2>Payments</h2>
      <p>Payments are handled by Stripe. We never see or store your full card details.</p>
      <h2>How we use it</h2>
      <p>We use your details to fulfil and ship your order, send order and tracking emails, handle returns, and send newsletters if you signed up. You can unsubscribe at any time.</p>
      <h2>Who we share it with</h2>
      <p>We share your name, address and order details only with the partners that make and ship your order, and with Stripe to process payment. We don't sell your information.</p>
      <h2>Your choices</h2>
      <p>To see, change or delete your information, email <a className="link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
    </InfoPage>
  );
}
