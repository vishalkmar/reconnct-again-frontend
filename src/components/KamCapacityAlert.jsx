import { AlertTriangle, X } from 'lucide-react';

/*
  Center popup shown when a supplier can't be onboarded because every Key
  Account Manager is at their supplier cap (or none exist). The backend flags
  this exact case with a 409 + { errors: { code: 'KAM_CAPACITY_FULL' } } — see
  supplier.controller.create. `isCapacityError(err)` below is the single place
  that detects it, so every create form reacts the same way.
*/
export function isCapacityError(err) {
  const res = err?.response;
  return res?.status === 409 && res?.data?.errors?.code === 'KAM_CAPACITY_FULL';
}

export default function KamCapacityAlert({ open, message, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md text-center p-7 relative">
        <button type="button" onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg text-ink-muted hover:bg-surface-alt"><X size={18} /></button>
        <div className="inline-flex w-14 h-14 rounded-full bg-amber-50 text-amber-600 items-center justify-center mb-4">
          <AlertTriangle size={28} />
        </div>
        <h2 className="font-display font-bold text-lg mb-2">Can’t assign an Account Manager</h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          {message || 'All Account Managers are at their supplier limit. Please ask an admin to raise a KAM’s limit or add a new KAM before onboarding this supplier.'}
        </p>
        <button type="button" onClick={onClose}
          className="mt-5 px-6 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105">
          Okay
        </button>
      </div>
    </div>
  );
}
