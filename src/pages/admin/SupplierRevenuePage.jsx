import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SupplierRevenueSplit from '../../components/admin/SupplierRevenueSplit.jsx';

// Standalone page for one supplier's B2B vs B2C revenue split — opened by
// clicking a supplier's B2B/B2C figure on the Suppliers list.
export default function SupplierRevenuePage() {
  const { id } = useParams();
  return (
    <div className="max-w-6xl mx-auto">
      <Link to="/admin/suppliers" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand mb-3">
        <ArrowLeft size={15} /> Suppliers & Contract
      </Link>
      <h1 className="text-2xl font-display font-bold mb-1">Supplier revenue — B2B vs B2C</h1>
      <p className="text-sm text-ink-muted mb-5">Every paid booking on this supplier’s experiences, valued at both the base B2B price and the final B2C price the customer paid.</p>
      <SupplierRevenueSplit supplierId={id} />
    </div>
  );
}
