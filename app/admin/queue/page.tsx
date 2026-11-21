'use client';

import { useEffect, useState } from 'react';

// The browser button collects every AliExpress product on the page you're on (links, product cards, embedded frames,
// and as a last resort the product numbers in the page's code) and opens this page with them.
const BOOKMARKLET =
  "javascript:(()=>{const m=new Map(),add=(id,t)=>{if(id&&(!m.has(id)||(!m.get(id)&&t)))m.set(id,(t||'').replace(/\\s+/g,' ').trim().slice(0,150))};" +
  "const docs=[document];document.querySelectorAll('iframe').forEach(f=>{try{f.contentDocument&&docs.push(f.contentDocument)}catch(e){}});" +
  "docs.forEach(d=>{d.querySelectorAll('a[href]').forEach(a=>{const h=a.href,x=(h.match(/\\/item\\/(?:[^/?#]*\\/)?(\\d{9,})/)||h.match(/[?&](?:productId|itemId|product_id)=(\\d{9,})/)||[])[1];" +
  "if(x)add(x,a.innerText||a.title||a.getAttribute('aria-label')||(a.querySelector('img')||{}).alt)});" +
  "d.querySelectorAll('[data-product-id],[data-productid],[data-item-id],[data-spm-anchor-id][productid]').forEach(e=>add(e.getAttribute('data-product-id')||e.getAttribute('data-productid')||e.getAttribute('data-item-id')||e.getAttribute('productid'),e.innerText));" +
  "if(!m.size)for(const r of d.documentElement.innerHTML.matchAll(/(?:\\/item\\/|productId\\W{1,4}|itemId\\W{1,4})(\\d{12,})/g))add(r[1],'')});" +
  "if(!m.size)return alert('No products found here. Scroll down so the products load, then try again.');" +
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
            style={{ flex: 1, padding: '12px', background: '#fff', color: 'var(--text)', border: '1.5px solid var(--line-strong)', borderRadius: 999, paddingLeft: 18 }} />
          <button className="btn" type="submit">Save</button>
        </form>
      )}

      {msg && <p style={{ margin: '24px 0', padding: 16, background: '#fff', color: 'var(--text)', border: '1.5px solid var(--pink)', borderRadius: 12, fontWeight: 600 }}>{msg}</p>}

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
