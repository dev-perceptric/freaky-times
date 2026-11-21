import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="sec">
      <div className="wrap notfound">
        <p className="whisper">well, this is awkward</p>
        <h1>Page not found</h1>
        <p className="lede">The link might be old, or the piece sold out.</p>
        <Link href="/shop" className="btn">Back to the shop</Link>
      </div>
    </section>
  );
}
