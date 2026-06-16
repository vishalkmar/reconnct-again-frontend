// Tiny dynamic loader for Cashfree's PG v3 hosted-checkout SDK. We avoid the
// npm dependency on purpose — the CDN version is the same bytes Cashfree ships
// to production sites and means our bundle doesn't pay the cost for users who
// never click "Pay".

const SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';

let loadingPromise = null;

const loadScript = () =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Cashfree SDK can only load in the browser'));
      return;
    }
    if (window.Cashfree) {
      resolve(window.Cashfree);
      return;
    }
    const existing = document.querySelector(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Cashfree));
      existing.addEventListener('error', () => reject(new Error('Could not load Cashfree SDK')));
      return;
    }
    const tag = document.createElement('script');
    tag.src = SDK_URL;
    tag.async = true;
    tag.onload = () => resolve(window.Cashfree);
    tag.onerror = () => reject(new Error('Could not load Cashfree SDK'));
    document.head.appendChild(tag);
  });

/**
 * Returns a Cashfree instance ready to checkout(). `mode` should be the
 * lowercase string the backend gave us — "test" or "prod".
 */
export const initCashfree = async (mode = 'test') => {
  if (!loadingPromise) loadingPromise = loadScript();
  await loadingPromise;
  const Cashfree = window.Cashfree;
  if (typeof Cashfree !== 'function') {
    throw new Error('Cashfree SDK loaded but the global is missing');
  }
  // The SDK uses "sandbox" / "production"; map from the backend's terse names.
  return Cashfree({ mode: mode === 'prod' ? 'production' : 'sandbox' });
};
