import { useEffect, useState } from 'react';
import api, { fileUrl } from '../services/api';

const FALLBACK_LOGO = '/retreatlogo.png';
const FALLBACK_NAME = 'Retreats by Traveon';

// Resolve a stored logo path to a usable <img src>.
const resolveLogo = (url) =>
  url
    ? (url.startsWith('/uploads/') || /^https?:\/\//.test(url) ? fileUrl(url) : url)
    : FALLBACK_LOGO;

// Module-level cache so the whole app fetches /site-info only once and every
// header/sidebar/footer shares the same admin-managed logo + brand name.
let cache = null;
let inflight = null;
const subscribers = new Set();

function loadSiteInfo() {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = api.get('/site-info')
    .then((res) => {
      const remote = res.data?.data?.siteInfo || {};
      cache = {
        logoSrc: resolveLogo(remote.logoUrl),
        companyName: remote.companyName || FALLBACK_NAME,
      };
      subscribers.forEach((fn) => fn(cache));
      return cache;
    })
    .catch(() => {
      cache = { logoSrc: FALLBACK_LOGO, companyName: FALLBACK_NAME };
      subscribers.forEach((fn) => fn(cache));
      return cache;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

/**
 * Returns the admin-managed site logo + brand name for use in any header,
 * sidebar or topbar. Falls back to the bundled logo until /site-info resolves.
 */
export default function useSiteLogo() {
  const [info, setInfo] = useState(cache || { logoSrc: FALLBACK_LOGO, companyName: FALLBACK_NAME });

  useEffect(() => {
    let active = true;
    const update = (data) => { if (active) setInfo(data); };
    subscribers.add(update);
    loadSiteInfo().then(update);
    return () => { active = false; subscribers.delete(update); };
  }, []);

  return info;
}
