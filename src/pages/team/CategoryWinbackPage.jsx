import { Link } from 'react-router-dom';
import { ArrowLeft, HeartHandshake, Mail, Gift, RefreshCw } from 'lucide-react';

/*
  Win-Back — the stage AFTER churn: reach out to providers who dropped off and
  bring them back. The engine (who to target, the offer, the sequence) is a
  later phase; for now this lays out the cards so the module exists and its
  place in the flow is clear.
*/
const CARDS = [
  { icon: Mail, title: 'Re-engagement outreach', sub: 'Auto-email churned providers with a “we miss you” nudge.', tag: 'Coming soon' },
  { icon: Gift, title: 'Comeback incentives', sub: 'Offer a boosted placement or fee waiver to relist.', tag: 'Coming soon' },
  { icon: RefreshCw, title: 'One-tap relist', sub: 'Bring a delisted listing back with its old details intact.', tag: 'Coming soon' },
];

export default function CategoryWinbackPage() {
  return (
    <div className="max-w-4xl">
      <Link to="/team/category" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-3"><ArrowLeft size={16} /> Category Overview</Link>
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-2xl font-display font-bold">Win-Back</h1>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Coming soon</span>
      </div>
      <p className="text-sm text-ink-muted mb-5">Bring churned providers back to your categories. The cards below map out what’s coming — the engine gets wired next.</p>

      <div className="grid sm:grid-cols-3 gap-3">
        {CARDS.map((c) => (
          <div key={c.title} className="bg-white rounded-2xl shadow-soft p-5">
            <span className="inline-flex w-11 h-11 rounded-xl bg-brand/10 text-brand-dark items-center justify-center mb-3"><c.icon size={22} /></span>
            <div className="font-semibold text-ink">{c.title}</div>
            <div className="text-xs text-ink-muted mt-1">{c.sub}</div>
            <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 mt-3">{c.tag}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 bg-white rounded-2xl shadow-soft p-5 flex items-center gap-3">
        <span className="inline-flex w-10 h-10 rounded-xl bg-rose-50 text-rose-500 items-center justify-center shrink-0"><HeartHandshake size={20} /></span>
        <div>
          <div className="font-semibold text-ink text-sm">Feeds off Churn</div>
          <div className="text-xs text-ink-muted">Win-Back will target the providers listed under <Link to="/team/category/churn" className="text-brand-dark hover:underline">Churn</Link> once the outreach engine is live.</div>
        </div>
      </div>
    </div>
  );
}
