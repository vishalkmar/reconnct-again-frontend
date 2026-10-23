import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Wallet, Heart, Bell, MessageCircle, UserPen, Building2, ShieldCheck, FileText, LogOut, ChevronRight, Smartphone, Store,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useUserAuth } from '../../context/UserAuthContext.jsx';
import { useSupplierAuth } from '../../context/SupplierAuthContext.jsx';
import { usePwa } from '../../context/PwaContext.jsx';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import { InstallAppButton } from '../../components/pwa/InstallApp.jsx';

/*
  /profile — the app's Profile tab: who you are + one list linking every
  member page (bookings, transactions, wishlist, notifications, support,
  edit profile, hosting), plus legal and sign-out. Signed-out visitors get
  the sign-in entry instead.
*/
export default function ProfileHubPage() {
  const { user, isAuthenticated, loading, requestLogin, logout } = useUserAuth();
  const { supplier } = useSupplierAuth();
  const { isPwa } = usePwa();
  const navigate = useNavigate();
  useDocumentMeta({ title: 'Profile · Reconnct', description: 'Your Reconnct account.' });

  if (loading) return <div className="max-w-xl mx-auto px-4 py-10"><div className="rc-skeleton h-24 rounded-3xl" /></div>;

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-3xl shadow-soft p-6 text-center">
          <span className="mx-auto grid place-items-center w-16 h-16 rounded-full bg-rc-brand-soft text-rc-brand-text"><UserPen size={28} /></span>
          <h1 className="font-sans text-xl font-black text-rc-navy mt-4">Sign in to Reconnct</h1>
          <p className="text-sm text-rc-ink-muted mt-1">See your bookings, wishlist and rewards.</p>
          <button type="button" onClick={() => (isPwa ? navigate('/login') : requestLogin({ redirectTo: '/profile' }))} className="mt-5 w-full h-12 rounded-full bg-rc-brand text-white font-extrabold">
            Sign in / Sign up
          </button>
          <Link to={supplier ? '/supplier/dashboard' : '/supplier/login'} className="mt-3 flex items-center justify-center gap-2 h-12 rounded-full border border-rc-border font-bold text-rc-ink">
            <Store size={16} />{supplier ? 'Supplier dashboard' : 'Partner login'}
          </Link>
        </div>
        <LegalList />
      </div>
    );
  }

  const initial = (user?.name || 'M').charAt(0).toUpperCase();
  const groups = [
    [
      { to: '/dashboard/bookings', label: 'My bookings', icon: BookOpen },
      { to: '/dashboard/transactions', label: 'Transactions', icon: Wallet },
      { to: '/dashboard/wishlist', label: 'Wishlist', icon: Heart },
      { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
      { to: '/dashboard/support', label: 'Help & support', icon: MessageCircle },
    ],
    [
      { to: '/dashboard/profile', label: 'Edit profile', icon: UserPen },
      { to: '/host', label: 'Switch to hosting', icon: Building2 },
    ],
  ];

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-4 bg-white rounded-3xl shadow-soft p-5">
        {user?.avatarUrl
          ? <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
          : <span className="grid place-items-center w-16 h-16 rounded-full bg-rc-navy text-white text-2xl font-bold">{initial}</span>}
        <div className="min-w-0 flex-1">
          <div className="font-sans text-lg font-black text-rc-navy truncate">{user?.name || 'Member'}</div>
          <div className="text-sm text-rc-ink-muted truncate">{user?.email}</div>
          <Link to="/dashboard" className="text-xs font-bold text-rc-brand">Open dashboard ›</Link>
        </div>
      </div>

      <InstallAppButton source="profile_hub" className="mt-4 flex items-center gap-3 rc-hero-grad text-white rounded-2xl p-4">
        <Smartphone size={22} />
        <span className="flex-1 font-bold">Install the Reconnct app</span>
        <ChevronRight size={18} />
      </InstallAppButton>

      {groups.map((g, i) => (
        <ul key={i} className="mt-4 bg-white rounded-2xl shadow-soft divide-y divide-rc-border">
          {g.map((it) => (
            <li key={it.to}>
              <Link to={it.to} className="flex items-center gap-3 px-4 h-14 text-[15px] text-rc-ink active:bg-rc-bg">
                <it.icon size={19} className="text-rc-ink-muted" /><span className="flex-1">{it.label}</span><ChevronRight size={17} className="text-rc-ink-faint" />
              </Link>
            </li>
          ))}
        </ul>
      ))}

      <LegalList />

      <button
        type="button"
        onClick={() => { logout(); toast.success('Signed out'); navigate('/'); }}
        className="mt-4 w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-white shadow-soft text-red-600 font-bold"
      >
        <LogOut size={17} /> Sign out
      </button>
    </div>
  );
}

function LegalList() {
  return (
    <ul className="mt-4 bg-white rounded-2xl shadow-soft divide-y divide-rc-border">
      {[{ to: '/privacy', label: 'Privacy Policy', icon: ShieldCheck }, { to: '/terms', label: 'Terms & Conditions', icon: FileText }].map((it) => (
        <li key={it.to}>
          <Link to={it.to} className="flex items-center gap-3 px-4 h-14 text-[15px] text-rc-ink active:bg-rc-bg">
            <it.icon size={19} className="text-rc-ink-muted" /><span className="flex-1">{it.label}</span><ChevronRight size={17} className="text-rc-ink-faint" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
