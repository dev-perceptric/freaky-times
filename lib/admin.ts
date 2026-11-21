import crypto from 'node:crypto';

const eq = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** True when the value matches ADMIN_TOKEN from the server's .env. */
export function isAdmin(value: string | null | undefined) {
  const token = process.env.ADMIN_TOKEN;
  return !!token && token.length >= 16 && !!value && eq(value, token);
}

/** A short-lived signed value for OAuth state, so only a sign-in started by an admin is accepted. */
export function signedState(now = Date.now()) {
  const ts = String(now);
  const mac = crypto.createHmac('sha256', process.env.ADMIN_TOKEN ?? '').update(`ae-oauth:${ts}`).digest('hex').slice(0, 32);
  return `${ts}.${mac}`;
}

export function checkState(state: string | null, maxAgeMs = 15 * 60 * 1000) {
  if (!state || !process.env.ADMIN_TOKEN) return false;
  const [ts] = state.split('.');
  return Date.now() - Number(ts) < maxAgeMs && eq(state, signedState(Number(ts)));
}
