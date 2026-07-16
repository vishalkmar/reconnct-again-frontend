import { Link } from 'react-router-dom';
import { Truck, Sparkles, ClipboardCheck, Users, HeartHandshake, ArrowRight } from 'lucide-react';
import { useTeamAuth } from '../../context/TeamAuthContext.jsx';

const ROLE_LABEL = {
  bd: 'Business Developer',
  cops: 'Center Operations',
  account_manager: 'Account Manager',
  csm: 'Customer Success Manager',
  qcops: 'Quality Check Operations',
  marketing_manager: 'Marketing Manager',
};

export default function TeamDashboardPage() {
  const { member } = useTeamAuth();
  const perms = member?.permissions || {};
  const firstName = (member?.name || '').split(' ')[0];

  const cards = [
    {
      to: '/team/suppliers', show: !!perms.canCreateSupplier, icon: Truck,
      title: 'My Suppliers', desc: 'Onboard a new partner / vendor.',
    },
    {
      to: '/team/experiences', show: !!perms.canAddExperience, icon: Sparkles,
      title: 'My Experiences', desc: 'Add a new listing — goes to Center Ops for review before it goes live.',
    },
    {
      to: '/team/review-queue', show: !!perms.canReviewListings, icon: ClipboardCheck,
      title: 'Review Queue', desc: 'Approve, reject, or request changes on submitted listings.',
    },
    {
      to: '/team/my-suppliers', show: !!perms.canManageAccounts, icon: Users,
      title: 'Assigned Suppliers', desc: 'Suppliers auto-assigned to you to guide and monitor.',
    },
    {
      to: '/team/my-customers', show: !!perms.canManageCustomers, icon: HeartHandshake,
      title: 'My Customers', desc: 'Customers auto-assigned to you after a failed payment or cancellation.',
    },
  ].filter((c) => c.show);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1">Welcome back, {firstName} 👋</h1>
        <p className="text-sm text-ink-muted">
          {ROLE_LABEL[member?.roleType] || member?.roleType} · <span className="font-mono">{member?.employeeCode}</span>
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-10 text-center text-ink-muted">
          No features have been enabled on your account yet — check with your admin.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {cards.map((c) => (
            <Link key={c.to} to={c.to}
              className="group bg-white rounded-2xl shadow-soft p-6 hover:shadow-lg transition flex flex-col">
              <div className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-4">
                <c.icon size={22} />
              </div>
              <h2 className="font-display font-bold text-lg mb-1">{c.title}</h2>
              <p className="text-sm text-ink-muted flex-1">{c.desc}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark group-hover:gap-2.5 transition-all">
                Open <ArrowRight size={15} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
