'use client';

import { useState } from 'react';
import type { OrderStatus } from '@/lib/orders';

export default function TrackForm() {
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<OrderStatus | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, order }) });
      const data = await res.json();
      if (res.ok) setResult(data);
      else setError(data.error || 'Something went wrong. Try again.');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const steps = result ? [
    { label: 'Order placed', done: true },
    { label: 'Payment confirmed', done: result.paid },
    { label: 'Sent to our warehouse', done: result.sentToWarehouse },
    { label: 'Shipped', done: result.tracking.length > 0 },
  ] : [];

  return (
    <>
      <form className="track-form" onSubmit={submit}>
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="The email you ordered with" /></label>
        <label>Order number<input required value={order} onChange={(e) => setOrder(e.target.value)} placeholder="FT-XXXXXXXX" /></label>
        <button type="submit" className="btn" disabled={busy}>{busy ? 'Looking…' : 'Track my order'}</button>
        {error && <p className="drawer-msg" role="alert">{error}</p>}
      </form>
      {result && (
        <div className="track-result" role="status">
          <h2>Order {result.number}</h2>
          <p className="lede">Placed {new Date(result.placed).toLocaleDateString()}</p>
          {steps.map((s) => <div key={s.label} className={`track-step${s.done ? ' is-done' : ''}`}><i />{s.label}</div>)}
          {result.tracking.map((t) => (
            <p key={t.number}>Tracking number <strong>{t.number}</strong>{t.carrier ? ` (${t.carrier})` : ''}: <a className="link" href={t.url} target="_blank" rel="noreferrer">follow your parcel</a></p>
          ))}
          {!result.tracking.length && <p className="lede">Your tracking number shows here once the parcel ships, usually 1 to 3 business days after ordering.</p>}
        </div>
      )}
    </>
  );
}
