import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Clarity from '@microsoft/clarity';

/*
  Microsoft Clarity for the WEBSITE — project y5869zafi8.

  Scope rule (deliberate): only PUBLIC pages + the signed-in USER area are
  recorded. The internal staff portals — admin, team and supplier dashboards —
  are NEVER tracked, because they show sensitive business + customer data that
  must not leave for analytics.

  How the exclusion is guaranteed on a single-page app:
    • Clarity is init'd LAZILY — only the first time the visitor is on a tracked
      route. An admin who lands straight on /admin never starts a session.
    • If a visitor moves from a public page INTO an excluded area, recording is
      halted via the SDK's global `window.clarity('stop')`; moving back to a
      tracked page resumes it with `window.clarity('start')`.
  So nothing on /admin, /team or /supplier is ever captured.
*/

const CLARITY_PROJECT_ID = 'y5869zafi8';

// Internal portals to exclude from analytics entirely.
const EXCLUDED = /^\/(admin|team|supplier)(\/|$)/i;
const isTracked = (pathname) => !EXCLUDED.test(pathname || '');

export default function ClarityTracker() {
  const { pathname } = useLocation();
  const started = useRef(false); // has Clarity.init run yet?

  useEffect(() => {
    try {
      const tracked = isTracked(pathname);

      if (tracked) {
        if (!started.current) {
          // First tracked page this visit → begin recording.
          Clarity.init(CLARITY_PROJECT_ID);
          started.current = true;
        } else if (typeof window !== 'undefined' && typeof window.clarity === 'function') {
          // Returning from an excluded area → resume.
          window.clarity('start');
        }
      } else if (started.current && typeof window !== 'undefined' && typeof window.clarity === 'function') {
        // Entered admin / team / supplier → stop capturing anything here.
        window.clarity('stop');
      }
    } catch {
      // Analytics must never break the app.
    }
  }, [pathname]);

  return null;
}
