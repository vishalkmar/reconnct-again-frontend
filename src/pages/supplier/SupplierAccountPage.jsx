import { useNavigate } from 'react-router-dom';
import { Wallet, UserCog, Bell, ListChecks, CalendarCheck, Mail, Phone, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSupplierAuth } from '../../context/SupplierAuthContext.jsx';
import PartnerMenu from '../../components/pwa/PartnerMenu.jsx';

/*
  /supplier/account — the supplier app's "Profile" tab: company details from
  the supplier session plus every portal page as a menu, and sign-out.
  (Mirrors the Android app's SupplierProfileScreen entry list.)
*/
export default function SupplierAccountPage() {
  const { supplier, logout } = useSupplierAuth();
  const navigate = useNavigate();
  const name = supplier?.companyName || supplier?.supplierName || 'Supplier';

  return (
    <div className="max-w-xl mx-auto">
      <PartnerMenu
        header={(
          <div className="bg-white rounded-2xl shadow-soft p-5">
            <div className="flex items-center gap-3">
              <span className="grid place-items-center w-14 h-14 rounded-full bg-brand text-white text-xl font-bold">{name.charAt(0).toUpperCase()}</span>
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wide text-brand-dark">Supplier</div>
                <div className="font-semibold text-ink text-lg truncate">{name}</div>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-ink-muted">
              {!!supplier?.supplierName && supplier?.companyName && <div className="flex items-center gap-2"><Building2 size={15} />{supplier.supplierName}</div>}
              {!!supplier?.email && <div className="flex items-center gap-2 break-all"><Mail size={15} />{supplier.email}</div>}
              {!!supplier?.phone && <div className="flex items-center gap-2"><Phone size={15} />{supplier.phone}</div>}
            </div>
          </div>
        )}
        items={[
          { to: '/supplier/listings', label: 'My listings', icon: ListChecks },
          { to: '/supplier/all-bookings', label: 'All bookings', icon: CalendarCheck },
          { to: '/supplier/transactions', label: 'Transactions', icon: Wallet },
          { to: '/supplier/notifications', label: 'Notifications', icon: Bell },
          { to: '/supplier/account-manager', label: 'Key account manager', icon: UserCog },
        ]}
        onLogout={() => { logout(); toast.success('Signed out'); navigate('/supplier/login', { replace: true }); }}
      />
    </div>
  );
}
