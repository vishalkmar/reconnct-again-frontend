import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Smartphone, Download, ShieldCheck, WifiOff, Zap, ChevronDown, CheckCircle2, Globe,
} from 'lucide-react';
import { usePwa } from '../../context/PwaContext.jsx';
import { PlayStoreButton, track } from '../../components/pwa/InstallApp.jsx';
import { PLAY_STORE_URL } from '../../config/appLinks';
import useDocumentMeta from '../../hooks/useDocumentMeta';

/*
  /download — the Reconnct app is ANDROID-ONLY:
    Android phone → Google Play listing (APK only as a fallback, if published)
    Desktop       → Google Play button + QR code of the Play listing
    iPhone        → no app; a short note and a way back to the website
  APK info comes from /downloads/version.json, written when a new APK is built
  (docs/web-pwa/playstore.md §6).
*/
const APK_URL = '/downloads/reconnct.apk';

function useApkInfo() {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    fetch('/downloads/version.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setInfo(j && j.available ? j : { available: false }))
      .catch(() => setInfo({ available: false }));
  }, []);
  return info;
}

function QrCode({ text, size = 200 }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let alive = true;
    import('qrcode-generator').then(({ default: qrcode }) => {
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      if (alive) setSvg(qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }));
    }).catch(() => {});
    return () => { alive = false; };
  }, [text]);
  return (
    <div
      className="bg-white p-3 rounded-2xl shadow-soft [&_svg]:w-full [&_svg]:h-full"
      style={{ width: size, height: size }}
      role="img"
      aria-label="QR code to open the download page on your Android phone"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function DownloadPage() {
  const { isAndroid, isIOS, isPwa } = usePwa();
  const apk = useApkInfo();
  useDocumentMeta({ title: 'Reconnct for Android · Reconnct', description: 'Get the Reconnct app on your Android phone.' });


  if (isIOS) {
    return (
      <div className="max-w-xl mx-auto px-5 py-16 text-center">
        <span className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-rc-brand-soft text-rc-brand-text"><Smartphone size={30} /></span>
        <h1 className="font-sans text-2xl sm:text-3xl font-black text-rc-navy mt-5">The Reconnct app is for Android</h1>
        <p className="text-rc-ink-muted mt-2">On iPhone, everything works right here on the website — browse, book and manage your experiences.</p>
        <Link to="/" className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-rc-brand text-rc-navy font-bold"><Globe size={18} />Continue on the website</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="grid md:grid-cols-[1.2fr_1fr] gap-8 items-center">
        <div>
          <p className="text-rc-brand-dark text-xs font-bold tracking-[0.2em] uppercase">Reconnct for Android</p>
          <h1 className="font-sans text-3xl sm:text-5xl font-black text-rc-navy mt-2 leading-tight">Your next experience, one tap away</h1>
          <p className="text-rc-ink-muted mt-3 max-w-lg">Same account, same bookings — on your Android phone’s home screen.</p>
          <ul className="mt-5 grid sm:grid-cols-3 gap-3 text-sm">
            <li className="flex items-center gap-2"><Zap size={16} className="text-rc-brand-dark" />Opens instantly</li>
            <li className="flex items-center gap-2"><WifiOff size={16} className="text-rc-brand-dark" />Works offline</li>
            <li className="flex items-center gap-2"><ShieldCheck size={16} className="text-rc-brand-dark" />Secure checkout</li>
          </ul>
        </div>

        {/* Desktop: hand off to an Android phone */}
        {!isAndroid && (
          <div className="flex flex-col items-center gap-3">
            <QrCode text={PLAY_STORE_URL} />
            <p className="text-sm text-rc-ink-muted text-center max-w-[240px]">Scan with your Android phone’s camera to open Google Play</p>
            <PlayStoreButton source="download_desktop" />
          </div>
        )}
      </div>

      {isPwa && (
        <div className="mt-8 flex items-center gap-3 bg-green-50 text-green-800 rounded-2xl p-4">
          <CheckCircle2 size={20} /> You’re already using the Reconnct app.
        </div>
      )}

      {isAndroid && !isPwa && (
        <section className="mt-10 max-w-xl bg-white rounded-3xl p-6 shadow-soft ring-2 ring-rc-brand">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-12 h-12 rounded-2xl bg-rc-brand-soft text-rc-brand-text"><Smartphone size={22} /></span>
            <div>
              <h2 className="font-sans text-lg font-black text-rc-navy">Get it on this phone</h2>
              {apk?.available && apk.versionName && <div className="text-xs text-rc-ink-muted">Version {apk.versionName}{apk.sizeMB ? ` · ${apk.sizeMB} MB` : ''}</div>}
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            <PlayStoreButton source="download_android" className="justify-center" />
            {apk?.available && (
              <a
                href={APK_URL}
                download="reconnct.apk"
                onClick={() => track('apk_download_click')}
                className="flex items-center justify-center gap-2 h-12 rounded-full bg-rc-navy text-white font-bold"
              >
                <Download size={17} /> Download APK
              </a>
            )}
          </div>
          {apk?.available && (
            <details className="mt-4 text-sm text-rc-ink-muted group">
              <summary className="cursor-pointer list-none flex items-center gap-1 font-semibold">
                Installing the APK? <ChevronDown size={14} className="group-open:rotate-180 transition" />
              </summary>
              <ol className="mt-2 space-y-1 list-decimal pl-5">
                <li>Open the downloaded <b>reconnct.apk</b>.</li>
                <li>If asked, allow <b>Install unknown apps</b> for your browser (Settings → Apps → Chrome → Install unknown apps).</li>
                <li>Tap <b>Install</b>, then open Reconnct.</li>
              </ol>
            </details>
          )}
        </section>
      )}

      {!isAndroid && (
        <p className="mt-10 text-sm text-rc-ink-muted">
          The app is available for Android phones. On a computer or iPhone, keep using the website — it has everything the app has.
        </p>
      )}
    </div>
  );
}
