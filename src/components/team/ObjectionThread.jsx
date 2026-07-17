import { CircleAlert, Reply, GitCompareArrows } from 'lucide-react';

/* Renders a section's objection⇄resolution history as a compact chat:
   COPS objections on the left (rose), submitter replies on the right (indigo). */
export default function ObjectionThread({ thread }) {
  if (!thread || thread.length === 0) return null;
  return (
    <div className="space-y-2">
      {thread.map((m, i) => {
        const isCops = m.role === 'cops';
        return (
          <div key={i} className={`flex ${isCops ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${isCops ? 'bg-rose-50 text-rose-900 rounded-tl-sm' : 'bg-indigo-50 text-indigo-900 rounded-tr-sm'}`}>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide opacity-70 mb-0.5">
                {isCops ? <><CircleAlert size={11} /> Center Ops objection</> : <><Reply size={11} /> Submitter’s fix</>}
                {typeof m.round === 'number' && <span>· round {m.round + 1}</span>}
                {!isCops && m.changed != null && (
                  <span className={`inline-flex items-center gap-0.5 ${m.changed ? 'text-emerald-600' : 'text-amber-600'}`}>
                    <GitCompareArrows size={10} /> {m.changed ? 'changed' : 'not changed'}
                  </span>
                )}
              </div>
              <div className="whitespace-pre-line">{m.text}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
