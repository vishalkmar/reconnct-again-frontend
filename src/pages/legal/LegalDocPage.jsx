import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, ArrowUp, ListOrdered } from 'lucide-react';
import api from '../../services/api';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import { PRIVACY, PRIVACY_EFFECTIVE, TERMS, TERMS_EFFECTIVE } from './legalContent';

/*
  /privacy and /terms on the public site. Admin-written HTML from /site-info
  (privacyPolicy / termsConditions) wins; until it is filled in, the business's
  own copy in legalContent.js is shown (the Play Store listing needs a
  reachable privacy policy URL).
  Every <h2> gets an id so the "On this page" list can jump to it.
*/
const CONF = {
  privacy: {
    field: 'privacyPolicy', title: 'Privacy', accent: 'Policy', icon: ShieldCheck, fallback: PRIVACY, effective: PRIVACY_EFFECTIVE,
    sub: 'How we collect, use, disclose and protect the information you share with us.',
    other: { to: '/terms', label: 'Terms & Conditions' },
  },
  terms: {
    field: 'termsConditions', title: 'Terms &', accent: 'Conditions', icon: FileText, fallback: TERMS, effective: TERMS_EFFECTIVE,
    sub: 'The agreement that applies when you browse, book or use our services.',
    other: { to: '/privacy', label: 'Privacy Policy' },
  },
};

const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/:\s*$/, '').trim();

export default function LegalDocPage({ type = 'privacy' }) {
  const conf = CONF[type] || CONF.privacy;
  const Icon = conf.icon;
  const [raw, setRaw] = useState('');
  const [active, setActive] = useState('');
  useDocumentMeta({ title: `${conf.title} ${conf.accent} · Reconnct`, description: `${conf.title} ${conf.accent} — ${conf.sub}` });

  useEffect(() => {
    let alive = true;
    setRaw('');
    api.get('/site-info')
      .then((res) => {
        const content = String(res.data?.data?.siteInfo?.[conf.field] || '').trim();
        if (alive) setRaw(content || conf.fallback);
      })
      .catch(() => { if (alive) setRaw(conf.fallback); });
    return () => { alive = false; };
  }, [conf]);

  // Sanitize, then number the sections for the side index.
  const { html, toc } = useMemo(() => {
    const list = [];
    const out = sanitizeHtml(raw).replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner) => {
      const id = `sec-${list.length + 1}`;
      list.push({ id, label: stripTags(inner) });
      return `<h2 id="${id}">${inner}</h2>`;
    });
    return { html: out, toc: list };
  }, [raw]);

  // Highlight the section currently in view.
  useEffect(() => {
    if (!toc.length) return undefined;
    const els = toc.map((t) => document.getElementById(t.id)).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit) setActive(hit.target.id);
    }, { rootMargin: '-110px 0px -65% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [toc]);

  const jump = (id) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
  };

  return (
    <div className="relative isolate overflow-hidden bg-[#FBFAF8]">
      <div className="absolute inset-x-0 top-0 h-[520px] -z-10 bg-gradient-to-b from-[#FFF8EC] via-[#FFFCF7] to-[#FBFAF8]" aria-hidden="true" />
      <div className="absolute -top-24 right-0 w-[60%] h-[480px] -z-10 opacity-60 bg-[conic-gradient(from_200deg_at_85%_0%,transparent_0deg,#FFE7B0_18deg,transparent_36deg,#FFF0CC_58deg,transparent_80deg)] blur-2xl" aria-hidden="true" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-12 sm:pb-16">
        {/* Heading */}
        <div className="flex items-center gap-2.5 text-[11px] sm:text-[13px] font-bold tracking-[0.24em] uppercase text-rc-navy/85">
          <Icon size={16} className="text-rc-brand" /> Legal
        </div>
        <h1 className="font-display font-bold text-[34px] sm:text-[46px] lg:text-[54px] leading-[1.05] mt-2.5 text-rc-navy">
          {conf.title} <span className="text-rc-brand">{conf.accent}</span>
        </h1>
        <p className="text-[14px] sm:text-[17px] text-rc-navy/80 mt-2 sm:mt-3">{conf.sub}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center min-h-8 py-1.5 px-3.5 rounded-2xl sm:rounded-full leading-snug bg-white border border-[#F1ECE3] text-[12.5px] text-rc-navy/80 shadow-[0_4px_14px_-10px_rgba(16,24,40,0.3)]">{conf.effective}</span>
          <Link to={conf.other.to} className="inline-flex items-center h-8 px-3.5 rounded-full bg-[#FFF1CC] text-[#9A6400] text-[12.5px] font-bold hover:bg-[#FFE7A8] transition">Read {conf.other.label} →</Link>
        </div>

        <div className="mt-7 sm:mt-9 grid lg:grid-cols-[260px_1fr] gap-6 lg:gap-8 items-start">
          {/* On this page */}
          <nav aria-label="On this page" className="hidden lg:block sticky top-28 bg-white/85 backdrop-blur rounded-[22px] border border-[#F1ECE3] shadow-[0_10px_30px_-22px_rgba(16,24,40,0.45)] p-4 max-h-[calc(100vh-140px)] overflow-y-auto">
            <p className="flex items-center gap-2 px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-rc-navy/70"><ListOrdered size={14} className="text-rc-brand" />On this page</p>
            <ul className="space-y-0.5">
              {toc.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => jump(t.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-[13px] leading-snug transition ${active === t.id ? 'bg-[#FFF1CC] text-rc-navy font-bold' : 'text-rc-navy/75 hover:bg-[#FBF6EC]'}`}
                  >
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Document */}
          <article className="min-w-0 bg-white rounded-[26px] border border-[#F1ECE3] shadow-[0_24px_60px_-34px_rgba(16,24,40,0.45)] p-6 sm:p-10 text-[15px] leading-[1.75] text-rc-ink
            [&_.lead]:text-[16px] [&_.lead]:text-rc-navy
            [&_h2]:font-display [&_h2]:font-bold [&_h2]:text-[22px] sm:[&_h2]:text-[24px] [&_h2]:text-rc-navy [&_h2]:mt-9 [&_h2]:mb-3 [&_h2]:pt-6 [&_h2]:border-t [&_h2]:border-[#F3ECDF] [&_h2]:scroll-mt-28
            [&_h3]:font-sans [&_h3]:font-bold [&_h3]:text-[15px] [&_h3]:text-rc-navy [&_h3]:mt-4 [&_h3]:mb-1.5
            [&_ul]:my-3 [&_ul]:space-y-2 [&_li]:relative [&_li]:pl-6 [&_li]:before:content-[''] [&_li]:before:absolute [&_li]:before:left-1 [&_li]:before:top-[11px] [&_li]:before:w-2 [&_li]:before:h-2 [&_li]:before:rounded-full [&_li]:before:bg-rc-brand
            [&_li_b]:text-rc-navy [&_p]:mb-3 [&_a]:text-[#9A6400] [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2
            [&_.effective]:mt-8 [&_.effective]:rounded-2xl [&_.effective]:bg-[#FFF8E8] [&_.effective]:border [&_.effective]:border-[#F6E3B5] [&_.effective]:px-5 [&_.effective]:py-3.5 [&_.effective]:text-[13.5px] [&_.effective]:text-rc-navy/80"
          >
            {html
              ? <div dangerouslySetInnerHTML={{ __html: html }} />
              : <div className="space-y-3">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="rc-skeleton h-4 rounded" />)}</div>}
          </article>
        </div>

        <div className="text-center mt-8">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-white border border-[#F1ECE3] text-rc-navy text-sm font-bold shadow-[0_6px_18px_-12px_rgba(16,24,40,0.35)] hover:bg-[#FFF1CC] transition">
            <ArrowUp size={16} /> Back to top
          </button>
        </div>
      </div>
    </div>
  );
}
