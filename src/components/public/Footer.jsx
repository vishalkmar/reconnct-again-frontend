import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Facebook, Instagram, Twitter, Youtube, Linkedin, Globe,
  Mail, Phone, MapPin, Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';

const SOCIAL_ICONS = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  website: Globe,
};

const FALLBACK = {
  companyName: 'Retreats by Traveon',
  tagline: '',
  description:
    'Curated wellness, yoga and travel retreats — designed to transform how you travel and how you feel.',
  logoUrl: '/retreatlogo.png',
  emails: [],
  phones: [],
  addresses: [],
  socials: [],
};

export default function Footer() {
  const [info, setInfo] = useState(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    api.get('/site-info')
      .then((res) => {
        if (cancelled) return;
        const remote = res.data?.data?.siteInfo || {};
        // Merge remote on top of fallback so missing keys keep sane defaults
        setInfo({
          ...FALLBACK,
          ...remote,
          // For arrays, prefer remote only if non-empty
          emails: remote.emails?.length ? remote.emails : FALLBACK.emails,
          phones: remote.phones?.length ? remote.phones : FALLBACK.phones,
          addresses: remote.addresses?.length ? remote.addresses : FALLBACK.addresses,
          socials: remote.socials?.length ? remote.socials : FALLBACK.socials,
          logoUrl: remote.logoUrl || FALLBACK.logoUrl,
          description: remote.description || FALLBACK.description,
          companyName: remote.companyName || FALLBACK.companyName,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const logoSrc = info.logoUrl
    ? (info.logoUrl.startsWith('/uploads/') || /^https?:\/\//.test(info.logoUrl) ? fileUrl(info.logoUrl) : info.logoUrl)
    : '/retreatlogo.png';

  return (
    <footer className="bg-ink text-white mt-20">
      <div className="container-app py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div>
          <div className="mb-4">
            <img
              src={logoSrc}
              alt={info.companyName}
              className="h-12 w-auto object-contain bg-white/95 rounded-lg px-2 py-1"
            />
          </div>
          {info.tagline && (
            <p className="text-sm font-semibold text-white/90">{info.tagline}</p>
          )}
          {info.description && (
            <p className="text-sm text-white/70 leading-relaxed mt-2">
              {info.description}
            </p>
          )}
          {info.socials.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-5">
              {info.socials.map((s, i) => {
                const Icon = SOCIAL_ICONS[s.platform] || Globe;
                return (
                  <a
                    key={`${s.platform}-${i}`}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.platform}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-brand flex items-center justify-center transition"
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h4 className="font-display font-semibold mb-4 text-white">Explore</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link to="/hotels" className="hover:text-brand-light">Hotels</Link></li>
            <li><Link to="/retreats" className="hover:text-brand-light">Packages</Link></li>
            <li><Link to="/events" className="hover:text-brand-light">Events</Link></li>
            <li><Link to="/events-activities" className="hover:text-brand-light">Activities</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display font-semibold mb-4">Company</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link to="/blogs" className="hover:text-brand-light">Blogs</Link></li>
            <li><Link to="/privacy" className="hover:text-brand-light">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-brand-light">Terms &amp; Conditions</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display font-semibold mb-4">Get in touch</h4>
          <ul className="space-y-3 text-sm text-white/70">
            {info.emails.map((e, i) => (
              <li key={`e-${i}`} className="flex items-start gap-2 break-all">
                <Mail size={16} className="mt-0.5 shrink-0" />
                <a href={`mailto:${e}`} className="hover:text-brand-light">{e}</a>
              </li>
            ))}
            {info.phones.map((p, i) => (
              <li key={`p-${i}`} className="flex items-start gap-2">
                <Phone size={16} className="mt-0.5 shrink-0" />
                <a href={`tel:${p.replace(/\s+/g, '')}`} className="hover:text-brand-light">{p}</a>
              </li>
            ))}
            {info.addresses.map((a, i) => (
              <li key={`a-${i}`} className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                <span>{a}</span>
              </li>
            ))}
            {info.emails.length === 0 && info.phones.length === 0 && info.addresses.length === 0 && (
              <li className="text-white/50 text-xs italic">
                Add contact details from Admin → Site Details.
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Contact form */}
      <div className="border-t border-white/10">
        <div className="container-app py-12 grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <h3 className="text-2xl font-display font-bold">Get in touch</h3>
            <p className="text-white/70 mt-2 max-w-md leading-relaxed">
              Have a question about a stay, package or event? Drop us a message and our
              wellness team will get back to you shortly.
            </p>
          </div>
          <ContactForm />
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-app py-5 flex flex-col md:flex-row items-center justify-between text-xs text-white/60 gap-2">
          <span>© {new Date().getFullYear()} {info.companyName}. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-brand-light">Privacy</Link>
            <Link to="/terms" className="hover:text-brand-light">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', query: '' });
  const [sending, setSending] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.query.trim()) {
      toast.error('Please fill name, email and message');
      return;
    }
    setSending(true);
    try {
      const res = await api.post('/contact', form);
      toast.success(res.data?.message || 'Message sent — we’ll be in touch!');
      setForm({ name: '', email: '', phone: '', query: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send your message');
    } finally {
      setSending(false);
    }
  };

  const inputCls = 'w-full rounded-lg bg-white/10 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand';

  return (
    <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
      <input className={inputCls} placeholder="Your name *" value={form.name} onChange={(e) => set('name', e.target.value)} />
      <input className={inputCls} type="email" placeholder="Email *" value={form.email} onChange={(e) => set('email', e.target.value)} />
      <input className={`${inputCls} sm:col-span-2`} placeholder="Phone (optional)" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
      <textarea className={`${inputCls} sm:col-span-2`} rows={3} placeholder="Your message *" value={form.query} onChange={(e) => set('query', e.target.value)} />
      <button
        type="submit"
        disabled={sending}
        className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-brand hover:brightness-110 text-white font-semibold py-2.5 transition disabled:opacity-60"
      >
        <Send size={16} /> {sending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
