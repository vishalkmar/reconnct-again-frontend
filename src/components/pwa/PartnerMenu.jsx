import { Link } from 'react-router-dom';
import { ChevronRight, LogOut } from 'lucide-react';

/*
  The "Profile" tab menu for the host / supplier app shell — every page the
  desktop sidebar links to, as a tappable list, plus sign-out. Rendered above
  the profile page content on phones / in the installed app.
*/
export default function PartnerMenu({ header, items, onLogout }) {
  return (
    <div className="mb-5">
      {header}
      <ul className="mt-3 bg-white rounded-2xl shadow-soft divide-y divide-slate-100">
        {items.map((it) => (
          <li key={it.to}>
            <Link to={it.to} className="flex items-center gap-3 px-4 h-14 text-[15px] text-ink active:bg-surface-alt">
              <it.icon size={19} className="text-ink-muted" />
              <span className="flex-1">{it.label}</span>
              <ChevronRight size={17} className="text-slate-300" />
            </Link>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onLogout}
        className="mt-3 w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-white shadow-soft text-red-600 font-semibold"
      >
        <LogOut size={17} /> Sign out
      </button>
    </div>
  );
}
