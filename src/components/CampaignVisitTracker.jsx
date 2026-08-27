import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/*
  Closes the loop on a greeting email.

  The pixels in the mail can prove two things: it was opened, and a link was
  tapped. Neither says whether the person actually ARRIVED — a tap on a train
  that loses signal is a click and never a visit — and neither says whether
  they read the page or bounced off it in two seconds. Without that, "click-
  through rate" flatters every campaign equally and tells you nothing about
  which one was worth sending.

  So the chooser page carries the dispatch handle through to the destination
  as `rc=<token>`, and this component reports the two events only the site can
  see:

      landed   once, as soon as the page has rendered
      dwell    how many seconds they stayed, as the page goes away

  ── Why it is built this way ──────────────────────────────────────────────

  BEACONS, NOT fetch. The API is on a different origin, and neither event
  needs a reply. An <img> for "landed" and navigator.sendBeacon for "dwell"
  both skip CORS preflight entirely, cannot fail visibly, and — critically for
  the unload case — sendBeacon is the only thing browsers promise to deliver
  once a page is being torn down. A fetch() at that moment is routinely
  cancelled.

  visibilitychange, NOT beforeunload. On mobile, closing a tab or switching
  apps often never fires beforeunload at all; `visibilitychange → hidden` is
  the event that actually happens. It can fire more than once, so the backend
  keeps the LONGEST reading rather than the last.

  sessionStorage, not state. The token arrives on the landing URL, but people
  navigate — from the experience to checkout, from checkout back. Keeping it
  for the tab means the dwell report survives that, and clearing the param
  from the address bar means a copy-pasted link never carries someone else's
  tracking handle.
*/

const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const KEY = 'reconnct.campaignVisit';

// A page open for hours is not a reading session, and one such row moves an
// average more than a hundred honest ones. Matches the backend's own cap.
const DWELL_CAP = 30 * 60;

export default function CampaignVisitTracker() {
  const location = useLocation();
  const started = useRef(0);
  const sent = useRef(0);

  // 1 — pick the token off the URL, once, then take it out of the address bar.
  useEffect(() => {
    let token = null;
    try {
      const params = new URLSearchParams(location.search);
      const rc = params.get('rc');
      if (rc) {
        token = rc;
        sessionStorage.setItem(KEY, rc);
        // "Landed" — the page really rendered for a real person.
        const img = new Image();
        img.src = `${API}/campaigns/t/land.gif?t=${encodeURIComponent(rc)}`;

        // Strip `rc` so a shared link does not carry it, without adding a
        // history entry the back button would have to step through.
        params.delete('rc');
        const clean = `${location.pathname}${params.toString() ? `?${params}` : ''}${location.hash || ''}`;
        window.history.replaceState({}, '', clean);
      } else {
        token = sessionStorage.getItem(KEY);
      }
    } catch {
      // Private mode, storage disabled — tracking is never worth an exception.
      return undefined;
    }
    if (!token) return undefined;
    if (!started.current) started.current = Date.now();

    const report = () => {
      const seconds = Math.min(Math.round((Date.now() - started.current) / 1000), DWELL_CAP);
      // Only ever report a LONGER stay; the backend keeps the max anyway, but
      // there is no reason to spend beacons repeating a smaller number.
      if (seconds < 2 || seconds <= sent.current) return;
      sent.current = seconds;
      const url = `${API}/campaigns/t/dwell?t=${encodeURIComponent(token)}&s=${seconds}`;
      try {
        if (navigator.sendBeacon) navigator.sendBeacon(url);
        else new Image().src = url;
      } catch { /* never let a metric break a page */ }
    };

    const onHidden = () => { if (document.visibilityState === 'hidden') report(); };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', report);

    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', report);
      report();
    };
  }, [location.search, location.pathname, location.hash]);

  return null;
}
