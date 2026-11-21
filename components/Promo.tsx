'use client';

import { useEffect, useId, useState } from 'react';
import { usePathname } from 'next/navigation';
import { WELCOME_CODE, WELCOME_PERCENT } from '@/lib/site';

const SEEN = 'ft-promo-seen';
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

/** "Get 10% off your first order" pop-up: join the email list, get the code. Shows once, then a small tab. */
export default function Promo() {
  const id = useId();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    const seen = read(SEEN);
    if (seen === 'joined') return;
    if (seen) { setTab(true); return; }
    const t = setTimeout(() => setOpen(true), 9000);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function close() {
    setOpen(false);
    if (state === 'done') { write(SEEN, 'joined'); setTab(false); } else { write(SEEN, 'later'); setTab(true); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('busy');
    try {
      const res = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      // 503 means sign-ups aren't switched on yet: still give the code.
      if (res.ok || res.status === 503) { setState('done'); write(SEEN, 'joined'); return; }
      const data = await res.json().catch(() => ({}));
      setState('error');
      setMsg(data.error || 'That didn’t work. Try again in a minute.');
    } catch {
      setState('error');
      setMsg('Could not reach the server. Check your connection and try again.');
    }
  }

  if (!open) {
    return tab ? <button type="button" className="promo-tab" onClick={() => { setOpen(true); setTab(false); }}>Get {WELCOME_PERCENT}% off</button> : null;
  }
  return (
    <div className="promo" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="promo-card">
        <button type="button" className="promo-close" onClick={close} aria-label="Close">✕</button>
        <p className="eyebrow">Freaky Club</p>
        <h2 id={`${id}-t`}>Get <em>{WELCOME_PERCENT}% off</em><br />your first order</h2>
        {state === 'done' ? (
          <>
            <p className="lede">You’re in. Use this code at checkout:</p>
            <span className="promo-code">{WELCOME_CODE}</span>
            <button type="button" className="btn" onClick={close}>Start shopping</button>
          </>
        ) : (
          <>
            <p className="lede">Join the Freaky Club for new drops, restocks and members-only codes.</p>
            <form className="news-form" onSubmit={submit}>
              <label htmlFor={id} className="sr-only">Email address</label>
              <input id={id} type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={state === 'busy'} />
              <button type="submit" className="btn btn-pink btn-block" disabled={state === 'busy'}>{state === 'busy' ? 'Joining…' : 'Get my code'}</button>
              {msg && <p className="news-msg" role="status">{msg}</p>}
            </form>
            <button type="button" className="text-btn" onClick={close}>No thanks</button>
          </>
        )}
      </div>
    </div>
  );
}
