import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Brain, Github, LayoutDashboard, Loader2, Lock, Smartphone, Target, Timer, Trophy } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { ShaderAnimation } from '@/components/ui/ShaderAnimation';
import { InstallAppModal, shouldAutoShowInstall } from '@/components/InstallAppModal';
import { getConsent } from '@/lib/consent';
import { Logo } from '@/components/Logo';

export default function Landing() {
  const session = useAuth((s) => s.session);
  const initialized = useAuth((s) => s.initialized);
  const [installOpen, setInstallOpen] = useState(false);

  // Snapshot at mount: did the browser arrive here from an OAuth/magic-link
  // redirect (Supabase Site URL fallback)? supabase-js will consume the hash
  // shortly after, so we can't keep reading window.location.hash on every
  // render. Capture once and use that to decide whether to auto-bounce.
  const [arrivedFromOAuth] = useState(
    () =>
      typeof window !== 'undefined' &&
      /access_token=|refresh_token=|type=(magiclink|recovery|signup)/.test(
        window.location.hash,
      ),
  );

  // Auto-show the install prompt once on first visit — but wait until the cookie
  // banner is dismissed so the two don't fight for screen space.
  useEffect(() => {
    if (!shouldAutoShowInstall()) return;
    const t = setTimeout(() => {
      if (getConsent() !== null) setInstallOpen(true);
    }, 4500);
    return () => clearTimeout(t);
  }, []);

  // OAuth return flow: show a loader while supabase-js parses the hash, then
  // bounce to /dashboard. Logged-in users who navigate to / on purpose are
  // NOT redirected — they get the landing page with a Dashboard button.
  if (arrivedFromOAuth) {
    if (!initialized) {
      return (
        <div className="min-h-screen grid place-items-center bg-black">
          <Loader2 className="w-8 h-8 animate-spin text-white/60" />
        </div>
      );
    }
    if (session) return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Nav onGetApp={() => setInstallOpen(true)} />
      <Hero onGetApp={() => setInstallOpen(true)} />
      <Features />
      <Workflow />
      <CTA onGetApp={() => setInstallOpen(true)} />
      <Footer />
      <InstallAppModal open={installOpen} onClose={() => setInstallOpen(false)} />
    </div>
  );
}

function Nav({ onGetApp }: { onGetApp: () => void }) {
  const session = useAuth((s) => s.session);
  const signedIn = Boolean(session);

  return (
    <nav className="fixed top-0 inset-x-0 z-30 backdrop-blur-md bg-black/40 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="font-display font-semibold tracking-tight">DisciplineX</span>
        </Link>
        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={onGetApp}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-white/70 hover:text-white transition"
          >
            <Smartphone className="w-3.5 h-3.5" /> Get app
          </button>
          {signedIn ? (
            <Link
              to="/dashboard"
              className="ml-2 px-3.5 py-1.5 rounded-full bg-white text-black font-medium hover:bg-white/90 transition inline-flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="px-3 py-1.5 text-white/70 hover:text-white transition">
                Sign in
              </Link>
              <Link
                to="/register"
                className="ml-2 px-3.5 py-1.5 rounded-full bg-white text-black font-medium hover:bg-white/90 transition inline-flex items-center gap-1.5"
              >
                Get started <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function Hero({ onGetApp }: { onGetApp: () => void }) {
  return (
    <section className="relative h-[100vh] min-h-[680px] overflow-hidden">
      <ShaderAnimation />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black pointer-events-none" />

      <div className="relative z-10 h-full max-w-5xl mx-auto px-6 flex flex-col justify-center items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs backdrop-blur-md mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Built for operators who refuse to drift
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="font-display font-semibold tracking-[-0.04em] text-5xl md:text-7xl lg:text-8xl leading-[0.95]"
        >
          Discipline isn't a feeling.
          <br />
          <span className="italic font-light text-white/80">It's a system.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-6 max-w-xl text-base md:text-lg text-white/70 leading-relaxed"
        >
          Daily tasks. Verified proof. Real consequences.
          <br className="hidden sm:inline" />
          Your account locks at midnight if you skip the work.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition"
          >
            Start your streak <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white/90 hover:bg-white/5 backdrop-blur-md transition"
          >
            I have an account
          </Link>
          <button
            onClick={onGetApp}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white/90 hover:bg-white/5 backdrop-blur-md transition"
          >
            <Smartphone className="w-4 h-4" /> Get the app
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.25em] text-white/40"
        >
          ↓ Scroll
        </motion.div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      icon: Target,
      title: 'Tasks with proof',
      copy: 'Every task needs evidence — screenshot, PDF, GitHub commit, focus log. Reviewed by a human.',
    },
    {
      icon: Lock,
      title: 'Real consequences',
      copy: 'Miss a required task and your account locks at midnight. Submit an emergency to plead your case.',
    },
    {
      icon: Trophy,
      title: 'Live leaderboard',
      copy: 'Daily, weekly, monthly, streak. See who\'s actually shipping. Be the one who\'s shipping.',
    },
    {
      icon: Timer,
      title: 'Focus timer',
      copy: 'Pomodoro and custom focus blocks. Survives tab close. Submits as proof in one click.',
    },
    {
      icon: Brain,
      title: 'AI coach',
      copy: 'Burnout score. Procrastination index. Personalized nudges from the last 30 days of your patterns.',
    },
    {
      icon: Github,
      title: 'GitHub auto-verify',
      copy: 'Paste a commit URL — backend hits the public GitHub API and confirms the work without OAuth.',
    },
  ];
  return (
    <section className="relative max-w-6xl mx-auto px-6 py-32">
      <div className="max-w-2xl mb-16">
        <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">Features</div>
        <h2 className="font-display font-semibold text-3xl md:text-5xl tracking-tight leading-tight">
          Built like an operating system,
          <br />
          <span className="text-white/50">not a to-do list.</span>
        </h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
        {items.map((it, i) => (
          <motion.div
            key={it.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, delay: i * 0.04 }}
            className="bg-black p-7 hover:bg-white/[0.02] transition group"
          >
            <it.icon
              className="w-5 h-5 text-white/40 group-hover:text-white transition mb-5"
              strokeWidth={1.5}
            />
            <h3 className="font-display font-medium text-lg tracking-tight">{it.title}</h3>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">{it.copy}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Workflow() {
  const steps = [
    { n: '01', t: 'Admin publishes', d: "Today's tasks. Required ones count toward your streak." },
    { n: '02', t: 'You ship', d: 'Upload proof — image, PDF, code, GitHub link, focus log.' },
    { n: '03', t: 'Admin verifies', d: 'Approved → XP awarded, streak ticks. Rejected → resubmit.' },
    { n: '04', t: 'Midnight check', d: 'Missed required tasks? Account locks. Submit emergency or wait.' },
  ];
  return (
    <section className="relative max-w-5xl mx-auto px-6 py-32 border-t border-white/5">
      <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">How it works</div>
      <h2 className="font-display font-semibold text-3xl md:text-5xl tracking-tight leading-tight mb-12">
        Four steps. Daily. Forever.
      </h2>
      <ol className="space-y-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
        {steps.map((s, i) => (
          <motion.li
            key={s.n}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="bg-black p-6 md:p-8 flex gap-6 md:gap-10 items-baseline hover:bg-white/[0.02] transition"
          >
            <div className="font-mono text-xs text-white/30 tabular-nums">{s.n}</div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-medium text-xl tracking-tight">{s.t}</div>
              <p className="text-sm text-white/55 mt-1 leading-relaxed">{s.d}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

function CTA({ onGetApp }: { onGetApp: () => void }) {
  return (
    <section className="relative max-w-4xl mx-auto px-6 py-32 text-center border-t border-white/5">
      <h2 className="font-display font-semibold text-4xl md:text-6xl tracking-[-0.03em] leading-[0.95]">
        Stop drifting.
        <br />
        <span className="italic font-light text-white/60">Start shipping.</span>
      </h2>
      <p className="mt-6 text-white/60 max-w-md mx-auto">
        Free to start. Create your room — students join with an invite code.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/register"
          className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition"
        >
          Create your account <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-7 py-3 rounded-full border border-white/20 text-white/80 hover:bg-white/5 transition"
        >
          Sign in
        </Link>
        <button
          onClick={onGetApp}
          className="inline-flex items-center gap-2 px-7 py-3 rounded-full border border-white/20 text-white/80 hover:bg-white/5 transition"
        >
          <Smartphone className="w-4 h-4" /> Get the app
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-white/30">
        <div>© DisciplineX</div>
        <Link to="/docs" className="hover:text-white/60 transition">Docs</Link>
        <Link to="/privacy" className="hover:text-white/60 transition">Privacy</Link>
        <Link to="/terms" className="hover:text-white/60 transition">Terms</Link>
        <a
          href="https://github.com/AnshulSharma9340/Discipline-X"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-white/60 transition ml-auto"
        >
          <Github className="w-3.5 h-3.5" /> Source
        </a>
      </div>
    </footer>
  );
}
