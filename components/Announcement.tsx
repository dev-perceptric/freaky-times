import { RETURN_DAYS, WELCOME_PERCENT } from '@/lib/site';

const MESSAGES = ['Free shipping on every order', `${RETURN_DAYS} day returns`, `${WELCOME_PERCENT}% off your first order`, 'New lingerie drops every week', 'Discreet packaging, always'];

/** Black bar at the very top with messages that scroll sideways. */
export default function Announcement() {
  const row = [...MESSAGES, ...MESSAGES];
  return (
    <div className="announce" role="region" aria-label="Store news">
      <p className="sr-only">{MESSAGES.join('. ')}.</p>
      <div className="announce-track" aria-hidden="true">
        {[...row, ...row].map((m, i) => <span key={i}>{m}</span>)}
      </div>
    </div>
  );
}
