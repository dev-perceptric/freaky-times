import type { Metadata } from 'next';
import Link from 'next/link';
import InfoPage from '@/components/InfoPage';

export const metadata: Metadata = { title: 'About FreakyTimes', description: 'FreakyTimes is a lingerie store for women: lace bra sets, bodysuits, babydolls, corsets, robes, thigh highs and costumes.' };

export default function AboutPage() {
  return (
    <InfoPage title="About FreakyTimes" intro="Dressed to be undressed.">
      <h2>Who we are</h2>
      <p>FreakyTimes is a lingerie store for anyone who likes their nights a little more interesting. We pick the lace sets, bodysuits, babydolls, corsets, silky robes and thigh highs that make you feel like the main event, whether anyone else sees them or not.</p>
      <h2>What we sell</h2>
      <p>Lingerie, sleepwear, legwear, costumes, clubwear and the little extras, sorted by style and vibe so you can find exactly what you are in the mood for. New drops land every week, in sizes from XS to 5XL.</p>
      <h2>How it works</h2>
      <p>Your order ships straight from our partner warehouses in plain, discreet packaging with free shipping on every order. That keeps prices low and lets us carry far more styles than a single shop could stock.</p>
      <h2>Get in touch</h2>
      <p>Questions about sizing, an order or a return? See the <Link className="link" href="/faq">FAQ</Link> or <Link className="link" href="/contact">contact us</Link>.</p>
    </InfoPage>
  );
}
