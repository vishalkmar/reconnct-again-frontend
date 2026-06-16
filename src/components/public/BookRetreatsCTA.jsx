import { Link } from 'react-router-dom';
import { ArrowRight, Compass, Sparkles } from 'lucide-react';

export default function BookRetreatsCTA() {
  return (
    <section className="container-app py-12 md:py-16">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0f766e] via-brand to-[#0f172a] text-white p-1.5 shadow-2xl">
        <div className="absolute inset-0 rounded-[2rem] pointer-events-none ring-1 ring-white/20" />

        <div className="relative rounded-[1.75rem] p-8 md:p-14 grid md:grid-cols-5 gap-8 items-center">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:36px_36px] opacity-60" />

          <div className="md:col-span-3 relative z-10">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] font-bold bg-white/15 px-3 py-1.5 rounded-full mb-4 text-white">
              <Sparkles size={12} /> Find your retreat
            </div>
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-display font-black leading-tight text-white">
              Ready to unplug and recharge?
            </h3>
            <p className="mt-3 text-white/90 text-base md:text-lg max-w-xl">
              Browse hand-picked yoga, ayurveda and wellness retreats. Choose the stay that feels
              right, and step into a calmer version of your next trip.
            </p>
          </div>

          <div className="md:col-span-2 relative z-10 flex md:justify-end">
            <Link
              to="/retreats"
              className="group inline-flex items-center gap-3 bg-white text-brand font-black px-6 py-4 rounded-full shadow-lg hover:bg-[#f0fdf9] transition w-full md:w-auto justify-center"
            >
              <Compass size={18} />
              Book your retreat
              <span className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center transition group-hover:translate-x-0.5">
                <ArrowRight size={14} />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
