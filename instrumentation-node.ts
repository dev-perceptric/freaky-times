import { keepAliExpressAlive } from './lib/aliexpress';

// Keep the AliExpress sign-in fresh while the store is quiet.
const tick = () =>
  keepAliExpressAlive()
    .then((s) => s !== 'fresh' && s !== 'not connected' && console.log('aliexpress sign-in', s))
    .catch((e) => console.warn('aliexpress keep-alive failed', e.message));

setTimeout(tick, 60_000);
setInterval(tick, 3 * 3600_000);
