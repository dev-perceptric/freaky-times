import { checkState } from '@/lib/admin';
import { connectWithCode } from '@/lib/aliexpress';

export const dynamic = 'force-dynamic';

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title>
<body style="font-family:system-ui;background:#0c0b0c;color:#f3eee9;max-width:640px;margin:60px auto;padding:0 16px;line-height:1.5">
<h1 style="font-size:22px">${title}</h1>${body}</body>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// AliExpress sends the store owner back here after they approve the app.
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!checkState(url.searchParams.get('state'))) {
    return page('Link expired', '<p>Start again from the connect link.</p>', 403);
  }
  const code = url.searchParams.get('code');
  if (!code) return page('No code', '<p>AliExpress did not send a sign-in code. Start again from the connect link.</p>', 400);
  try {
    const { tokens, saved } = await connectWithCode(code);
    const who = esc(tokens.account ?? tokens.user_nick ?? 'your AliExpress account');
    if (saved) return page('AliExpress connected', `<p>FreakyTimes is signed in as <b>${who}</b>. You can close this tab.</p>`);
    return page(
      'Connected, but not saved',
      `<p>Signed in as <b>${who}</b>, but the server has no saved data folder, so this sign-in will be lost on the next deploy.</p>
<p>Add this line to <code>/opt/freaky-times/.env</code> and restart, or add the data volume to docker-compose.yml:</p>
<pre style="white-space:pre-wrap;word-break:break-all;background:#1c1a1c;padding:12px">ALIEXPRESS_REFRESH_TOKEN=${esc(tokens.refresh_token)}</pre>`,
    );
  } catch (e) {
    return page('AliExpress said no', `<p>${esc((e as Error).message)}</p><p>Start again from the connect link.</p>`, 502);
  }
}
