// Store details shown on the policy pages and sent to Google Merchant Center.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://freakytimes.com';
export const STORE_NAME = 'FreakyTimes';
export const BRAND = 'FreakyTimes';
export const SUPPORT_EMAIL = 'support@freakytimes.com';
export const RETURN_DAYS = 14;
/** Countries checkout ships to (keep in step with app/api/checkout). */
export const SHIP_COUNTRIES = ['US', 'CA', 'GB', 'AU', 'NZ', 'IE', 'DE', 'FR', 'NL', 'ES', 'IT', 'SE', 'DK'];
export const SHIP_COUNTRY_NAMES = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'New Zealand', 'Ireland', 'Germany', 'France', 'Netherlands', 'Spain', 'Italy', 'Sweden', 'Denmark',
];
/** Typical delivery window across the catalog, in days. */
export const DELIVERY_MIN = 6;
export const DELIVERY_MAX = 17;
/** Google Search Console / Merchant Center site verification code (the content="..." part of the meta tag). */
export const GOOGLE_SITE_VERIFICATION = '';
/** Pinterest website claim (Settings → Claimed accounts → Add HTML tag). */
export const PINTEREST_VERIFICATION = '';
/** First-order discount offered in the email pop-up. The code must exist as a Stripe promotion code. */
export const WELCOME_PERCENT = 10;
export const WELCOME_CODE = 'FREAKY10';
