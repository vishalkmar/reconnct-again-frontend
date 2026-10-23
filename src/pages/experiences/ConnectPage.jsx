import { Link2 } from 'lucide-react';
import { useTaxonomy } from '../../hooks/usePublicApi';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import AudienceCard from '../../components/landing/cards/AudienceCard.jsx';

/*
  /connect — the app's "Reconnect" tab: every audience as a big card; each one
  opens /experiences filtered to that audience.
*/
export default function ConnectPage() {
  const { audiences } = useTaxonomy();
  useDocumentMeta({
    title: 'Reconnect · Reconnct',
    description: 'Who do you want to reconnect with? Experiences for friends, family, your partner, kids and yourself.',
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center gap-2 text-rc-brand-dark text-xs font-bold tracking-[0.2em] uppercase">
        <Link2 size={14} />Reconnect
      </div>
      <h1 className="font-sans text-2xl sm:text-4xl font-black text-rc-navy mt-2">Who do you want to reconnect with?</h1>
      <p className="text-rc-ink-muted mt-2 max-w-xl">Pick a person — we’ll show experiences made for the two of you (or the whole gang).</p>

      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {audiences.length
          ? audiences.map((a) => <AudienceCard key={a.id} aud={a} size="lg" />)
          : Array.from({ length: 6 }).map((_, i) => <div key={i} className="rc-skeleton h-28 rounded-2xl" />)}
      </div>
    </div>
  );
}
