import { DELIVERY_MAX, DELIVERY_MIN, RETURN_DAYS, SUPPORT_EMAIL, WELCOME_PERCENT } from './site';

export const FAQ: { q: string; a: string }[] = [
  { q: 'How long does shipping take?', a: `Shipping is free on every order. Most orders arrive in ${DELIVERY_MIN} to ${DELIVERY_MAX} days, and each product page shows the estimate for that piece. Pieces in one order can arrive in separate packages.` },
  { q: 'How do I track my order?', a: 'Go to Track Order and enter your email and order number (it starts with FT- and is on your confirmation page). Your tracking number shows there once your parcel ships, usually 1 to 3 business days after you order.' },
  { q: 'What is your return policy?', a: `You can return unworn items with tags within ${RETURN_DAYS} days of delivery. Email ${SUPPORT_EMAIL} first and we send the return address. If something arrives damaged or wrong, we replace or refund it for free.` },
  { q: 'How does the lingerie fit?', a: 'Every product shows US and EU sizes, and the size guide on each product page lists bust, waist and hip measurements in inches and centimeters. Most of our lingerie runs small, so size up if you are between sizes. Many sets come in plus sizes up to 5XL.' },
  { q: 'Is the packaging discreet?', a: 'Yes. Every order ships in a plain package with no store name or product details on the outside, and your card statement shows a neutral name.' },
  { q: 'Do you ship worldwide?', a: 'We ship to the United States, Canada, the United Kingdom, Australia, New Zealand, Ireland, Germany, France, the Netherlands, Spain, Italy, Sweden and Denmark. Orders outside the US may pay local import taxes.' },
  { q: 'Is there a discount for my first order?', a: `Yes. Join the Freaky Club email list and you get ${WELCOME_PERCENT}% off your first order. Enter the code at checkout.` },
  { q: 'Can I return lingerie?', a: `For hygiene reasons, panties, bodysuits and anything worn against the skin can only be returned unworn, with the hygiene liner and tags still on, within ${RETURN_DAYS} days of delivery. Robes, costumes and accessories follow the normal return policy.` },
];
