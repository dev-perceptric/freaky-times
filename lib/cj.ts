const API = 'https://developers.cjdropshipping.com/api2.0/v1';

export class CjError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
  }
}

// CJ access tokens last 180 days, and CJ hands back the same token for 24 hours,
// so one token per server process is plenty. Renew weekly to be safe.
let cached: { token: string; at: number } | null = null;
const RENEW_MS = 7 * 24 * 3600 * 1000;

async function accessToken() {
  if (process.env.CJ_ACCESS_TOKEN) return process.env.CJ_ACCESS_TOKEN;
  if (cached && Date.now() - cached.at < RENEW_MS) return cached.token;
  const apiKey = process.env.CJ_API_KEY;
  if (!apiKey) throw new CjError('CJ_API_KEY is not set');
  const res = await fetch(`${API}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!data?.data?.accessToken) throw new CjError(`CJ token request failed: ${data?.message ?? res.status}`, data?.code);
  cached = { token: data.data.accessToken, at: Date.now() };
  return cached.token;
}

export async function cj<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API + path, {
      method: init.method ?? 'GET',
      headers: { 'CJ-Access-Token': await accessToken(), 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    // Free CJ accounts get about 1 request per second.
    if ((res.status === 429 || data?.code === 1600200) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
      continue;
    }
    if (data?.code === 1600001) cached = null; // token rejected; get a fresh one next time
    if (!res.ok || (data?.code !== 200 && data?.result !== true)) {
      throw new CjError(`CJ ${path} failed: ${data?.message ?? res.status}`, data?.code);
    }
    return data.data as T;
  }
}

export interface CjRecipient {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  countryCode: string;
  zip: string;
  email?: string;
  phone?: string;
}

export interface CjLine {
  vid: string;
  quantity: number;
}

interface Freight {
  logisticName: string;
  logisticPrice: number;
  logisticAging?: string;
}

const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
};

/** Slowest day in a range like "5-9" so "fastest" compares worst cases. */
const slowestDay = (aging?: string) => Math.max(...(aging ?? '99').split('-').map((n) => Number(n) || 99));

/** Picks a CJ shipping method for these items. CJ_SHIPPING=fastest picks speed, anything else picks price. */
export async function pickShipping(from: string, to: CjRecipient, lines: CjLine[]) {
  const options = await cj<Freight[]>('/logistic/freightCalculate', {
    method: 'POST',
    body: { startCountryCode: from, endCountryCode: to.countryCode, zip: to.zip, products: lines },
  });
  if (!options?.length) throw new CjError(`CJ has no shipping from ${from} to ${to.countryCode} for these items`);
  const fastest = process.env.CJ_SHIPPING === 'fastest';
  return [...options].sort((a, b) =>
    fastest
      ? slowestDay(a.logisticAging) - slowestDay(b.logisticAging) || a.logisticPrice - b.logisticPrice
      : a.logisticPrice - b.logisticPrice || slowestDay(a.logisticAging) - slowestDay(b.logisticAging),
  )[0];
}

export interface CjOrderResult {
  orderNumber: string;
  orderId?: string;
  status: 'paid' | 'unpaid' | 'already_sent';
  shipping?: string;
}

/**
 * Creates one CJ order. orderNumber must be unique: CJ rejects a repeat, which is how
 * a retried webhook avoids a second order.
 * CJ_AUTO_PAY=false creates orders you pay by hand in the CJ dashboard. Otherwise the
 * order is paid from your CJ wallet, and if the wallet is short it's created unpaid.
 */
export async function createCjOrder(orderNumber: string, from: string, to: CjRecipient, lines: CjLine[]): Promise<CjOrderResult> {
  const shipping = await pickShipping(from, to, lines);
  const body = (payType: number) => ({
    orderNumber,
    shippingCountryCode: to.countryCode,
    shippingCountry: countryName(to.countryCode),
    shippingProvince: to.state || to.city,
    shippingCity: to.city,
    shippingZip: to.zip,
    shippingCustomerName: to.name,
    shippingAddress: to.address1,
    shippingAddress2: to.address2 ?? '',
    shippingPhone: to.phone ?? '',
    email: to.email ?? '',
    logisticName: shipping.logisticName,
    fromCountryCode: from,
    payType,
    isSandbox: process.env.CJ_SANDBOX === 'true' ? 1 : 0,
    products: lines,
  });
  const create = (payType: number) => cj<{ orderId: string }>('/shopping/order/createOrderV2', { method: 'POST', body: body(payType) });
  const isDuplicate = (e: unknown) => e instanceof CjError && /exist|duplicate|repeat/i.test(e.message);

  const autoPay = process.env.CJ_AUTO_PAY !== 'false';
  try {
    const data = await create(autoPay ? 2 : 3);
    return { orderNumber, orderId: data?.orderId, status: autoPay ? 'paid' : 'unpaid', shipping: shipping.logisticName };
  } catch (e) {
    if (isDuplicate(e)) return { orderNumber, status: 'already_sent' };
    if (!autoPay) throw e;
    // Most likely the CJ wallet is short. Create it unpaid so it isn't lost; pay it in CJ.
    console.warn(`cj: paying ${orderNumber} from the wallet failed, creating it unpaid`, (e as Error).message);
    try {
      const data = await create(3);
      return { orderNumber, orderId: data?.orderId, status: 'unpaid', shipping: shipping.logisticName };
    } catch (e2) {
      if (isDuplicate(e2)) return { orderNumber, status: 'already_sent' };
      throw e2;
    }
  }
}
