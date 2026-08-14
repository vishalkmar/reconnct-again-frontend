import { Tag } from 'lucide-react';
import PricingSetupShell, { ComingSoon } from './PricingSetupShell.jsx';

export default function DiscountManagementPage() {
  return (
    <PricingSetupShell
      title="Discount Management"
      subtitle="Discounts are always applied on the base price, before GST."
    >
      <ComingSoon
        icon={Tag}
        note="Discount rules will be managed here. Tell me what this module should hold and I'll build it."
      />
    </PricingSetupShell>
  );
}
