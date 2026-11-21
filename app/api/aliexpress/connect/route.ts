import { NextResponse } from 'next/server';
import { isAdmin, signedState } from '@/lib/admin';
import { authorizeUrl } from '@/lib/aliexpress';

export const dynamic = 'force-dynamic';

// Open https://freakytimes.com/api/aliexpress/connect?key=ADMIN_TOKEN to sign the store into AliExpress.
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!isAdmin(url.searchParams.get('key'))) return new NextResponse('Not allowed', { status: 403 });
  if (process.env.ALIEXPRESS_TOKEN_READONLY === 'true') {
    return new NextResponse('This store uses the shared AliExpress sign-in from Blazed Kitty, so there is nothing to connect here.', { status: 200 });
  }
  const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  return NextResponse.redirect(authorizeUrl(`${origin}/api/aliexpress/callback`, signedState()));
}
