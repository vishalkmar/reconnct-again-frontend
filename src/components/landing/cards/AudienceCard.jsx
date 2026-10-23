import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { audienceMeta, svgUri } from '../../../constants/audienceMeta';

/*
  "Connect With" audience card — tinted rounded square with the app's exact
  SVG icon, name and tagline. `size="lg"` is the bigger card on /connect.
*/
export default function AudienceCard({ aud, size = 'sm' }) {
  const meta = audienceMeta(aud.slug);
  const src = svgUri(meta.svg);
  const href = `/experiences?audienceIds=${aud.id}`;

  if (size === 'lg') {
    return (
      <Link to={href} className="group flex items-center gap-4 bg-white rounded-2xl p-4 shadow-soft hover:shadow-card transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rc-brand">
        <span className="grid place-items-center w-20 h-20 rounded-[18px] shrink-0 group-hover:scale-105 transition" style={{ background: meta.tint }}>
          {src ? <img src={src} alt="" className="w-11 h-11" /> : <Users size={32} className="text-rc-brand-text" />}
        </span>
        <span className="min-w-0">
          <span className="block font-sans text-base font-extrabold text-rc-ink">{aud.name}</span>
          <span className="block text-sm text-rc-ink-muted mt-0.5">{meta.tagline}</span>
        </span>
      </Link>
    );
  }

  return (
    <Link to={href} className="group block w-[88px] text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-rc-brand rounded-[18px]">
      <span className="grid place-items-center w-[88px] h-[88px] rounded-[18px] group-hover:-translate-y-0.5 group-hover:shadow-soft transition" style={{ background: meta.tint }}>
        {src ? <img src={src} alt="" className="w-10 h-10" /> : <Users size={32} className="text-rc-brand-text" />}
      </span>
      <span className="block text-[13px] font-extrabold text-rc-ink mt-2 truncate">{aud.name}</span>
      <span className="block text-[11px] leading-[14px] text-[#555b67] mt-0.5 line-clamp-2">{meta.tagline}</span>
    </Link>
  );
}
