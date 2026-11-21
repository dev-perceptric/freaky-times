import crypto from 'node:crypto';
import type { Product } from './products';

const API = 'https://api.printful.com';

export class PrintfulError extends Error {
  constructor(message: string, public status: number, public reason?: string) {
    super(message);
  }
}

export async function printful<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = process.env.PRINTFUL_API_TOKEN;
  if (!token) throw new PrintfulError('PRINTFUL_API_TOKEN is not set', 503);
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  if (process.env.PRINTFUL_STORE_ID) headers['X-PF-Store-Id'] = process.env.PRINTFUL_STORE_ID;

  const res = await fetch(API + path, {
    method: init.method ?? 'GET',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new PrintfulError(`Printful ${path} failed: ${data?.error?.message ?? data?.result ?? res.status}`, res.status, data?.error?.reason);
  }
  return data.result as T;
}

interface SyncVariant {
  id: number;
  color: string | null;
  size: string | null;
  synced: boolean;
  availability_status?: string;
}

// Printful's variant list per store product, kept for the life of the server process.
const variantCache = new Map<number, SyncVariant[]>();

async function syncVariants(syncProductId: number) {
  const cached = variantCache.get(syncProductId);
  if (cached) return cached;
  const data = await printful<{ sync_variants: SyncVariant[] }>(`/store/products/${syncProductId}`);
  variantCache.set(syncProductId, data.sync_variants);
  return data.sync_variants;
}

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/**
 * Finds the Printful store variant for a product in the color and size the customer picked.
 * All-over prints have one "Full print" color on the site, so they match on size alone.
 */
export async function findSyncVariant(p: Product, color: string, size: string) {
  if (!p.printful) throw new PrintfulError(`${p.slug} is not a Printful product`, 422, 'NotPrintful');
  const variants = (await syncVariants(p.printful.syncProductId)).filter((v) => v.synced);
  const match = variants.find(
    (v) => norm(v.size) === norm(size) && (p.allOver || norm(v.color) === norm(color)),
  );
  if (!match) {
    throw new PrintfulError(`No Printful variant for ${p.slug} in ${color} / ${size}`, 422, 'VariantNotFound');
  }
  return match.id;
}

export interface Recipient {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
  email?: string;
  phone?: string;
}

export interface OrderItem {
  sync_variant_id: number;
  quantity: number;
  retail_price: string;
}

export interface OrderInput {
  externalId: string;
  recipient: Recipient;
  items: OrderItem[];
  retailCosts?: { currency: string; subtotal: string; discount: string; shipping: string; tax: string };
}

export interface PrintfulOrder {
  id: number;
  external_id: string;
  status: string;
}

/** Printful order IDs from us are a short hash of the Stripe session, so the same payment never makes two orders. */
export function externalIdFor(stripeSessionId: string) {
  return 'bk' + crypto.createHash('sha256').update(stripeSessionId).digest('hex').slice(0, 30);
}

export async function getOrderByExternalId(externalId: string) {
  try {
    return await printful<PrintfulOrder>(`/orders/@${externalId}`);
  } catch (e) {
    if (e instanceof PrintfulError && e.status === 404) return null;
    throw e;
  }
}

export async function createOrder(input: OrderInput, confirm: boolean) {
  return printful<PrintfulOrder>(`/orders?confirm=${confirm ? 'true' : 'false'}`, {
    method: 'POST',
    body: {
      external_id: input.externalId,
      shipping: 'STANDARD',
      recipient: input.recipient,
      items: input.items,
      retail_costs: input.retailCosts,
    },
  });
}
