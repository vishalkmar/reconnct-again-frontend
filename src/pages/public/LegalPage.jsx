import { useEffect, useState } from 'react';
import { ShieldCheck, FileText } from 'lucide-react';
import api from '../../services/api';

// Renders an admin-editable legal page (Privacy Policy / Terms & Conditions).
// Content comes from /site-info (privacyPolicy / termsConditions HTML).
const CONF = {
  privacy: {
    field: 'privacyPolicy',
    title: 'Privacy Policy',
    icon: ShieldCheck,
    fallback:
      '<p>We respect your privacy. This Privacy Policy explains how we collect, use and protect your information when you use our website and services.</p><p>The full policy is being finalised — please contact us for any questions in the meantime.</p>',
  },
  terms: {
    field: 'termsConditions',
    title: 'Terms & Conditions',
    icon: FileText,
    fallback:
      '<p>By using this website and booking through us, you agree to these Terms &amp; Conditions.</p><p>The full terms are being finalised — please contact us for any questions in the meantime.</p>',
  },
};

export default function LegalPage({ type }) {
  const conf = CONF[type] || CONF.privacy;
  const Icon = conf.icon;
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('/site-info')
      .then((res) => {
        if (cancelled) return;
        const info = res.data?.data?.siteInfo || {};
        const content = (info[conf.field] || '').trim();
        setHtml(content || conf.fallback);
        setCompany(info.companyName || '');
      })
      .catch(() => { if (!cancelled) setHtml(conf.fallback); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="bg-gradient-to-br from-brand to-wellness text-white">
        <div className="container-app py-12 md:py-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-xs font-semibold mb-3">
            <Icon size={14} /> Legal
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold drop-shadow">{conf.title}</h1>
          {company && <p className="mt-2 opacity-90">{company}</p>}
        </div>
      </div>

      <div className="container-app py-10 md:py-14">
        <div className="max-w-3xl mx-auto card p-6 md:p-10">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${70 + (i % 4) * 8}%` }} />
              ))}
            </div>
          ) : (
            <div className="rich-prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
      </div>
    </>
  );
}
