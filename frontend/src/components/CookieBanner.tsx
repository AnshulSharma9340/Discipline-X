import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X } from 'lucide-react';

const STORAGE_KEY = 'dx-cookie-consent';

type Consent = 'accepted' | 'declined';

export function getCookieConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'accepted' || v === 'declined' ? v : null;
}

export function CookieBanner() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setConsent(getCookieConsent());
  }, []);

  function record(value: Consent) {
    window.localStorage.setItem(STORAGE_KEY, value);
    setConsent(value);
  }

  if (!mounted || consent !== null) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="fixed bottom-4 inset-x-4 z-50 sm:bottom-6 sm:inset-x-auto sm:right-6 sm:left-auto sm:max-w-md"
        role="dialog"
        aria-live="polite"
        aria-label="Cookie consent"
      >
        <div className="rounded-2xl bg-black/85 backdrop-blur-xl border border-white/10 shadow-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-full bg-neon-violet/20 border border-neon-violet/30 grid place-items-center">
              <Cookie className="w-4 h-4 text-neon-violet" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display font-semibold text-sm">We use minimal cookies</div>
              <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                Essential cookies keep you signed in. Functional ones remember your theme. No
                tracking, no ads.{' '}
                <Link to="/privacy" className="text-neon-cyan hover:underline">
                  Read more
                </Link>
                .
              </p>
              <div className="flex gap-2 mt-3.5">
                <button
                  onClick={() => record('accepted')}
                  className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-medium hover:bg-white/90 transition"
                >
                  Accept
                </button>
                <button
                  onClick={() => record('declined')}
                  className="px-4 py-1.5 rounded-full border border-white/15 text-xs text-white/80 hover:bg-white/5 transition"
                >
                  Essentials only
                </button>
              </div>
            </div>
            <button
              onClick={() => record('declined')}
              className="shrink-0 text-white/40 hover:text-white/80 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
