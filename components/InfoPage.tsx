import Crumbs from './Crumbs';

/** Plain text page (shipping, returns, contact, privacy). */
export default function InfoPage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="sec info-page">
      <div className="wrap">
        <Crumbs items={[{ label: 'Home', href: '/' }]} />
        <div className="shop-head"><h1>{title}</h1></div>
        {intro && <p className="lede">{intro}</p>}
        <div className="info-body">{children}</div>
      </div>
    </section>
  );
}
