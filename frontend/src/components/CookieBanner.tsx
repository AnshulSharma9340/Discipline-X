import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, ShieldCheck, Sparkles, ChevronDown } from 'lucide-react';
import {
  closeCookiePreferences,
  getConsent,
  setConsent,
  useCookieConsent,
} from '@/lib/consent';

export function CookieBanner() {
  const { bannerState } = useCookieConsent();
  const [expanded, setExpanded] = useState(false);
  const [functional, setFunctional] = useState(false);

  useEffect(() => {
    if (bannerState === 'edit') {
      const current = getConsent();
      setFunctional(current?.functional ?? false);
      setExpanded(true);
    } else if (bannerState === 'first-visit') {
      setExpanded(false);
    }
  }, [bannerState]);

  if (!bannerState) return null;

  function acceptAll() {
    setConsent(true);
    closeCookiePreferences();
  }

  function rejectAll() {
    setConsent(false);
    closeCookiePreferences();
  }

  function savePreferences() {
    setConsent(functional);
    closeCookiePreferences();
  }

  return (
    <AnimatePresence>
      <motion.div
        key="cookie-banner"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="fixed bottom-4 inset-x-4 z-[60] sm:bottom-6 sm:inset-x-auto sm:right-6 sm:left-auto sm:w-[420px]"
        role="dialog"
        aria-modal="false"
        aria-live="polite"
        aria-label="Cookie consent"
      >
        <div className="rounded-2xl bg-black/85 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Accent stripe */}
          <div
            className="h-px w-full"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgb(var(--accent) / 0.7), transparent)',
            }}
          />

          <div className="p-5">
            <div className="flex items-start gap-3">
              <div
                className="shrink-0 w-9 h-9 rounded-full grid place-items-center border"
                style={{
                  background: 'rgb(var(--accent) / 0.12)',
                  borderColor: 'rgb(var(--accent) / 0.35)',
                }}
              >
                <Cookie className="w-4 h-4" style={{ color: 'rgb(var(--accent))' }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold text-sm">Your cookies, your call</div>
                <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                  We use a small set of cookies to keep you signed in and remember your preferences.
                  No advertising, no third-party trackers.{' '}
                  <Link to="/privacy" className="accent-text hover:underline">
                    Read the policy
                  </Link>
                  .
                </p>
              </div>
              <button
                onClick={rejectAll}
                className="shrink-0 text-white/40 hover:text-white/80 transition"
                aria-label="Reject non-essential and close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-4 w-full flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/45 hover:text-white/70 transition"
              aria-expanded={expanded}
            >
              <span>Customize</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                strokeWidth={2}
              />
            </button>

            <div
              className={`grid transition-all duration-200 ${
                expanded ? 'grid-rows-[1fr] mt-3' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <CategoryRow
                  icon={ShieldCheck}
                  title="Essential"
                  description="Auth tokens that keep you signed in and your theme. Required — the app cannot run without these."
                  locked
                  value
                />
                <CategoryRow
                  icon={Sparkles}
                  title="Functional"
                  description="Remembers the email and method you last signed in with so re-login is one click instead of three."
                  value={functional}
                  onChange={setFunctional}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {expanded ? (
                <button
                  onClick={savePreferences}
                  className="flex-1 px-4 py-2 rounded-full bg-white text-black text-xs font-medium hover:bg-white/90 transition"
                >
                  Save preferences
                </button>
              ) : (
                <button
                  onClick={acceptAll}
                  className="flex-1 px-4 py-2 rounded-full bg-white text-black text-xs font-medium hover:bg-white/90 transition"
                >
                  Accept all
                </button>
              )}
              <button
                onClick={rejectAll}
                className="flex-1 px-4 py-2 rounded-full border border-white/15 text-xs text-white/85 hover:bg-white/5 transition"
              >
                Reject non-essential
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function CategoryRow({
  icon: Icon,
  title,
  description,
  value,
  onChange,
  locked,
}: {
  icon: typeof Cookie;
  title: string;
  description: string;
  value: boolean;
  onChange?: (next: boolean) => void;
  locked?: boolean;
}) {
  return (
    <div className="py-2.5 first:pt-1 last:pb-0 flex gap-3">
      <div className="shrink-0 w-7 h-7 rounded-lg bg-white/5 border border-white/10 grid place-items-center mt-0.5">
        <Icon className="w-3.5 h-3.5 text-white/70" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-medium">{title}</div>
          <ConsentSwitch checked={value} onChange={onChange} locked={locked} label={title} />
        </div>
        <p className="text-[11px] text-white/45 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function ConsentSwitch({
  checked,
  onChange,
  locked,
  label,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  locked?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`Toggle ${label}`}
      disabled={locked}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
        checked ? 'bg-white' : 'bg-white/15'
      } ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-black transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}
