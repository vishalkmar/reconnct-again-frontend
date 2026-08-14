import { Percent } from 'lucide-react';
import PricingSetupShell, { ComingSoon } from './PricingSetupShell.jsx';

export default function GstTaxesManagementPage() {
  return (
    <PricingSetupShell
      title="GST & Taxes Management"
      subtitle="GST slabs and any other tax applied on the net taxable amount at go-live."
    >
      <ComingSoon
        icon={Percent}
        note="GST slabs and tax rules will be managed here. Tell me what this module should hold and I'll build it."
      />
    </PricingSetupShell>
  );
}
