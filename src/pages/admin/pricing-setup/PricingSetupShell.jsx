import { NavLink } from 'react-router-dom';
import { TrendingUp, Tag, Percent, Sparkles } from 'lucide-react';

// The four modules that live under "Pricing Setup Management". They mirror the
// four extras the go-live pricing modal applies on top of the B2B base price.
export const PRICING_TABS = [
  { to: '/admin/pricing-setup/markup', label: 'Markup Management', icon: TrendingUp },
  { to: '/admin/pricing-setup/discount', label: 'Discount Management', icon: Tag },
  { to: '/admin/pricing-setup/gst', label: 'GST & Taxes Management', icon: Percent },
  { to: '/admin/pricing-setup/convenience', label: 'Convenience Management', icon: Sparkles },
];

/**
 * Common chrome for every Pricing Setup module: page title, the tab strip and a
 * white card that the module renders its own content into.
 */
export default function PricingSetupShell({ title, subtitle, children }) {
  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1">{title}</h1>
        <p className="text-sm text-ink-muted">{subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {PRICING_TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
                isActive
                  ? 'bg-brand text-ink border-brand shadow-soft'
                  : 'bg-white border-gray-200 text-ink-muted hover:text-brand'
              }`
            }
          >
            <t.icon size={15} /> {t.label}
          </NavLink>
        ))}
      </div>

      {children}
    </div>
  );
}

/** Placeholder card used until each module's own screens are decided. */
export function ComingSoon({ icon: Icon, note }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-10 text-center">
      <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center mx-auto mb-4">
        <Icon size={22} />
      </div>
      <p className="text-sm text-ink-muted max-w-md mx-auto">{note}</p>
    </div>
  );
}
