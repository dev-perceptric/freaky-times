'use client';

import { useEffect, useState } from 'react';

// The browser button collects every AliExpress product link on the page you're on and opens this page with them.
const BOOKMARKLET =
  "javascript:(()=>{const m=new Map();document.querySelectorAll('a[href*=\"/item/\"]').forEach(a=>{const id=(a.href.match(/item\\/(\\d+)/)||[])[1];" +
  "if(id&&!m.has(id))m.set(id,a.innerText.replace(/\\s+/g,' ').trim().slice(0,150))});if(!m.size)return alert('No products found here. Scroll down and try again.');" +
  "window.open('https://freakytimes.com/admin/queue#'+encodeURIComponent(JSON.stringify({s:location.href,i:[...m]})))})()";

interface Counts { pending: number; added: number; skipped: number; total: number }

export default function QueuePage() {
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState('');
  const [counts, setCounts] = useState<Counts | null>(null);

  async function call(method: string, body?: unknown) {
    const res = await fetch('/api/aliexpress/queue' + (method === 'GET' ? '?limit=1' : ''), {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': localStorage.getItem('ft-admin') || '' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 403) throw new Error('Wrong admin token. Enter it again.');
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Something went wrong.');
    return res.json();
  }

  async function run() {
    let incoming: { s?: string; i?: [string, string][] } | null = null;
    try {
      if (location.hash.length > 1) incoming = JSON.parse(decodeURIComponent(location.hash.slice(1)));
    } catch {
      setMsg('Could not read the products from that page.');
    }
    try {
      if (incoming?.i?.length) {
        const r = await call('POST', { items: incoming.i.map(([id, title]) => ({ id, title })), source: incoming.s });
        history.replaceState(null, '', location.pathname);
        setMsg(`Added ${r.newly} new product${r.newly === 1 ? '' : 's'}${r.duplicates ? ` (${r.duplicates} already on the list)` : ''}. You can close this tab.`);
        setCounts(r);
      } else {
        setCounts(await call('GET'));
      }
    } catch (e) {
      setMsg((e as Error).message);
      if (/token/i.test((e as Error).message)) setSaved(false);
    }
  }

  useEffect(() => {
    const t = localStorage.getItem('ft-admin');
    if (t) {
      setSaved(true);
      run();
    }
    // A second click of the button can land on this tab with only a new #hash.
    const onHash = () => localStorage.getItem('ft-admin') && run();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="wrap" style={{ maxWidth: 640, padding: '48px 16px 96px' }}>
      <h1 style={{ fontSize: 36, marginBottom: 8 }}>Import list</h1>
      <p className="lede">AliExpress products waiting to be added to the store.</p>

      {!saved && (
        <form
          style={{ display: 'flex', gap: 8, margin: '24px 0' }}
          onSubmit={(e) => {
            e.preventDefault();
            localStorage.setItem('ft-admin', token.trim());
            setSaved(true);
            run();
          }}
        >
          <input type="password" placeholder="Admin token" value={token} onChange={(e) => setToken(e.target.value)}
            style={{ flex: 1, padding: '12px', background: '#1a181a', color: 'inherit', border: '1px solid #444' }} />
          <button className="btn" type="submit">Save</button>
        </form>
      )}

      {msg && <p style={{ margin: '24px 0', padding: 16, background: '#1a181a', border: '1px solid #333' }}>{msg}</p>}

      {counts && (
        <p style={{ margin: '16px 0' }}>
          <b>{counts.pending}</b> waiting · <b>{counts.added}</b> added · <b>{counts.skipped}</b> skipped
        </p>
      )}

      <h2 style={{ fontSize: 22, marginTop: 40 }}>The browser button</h2>
      <p>Drag this to your bookmarks bar (press Cmd + Shift + B to show it):</p>
      <p style={{ margin: '16px 0' }}
        dangerouslySetInnerHTML={{ __html: `<a href="${BOOKMARKLET.replace(/"/g, '&quot;')}" class="btn" onclick="alert('Drag me to your bookmarks bar.');return false;">+ FreakyTimes</a>` }} />
      <p>Then on any AliExpress page (a search, a store, your wishlist), scroll to the bottom and click it. Every product on the page gets saved here.</p>
    </div>
  );
}
