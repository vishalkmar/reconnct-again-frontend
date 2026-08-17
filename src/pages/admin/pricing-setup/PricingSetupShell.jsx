/**
 * Common chrome for every Pricing Setup module — just the page heading.
 *
 * Deliberately NO cross-module tab strip: each module (Markup / Discount /
 * GST & Taxes / Convenience) is self-contained and shows only its own tools.
 * Switching between them is the sidebar's job (Pricing Setup Management → …).
 */
export default function PricingSetupShell({ title, subtitle, children }) {
  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1">{title}</h1>
        <p className="text-sm text-ink-muted">{subtitle}</p>
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
