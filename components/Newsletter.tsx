'use client';

import { useId, useState } from 'react';

export default function Newsletter() {
  const id = useId();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('busy');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setState('done');
        setMsg('You’re in. Watch your inbox for the next drop.');
      } else {
        setState('error');
        setMsg(data.error || 'That didn’t work. Try again in a minute.');
      }
    } catch {
      setState('error');
      setMsg('Could not reach the server. Check your connection and try again.');
    }
  }

  return (
    <form className="news-form" onSubmit={submit}>
      <label htmlFor={id} className="sr-only">Email address</label>
      <input id={id} type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={state === 'busy' || state === 'done'} />
      <button type="submit" className="btn btn-pink" disabled={state === 'busy' || state === 'done'}>
        {state === 'busy' ? 'Joining…' : state === 'done' ? 'Joined' : 'Join the club'}
      </button>
      {msg && <p className={`news-msg ${state}`} role="status">{msg}</p>}
    </form>
  );
}
