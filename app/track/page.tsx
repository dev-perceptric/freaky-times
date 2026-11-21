import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import TrackForm from '@/components/TrackForm';
import { SUPPORT_EMAIL } from '@/lib/site';

export const metadata: Metadata = { title: 'Track Your Order', description: 'Track your FreakyTimes order with your email and order number.' };

export default function TrackPage() {
  return (
    <InfoPage title="Track your order" intro="Enter the email you ordered with and your order number. You’ll find the number on your order confirmation page and email.">
      <TrackForm />
      <p>Can’t find your order number? Email <a className="link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we’ll look it up.</p>
    </InfoPage>
  );
}
