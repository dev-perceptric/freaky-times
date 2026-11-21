import Link from 'next/link';
import Newsletter from './Newsletter';

/** Shown on a collection that has no products yet. */
export default function ComingSoon({ title, image }: { title: string; image?: string }) {
  return (
    <div className={`soon-block${image ? ' has-media' : ''}`}>
      {image && <div className="photo soon-media"><img src={image} alt="" loading="lazy" /></div>}
      <div className="soon-copy">
        <p className="eyebrow">Dropping soon</p>
        <h2>Coming soon</h2>
        <p className="lede">New {title} pieces are on the way. Join the Freaky Club and you’ll hear first.</p>
        <Newsletter />
        <Link href="/shop/new" className="link">Shop what’s out now</Link>
      </div>
    </div>
  );
}
