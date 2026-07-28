import { Link } from 'react-router-dom';
import { Hammer, ArrowLeft } from 'lucide-react';

// Temporary stand-in for a Category Manager module still being built (Phase B).
// Keeps the nav links working end-to-end so the role is testable now.
export default function CategoryModulePlaceholder({ title = 'Module' }) {
  return (
    <div className="max-w-3xl">
      <Link to="/team/category" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-4"><ArrowLeft size={16} /> Category Overview</Link>
      <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
        <div className="inline-flex w-14 h-14 rounded-full bg-brand/10 text-brand items-center justify-center mb-4"><Hammer size={26} /></div>
        <h2 className="font-display font-bold text-lg">{title}</h2>
        <p className="text-sm text-ink-muted mt-1">This Category Manager module is being built. It’ll be scoped to the categories you own.</p>
      </div>
    </div>
  );
}
