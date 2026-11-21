import type { Metadata } from 'next';
import Crumbs from '@/components/Crumbs';
import Faq from '@/components/Faq';

export const metadata: Metadata = { title: 'FAQ', description: 'Shipping, returns, sizing and tracking questions about FreakyTimes lingerie.' };

export default function FaqPage() {
  return (
    <section className="sec info-page">
      <div className="wrap">
        <Crumbs items={[{ label: 'Home', href: '/' }, { label: 'FAQ', href: '/faq' }]} />
        <header className="coll-head"><h1>FAQ</h1><p className="coll-intro">Everything about shipping, returns, sizing and your order.</p></header>
        <Faq />
      </div>
    </section>
  );
}
