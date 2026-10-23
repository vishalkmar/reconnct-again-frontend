import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/*
  Inner-page app bar (installed app): back button + title, sits under the
  status bar (safe-area aware). Back falls back to Home when there is no
  in-app history (e.g. opened from a shortcut or a shared link).
*/
export default function MobileTopBar({ title, right, back: showBack = true }) {
  const navigate = useNavigate();
  const back = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate('/', { replace: true });
  };
  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-b border-rc-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="h-14 flex items-center gap-2 px-2">
        {showBack ? (
          <button type="button" onClick={back} aria-label="Back" className="grid place-items-center w-11 h-11 rounded-full hover:bg-rc-bg active:bg-rc-border">
            <ArrowLeft size={21} />
          </button>
        ) : <span className="w-2" />}
        <h1 className="flex-1 min-w-0 font-sans text-base font-extrabold text-rc-navy truncate">{title}</h1>
        {right}
      </div>
    </header>
  );
}
