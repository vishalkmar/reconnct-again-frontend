import { useEffect, useState } from 'react';
import { usePwa } from '../../context/PwaContext.jsx';
import '../../styles/app-auth.css';

const SHOWN_KEY = 'rc_app_splash_shown';
const TOTAL_MS = 2950; // matches the aa-splash-out delay + duration in app-auth.css

const alreadyShown = () => { try { return sessionStorage.getItem(SHOWN_KEY) === '1'; } catch { return false; } };

/*
  Installed app only — the launch splash, the web twin of the Android app's
  SplashScreen: the logo's two halves slide in from either side, meet with a
  pulse + ripple rings, a light sweep runs across the wordmark, the tagline
  rises in, then the whole screen fades away. Once per app launch (session).
*/
export default function AppSplash() {
  const { isPwa } = usePwa();
  const [show, setShow] = useState(() => isPwa && !alreadyShown());

  useEffect(() => {
    if (!show) return undefined;
    try { sessionStorage.setItem(SHOWN_KEY, '1'); } catch { /* ignore */ }
    const t = setTimeout(() => setShow(false), TOTAL_MS);
    return () => clearTimeout(t);
  }, [show]);

  if (!show) return null;
  return (
    <div className="app-splash" role="presentation" aria-hidden="true">
      <div className="app-splash__glow" />
      <div className="app-splash__stage">
        <span className="app-splash__pulse" />
        <span className="app-splash__ring" />
        <span className="app-splash__ring app-splash__ring--2" />
        <div className="app-splash__row">
          <div className="app-splash__half app-splash__half--l"><span className="app-splash__logo" /></div>
          <div className="app-splash__half app-splash__half--r"><span className="app-splash__logo" /></div>
          <span className="app-splash__shine" />
        </div>
        <p className="app-splash__tag">Experiences that connect</p>
      </div>
      <div className="app-splash__dots"><span /><span /><span /></div>
    </div>
  );
}
