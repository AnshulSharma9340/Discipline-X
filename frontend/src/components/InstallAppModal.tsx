import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Smartphone, X, Apple, ShieldCheck } from 'lucide-react';

// Hosted on Supabase Storage (public bucket). To update: upload a new APK to the
// "app-builds" bucket in Supabase, keep the same filename, and bump APK_VERSION.
const APK_URL =
  'https://rxkruvazetfyzctgqlpw.supabase.co/storage/v1/object/public/app-builds/DisciplineX.apk';
const APK_VERSION = '1.0.0';
const APK_SIZE_MB = '4.7 MB';
const SEEN_KEY = 'dx-install-prompt-seen';

type Platform = 'android' | 'ios' | 'desktop';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  return 'desktop';
}

export function shouldAutoShowInstall(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SEEN_KEY) !== '1';
}

export function markInstallSeen() {
  window.localStorage.setItem(SEEN_KEY, '1');
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function InstallAppModal({ open, onClose }: Props) {
  const [platform, setPlatform] = useState<Platform>('desktop');

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const apkAbsoluteUrl = useMemo(() => {
    if (typeof window === 'undefined') return APK_URL;
    return new URL(APK_URL, window.location.origin).toString();
  }, []);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=12&bgcolor=ffffff&color=000000&data=${encodeURIComponent(apkAbsoluteUrl)}`;

  function handleClose() {
    markInstallSeen();
    onClose();
  }

  function handleDownload() {
    markInstallSeen();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70 backdrop-blur-md"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-neutral-950 to-black shadow-2xl"
          >
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-neon-violet/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-neon-cyan/15 blur-3xl pointer-events-none" />

            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 w-9 h-9 grid place-items-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative p-7 md:p-9">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] uppercase tracking-[0.18em] text-white/60 mb-5">
                <Smartphone className="w-3 h-3" /> Mobile app
              </div>

              <h2 className="font-display font-semibold text-3xl md:text-4xl tracking-[-0.02em] leading-tight">
                Take DisciplineX
                <br />
                <span className="text-white/60 italic font-light">with you.</span>
              </h2>
              <p className="text-white/55 mt-3 text-sm leading-relaxed">
                Native Android app. Same features, instant launches, push notifications when your
                streak is on the line.
              </p>

              <div className="mt-7">
                {platform === 'android' && <AndroidInstall onDownload={handleDownload} />}
                {platform === 'ios' && <IOSComingSoon />}
                {platform === 'desktop' && <DesktopQR qrUrl={qrUrl} apkUrl={apkAbsoluteUrl} onDownload={handleDownload} />}
              </div>

              <div className="mt-7 flex items-center gap-2 text-[11px] text-white/35">
                <ShieldCheck className="w-3.5 h-3.5" /> Direct download from our site. v{APK_VERSION} · {APK_SIZE_MB}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AndroidInstall({ onDownload }: { onDownload: () => void }) {
  return (
    <div className="space-y-4">
      <a
        href={APK_URL}
        download
        onClick={onDownload}
        className="group w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-white text-black font-medium hover:bg-white/90 transition active:scale-[0.99]"
      >
        <Download className="w-5 h-5" />
        <span>Install on this Android</span>
      </a>
      <details className="text-xs text-white/55 group">
        <summary className="cursor-pointer hover:text-white/80 transition list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform">›</span>
          First-time install instructions
        </summary>
        <ol className="mt-3 pl-5 space-y-1.5 list-decimal marker:text-white/30">
          <li>Tap the button — your phone downloads <code className="px-1 bg-white/5 rounded">DisciplineX.apk</code>.</li>
          <li>Open the file from notifications or your Downloads folder.</li>
          <li>Android may ask permission to install from your browser — tap <em>Allow</em>.</li>
          <li>Tap <em>Install</em>. Done.</li>
        </ol>
      </details>
    </div>
  );
}

function IOSComingSoon() {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 grid place-items-center shrink-0">
          <Apple className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="font-display font-medium">iOS coming soon</div>
          <p className="text-sm text-white/55 mt-1 leading-relaxed">
            We're working on the iPhone build. In the meantime, the web app works great in Safari —
            add it to your home screen for app-like access.
          </p>
        </div>
      </div>
    </div>
  );
}

function DesktopQR({ qrUrl, apkUrl, onDownload }: { qrUrl: string; apkUrl: string; onDownload: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(apkUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="grid sm:grid-cols-[auto_1fr] gap-5 items-center">
      <div className="rounded-2xl bg-white p-3 shadow-lg shadow-black/40 mx-auto sm:mx-0">
        <img src={qrUrl} alt="Scan to download Android APK" className="w-[180px] h-[180px] block" />
      </div>
      <div className="space-y-3 text-sm">
        <div className="font-display font-medium text-base">Scan with your Android phone</div>
        <p className="text-white/55 leading-relaxed">
          Point your camera at the QR code. Your phone will download the APK directly.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href={apkUrl}
            download
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs transition"
          >
            <Download className="w-3.5 h-3.5" /> Download APK
          </a>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/15 text-white/80 hover:bg-white/5 text-xs transition"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  );
}
