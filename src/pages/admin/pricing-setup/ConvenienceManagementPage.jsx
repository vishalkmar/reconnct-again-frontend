import { Sparkles } from 'lucide-react';
import PricingSetupShell, { ComingSoon } from './PricingSetupShell.jsx';

export default function ConvenienceManagementPage() {
  return (
    <PricingSetupShell
      title="Convenience Management"
      subtitle="Convenience fee charged on top of the payable amount — free, flat or percentage, with an optional cut-through amount."
    >
      <ComingSoon
        icon={Sparkles}
        note="Convenience fee rules will be managed here. Tell me what this module should hold and I'll build it."
      />
    </PricingSetupShell>
  );
}
