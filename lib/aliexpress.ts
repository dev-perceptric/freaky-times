import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// AliExpress Open Platform (IOP gateway). System APIs like "aliexpress.ds.product.get"
// go to /sync; REST APIs like "/auth/token/create" go to /rest + path.
const GATEWAY = 'https://api-sg.aliexpress.com';
const dataDir = () => process.env.DATA_DIR || path.join(process.cwd(), 'data');
const tokenFile = () => path.join(dataDir(), 'aliexpress.json');

export class AliExpressError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
  }
}

function keys() {
  const appKey = process.env.ALIEXPRESS_APP_KEY;
  const secret = process.env.ALIEXPRESS_APP_SECRET;
  if (!appKey || !secret) throw new AliExpressError('ALIEXPRESS_APP_KEY and ALIEXPRESS_APP_SECRET are not set');
  return { appKey, secret };
}

/** HMAC-SHA256 over the sorted key+value pairs; REST APIs put their path in front. Uppercase hex. */
export function sign(params: Record<string, string>, secret: string, apiPath = '') {
  const base = apiPath + Object.keys(params).sort().map((k) => k + params[k]).join('');
  return crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex').toUpperCase();
}

const stringify = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v));

async function raw(api: string, params: Record<string, unknown>, accessToken?: string) {
  const { appKey, secret } = keys();
  const isRest = api.startsWith('/');
  const all: Record<string, string> = {
    app_key: appKey,
    timestamp: String(Date.now()),
    sign_method: 'sha256',
    ...(isRest ? {} : { method: api }),
    ...(accessToken ? { access_token: accessToken } : {}),
  };
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) all[k] = stringify(v);
  all.sign = sign(all, secret, isRest ? api : '');
  const url = isRest ? `${GATEWAY}/rest${api}` : `${GATEWAY}/sync`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(all),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  const err = data?.error_response ?? (data?.code && data.code !== '0' ? data : null);
  if (!res.ok || err) {
    throw new AliExpressError(`AliExpress ${api} failed: ${err?.msg ?? err?.message ?? err?.sub_msg ?? res.status}`, err?.code ?? err?.sub_code);
  }
  return data;
}

// ---------- the store's AliExpress sign-in ----------

interface Tokens {
  access_token: string;
  refresh_token: string;
  /** Epoch ms. */
  expire_time: number;
  refresh_token_valid_time: number;
  account?: string;
  user_nick?: string;
}

let memo: Tokens | null = null;

async function loadTokens(): Promise<Tokens | null> {
  if (memo) return memo;
  try {
    memo = JSON.parse(await fs.readFile(tokenFile(), 'utf8'));
    return memo;
  } catch {
    // Fallback when the server has no saved data folder: tokens pasted into .env.
    if (process.env.ALIEXPRESS_REFRESH_TOKEN) {
      memo = {
        access_token: process.env.ALIEXPRESS_ACCESS_TOKEN ?? '',
        refresh_token: process.env.ALIEXPRESS_REFRESH_TOKEN,
        expire_time: process.env.ALIEXPRESS_ACCESS_TOKEN ? Date.now() + 3600e3 : 0,
        refresh_token_valid_time: Date.now() + 30 * 86400e3,
      };
      return memo;
    }
    return null;
  }
}

async function saveTokens(t: Tokens) {
  memo = t;
  try {
    await fs.mkdir(dataDir(), { recursive: true });
    await fs.writeFile(tokenFile(), JSON.stringify(t), { mode: 0o600 });
    return true;
  } catch (e) {
    console.warn('aliexpress: could not save the sign-in to disk', (e as Error).message);
    return false;
  }
}

const toTokens = (d: any): Tokens => ({
  access_token: d.access_token,
  refresh_token: d.refresh_token,
  expire_time: Number(d.expire_time) || Date.now() + Number(d.expires_in || 0) * 1000,
  refresh_token_valid_time: Number(d.refresh_token_valid_time) || Date.now() + Number(d.refresh_expires_in || 0) * 1000,
  account: d.account,
  user_nick: d.user_nick,
});

/** Swaps the one-time code from the sign-in page for tokens and saves them. */
export async function connectWithCode(code: string) {
  const t = toTokens(await raw('/auth/token/create', { code }));
  const saved = await saveTokens(t);
  return { tokens: t, saved };
}

async function accessToken() {
  const t = await loadTokens();
  if (!t) throw new AliExpressError('AliExpress is not connected yet. Open /api/aliexpress/connect first.', 'NOT_CONNECTED');
  // Renew when less than an hour is left.
  if (t.access_token && t.expire_time - Date.now() > 3600e3) return t.access_token;
  return (await refresh(t)).access_token;
}

async function refresh(t: Tokens) {
  const fresh = toTokens(await raw('/auth/token/refresh', { refresh_token: t.refresh_token }));
  const next = { ...t, ...fresh };
  await saveTokens(next);
  return next;
}

/**
 * Keeps the sign-in alive while the store is quiet. AliExpress sign-ins can be short
 * (a day, renewable for two), so renew whenever either one is getting close.
 */
export async function keepAliExpressAlive() {
  const t = await loadTokens();
  if (!t) return 'not connected';
  const now = Date.now();
  if (t.expire_time - now > 12 * 3600e3 && t.refresh_token_valid_time - now > 36 * 3600e3) return 'fresh';
  const next = await refresh(t);
  return `renewed until ${new Date(next.expire_time).toISOString()}`;
}

export async function connectionStatus() {
  const t = await loadTokens();
  if (!t) return { connected: false as const };
  return { connected: true as const, account: t.account ?? t.user_nick, accessExpires: new Date(t.expire_time).toISOString(), refreshExpires: new Date(t.refresh_token_valid_time).toISOString() };
}

export function authorizeUrl(redirectUri: string, state: string) {
  const q = new URLSearchParams({ response_type: 'code', force_auth: 'true', redirect_uri: redirectUri, client_id: keys().appKey, state });
  return `${GATEWAY}/oauth/authorize?${q}`;
}

/** Calls a dropshipping API as the store's AliExpress account. */
export async function ae<T = any>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  return raw(method, params, await accessToken());
}

// ---------- ordering ----------

export interface AeRecipient {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  countryCode: string;
  zip: string;
  phone?: string;
}

export interface AeLine {
  productId: string;
  skuAttr: string;
  skuId?: string;
  quantity: number;
}

interface DeliveryOption {
  code: string;
  company?: string;
  shipping_fee_cent?: string;
  free_shipping?: string | boolean;
  min_delivery_days?: string;
  max_delivery_days?: string;
}

/** Cheapest shipping for one item, or the fastest when ALIEXPRESS_SHIPPING=fastest. */
export async function pickDelivery(line: AeLine, to: AeRecipient) {
  const data = await ae('aliexpress.ds.freight.query', {
    queryDeliveryReq: {
      quantity: String(line.quantity),
      shipToCountry: to.countryCode,
      productId: line.productId,
      selectedSkuId: line.skuId,
      province: to.state,
      language: 'en_US',
      currency: 'USD',
      locale: 'en_US',
    },
  });
  const options: DeliveryOption[] = data?.aliexpress_ds_freight_query_response?.result?.delivery_options?.delivery_option_d_t_o
    ?? data?.result?.delivery_options ?? [];
  if (!options.length) throw new AliExpressError(`No AliExpress shipping for ${line.productId} to ${to.countryCode}`, 'NO_DELIVERY');
  const fee = (o: DeliveryOption) => (o.free_shipping === true || o.free_shipping === 'true' ? 0 : Number(o.shipping_fee_cent ?? 999));
  const days = (o: DeliveryOption) => Number(o.max_delivery_days ?? 99);
  const fastest = process.env.ALIEXPRESS_SHIPPING === 'fastest';
  return [...options].sort((a, b) => (fastest ? days(a) - days(b) || fee(a) - fee(b) : fee(a) - fee(b) || days(a) - days(b)))[0];
}

export interface AeOrderResult {
  outOrderId: string;
  orderIds?: string[];
  status: 'placed' | 'already_sent';
}

/**
 * Places one AliExpress order. outOrderId is our own ID; AliExpress rejects a repeat
 * (REPEATED_ORDER_ERROR), which is how a retried webhook avoids a second order.
 * ALIEXPRESS_AUTO_PAY=false leaves orders waiting for payment in AliExpress.
 */
export async function placeAeOrder(outOrderId: string, to: AeRecipient, lines: AeLine[]): Promise<AeOrderResult> {
  const items = [];
  for (const l of lines) {
    const d = await pickDelivery(l, to);
    items.push({ product_id: l.productId, product_count: String(l.quantity), sku_attr: l.skuAttr, logistics_service_name: d.code });
  }
  try {
    const data = await ae('aliexpress.ds.order.create', {
      param_place_order_request4_open_api_d_t_o: {
        out_order_id: outOrderId,
        logistics_address: {
          full_name: to.name,
          contact_person: to.name,
          address: to.address1,
          address2: to.address2 ?? '',
          city: to.city,
          province: to.state ?? to.city,
          country: to.countryCode,
          zip: to.zip,
          mobile_no: to.phone ?? '',
          phone_country: to.countryCode === 'US' || to.countryCode === 'CA' ? '+1' : '',
          locale: 'en_US',
        },
        product_items: items,
      },
      ds_extend_request: { payment: { try_to_pay: process.env.ALIEXPRESS_AUTO_PAY === 'false' ? 'false' : 'true', pay_currency: 'USD' } },
    });
    const result = data?.aliexpress_ds_order_create_response?.result ?? data?.result ?? {};
    if (result.is_success === false || result.is_success === 'false') {
      if (/REPEATED_ORDER/i.test(String(result.error_code))) return { outOrderId, status: 'already_sent' };
      throw new AliExpressError(`AliExpress order failed: ${result.error_msg ?? result.error_code}`, result.error_code);
    }
    const list = result.order_list?.number ?? result.order_list ?? [];
    return { outOrderId, orderIds: (Array.isArray(list) ? list : [list]).map(String), status: 'placed' };
  } catch (e) {
    if (e instanceof AliExpressError && /REPEATED_ORDER/i.test(`${e.code} ${e.message}`)) return { outOrderId, status: 'already_sent' };
    throw e;
  }
}
