import { useEffect, useState } from 'react';
import { usePwa } from '../context/PwaContext.jsx';

/*
  true when a dashboard should use the app shell (app bar + bottom tabs)
  instead of its desktop sidebar/topbar: always inside the installed app,
  and on phone-width browsers.
*/
export default function useAppShell() {
  const { isPwa } = usePwa();
  const q = '(max-width: 767px)';
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return isPwa || narrow;
}
