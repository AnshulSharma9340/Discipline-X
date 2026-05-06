import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  Flame,
  Github,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/store/auth';

export default function Landing() {
  const session = useAuth((s) => s.session);
  const initialized = useAuth((s) => s.initialized);

  // Logged-in users skip straight to their dashboard
  if (initialized && session) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Aurora backdrop */}
      <div className="absolute inset-0 bg-aurora opacity-50 animate-gradient-x [background-size:200%_200%] pointer-events-none" />

      <Nav />

      <main className="relative z-10">
        <Hero />
        <SocialProof />
        <Features />
        <HowItWorks />
        <FinalCTA />
        <Footer />
      </main>
    </div>
  );
}

function Nav() {
  return (
    <nav className="relative z-20 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-violet to-neon-cyan grid place-items-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-xl font-display font-bold neon-text">DisciplineX</div>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/login" className="btn-ghost">
          Sign in
        </Link>
        <Link to="/register" className="btn-primary">
          Get started <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="max-w-7xl mx-auto px-6 pt-12 pb-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs mb-6"
      >
        <Sparkles className="w-3.5 h-3.5 text-neon-cyan" />
        AI-powered productivity & discipline OS
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="font-display font-bold tracking-tight text-5xl md:text-7xl leading-[1.05]"
      >
        Discipline isn't a feeling. <br />
        <span className="neon-text">It's a system.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 text-lg md:text-xl text-white/70 max-w-2xl mx-auto"
      >
        Daily tasks. Verified proof. Streaks that mean something. Compete with the room and stay
        accountable to yourself — or your account gets locked at midnight.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-10 flex flex-wrap justify-center gap-3"
      >
        <Link to="/register" className="btn-primary text-base px-7 py-3">
          Start your streak <ArrowRight className="w-4 h-4" />
        </Link>
        <Link to="/login" className="btn-ghost text-base px-7 py-3">
          I already have an account
        </Link>
      </motion.div>

      {/* Live preview card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="mt-16 max-w-5xl mx-auto"
      >
        <div className="glass p-1.5 shadow-glow">
          <div className="rounded-xl bg-ink-950/60 p-6 grid md:grid-cols-3 gap-4 text-left">
            <MiniStat icon={Flame} label="Streak" value="42d" accent="text-orange-400" />
            <MiniStat icon={Zap} label="XP" value="3,184" accent="text-neon-violet" />
            <MiniStat icon={Trophy} label="Rank" value="#7" accent="text-neon-cyan" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="glass p-5 relative overflow-hidden">
      <div className="text-xs uppercase tracking-wider text-white/50">{label}</div>
      <div className="flex items-end justify-between mt-1">
        <div className="text-3xl font-display font-bold">{value}</div>
        <Icon className={`w-5 h-5 ${accent}`} />
      </div>
    </div>
  );
}

function SocialProof() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <div className="text-center text-xs uppercase tracking-widest text-white/40 mb-6">
        Built for operators who refuse to drift
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {[
          ['Tasks shipped', '2.1k+'],
          ['Streaks held', '184'],
          ['Active rooms', '12'],
          ['Avg discipline', '78'],
        ].map(([label, value]) => (
          <div key={label} className="glass p-5">
            <div className="text-2xl font-display font-bold neon-text">{value}</div>
            <div className="text-xs text-white/50 mt-1">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      icon: Target,
      title: 'Daily Mission',
      body: 'Admins assign required tasks. Miss one and the system locks you out at midnight.',
    },
    {
      icon: ShieldCheck,
      title: 'Proof or it didn\'t happen',
      body: 'Every task needs proof — screenshots, PDFs, code, GitHub links. Reviewed by humans.',
    },
    {
      icon: Timer,
      title: 'Focus timer',
      body: 'Pomodoro and custom focus sessions. Logged automatically and submittable as proof.',
    },
    {
      icon: Trophy,
      title: 'Live leaderboard',
      body: 'Daily / weekly / monthly / streak rankings. See who\'s shipping. Be the one who\'s shipping.',
    },
    {
      icon: Brain,
      title: 'AI Coach',
      body: 'Burnout risk. Procrastination index. Forecast. Behavioral recommendations from your patterns.',
    },
    {
      icon: Flame,
      title: 'Streaks that hurt to break',
      body: 'Real consequences. Lost streak resets to zero. Locked account until you submit an emergency request.',
    },
  ];
  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <div className="text-xs uppercase tracking-widest text-neon-cyan mb-3">Features</div>
        <h2 className="text-3xl md:text-4xl font-display font-bold">
          Built like an operating system, <br />
          <span className="neon-text">not a to-do list.</span>
        </h2>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => (
          <motion.div
            key={it.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass p-6 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-violet/30 to-neon-cyan/20 grid place-items-center mb-3 group-hover:shadow-glow transition">
              <it.icon className="w-5 h-5 text-neon-cyan" />
            </div>
            <div className="font-display font-semibold text-lg">{it.title}</div>
            <p className="text-sm text-white/60 mt-1.5">{it.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    ['Admin publishes today\'s tasks', 'Required tasks count toward streak. Optional tasks earn XP.'],
    ['You ship and upload proof', 'Screenshot, PDF, GitHub link — whatever proves the work.'],
    ['Admin verifies', 'Approved → XP awarded, streak ticks. Rejected → resubmit.'],
    ['Midnight check', 'Missed required tasks? Account locks. Submit emergency or wait it out.'],
  ];
  return (
    <section className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <div className="text-xs uppercase tracking-widest text-neon-cyan mb-3">How it works</div>
        <h2 className="text-3xl md:text-4xl font-display font-bold">
          Four steps. Daily. <span className="neon-text">Forever.</span>
        </h2>
      </div>
      <ol className="space-y-3">
        {steps.map(([title, body], i) => (
          <motion.li
            key={title}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass p-5 flex gap-4 items-start"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-violet to-neon-indigo grid place-items-center font-display font-bold shrink-0">
              {i + 1}
            </div>
            <div>
              <div className="font-display font-semibold">{title}</div>
              <p className="text-sm text-white/60 mt-1">{body}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-20 text-center">
      <div className="glass p-10 md:p-14 shadow-glow relative overflow-hidden">
        <div className="absolute inset-0 bg-aurora opacity-30 animate-gradient-x [background-size:200%_200%]" />
        <div className="relative">
          <h2 className="text-3xl md:text-5xl font-display font-bold leading-tight">
            Stop drifting. <br />
            <span className="neon-text">Start shipping.</span>
          </h2>
          <p className="mt-4 text-white/70 max-w-xl mx-auto">
            Free to start. First user in your room becomes the admin. Build your streak today.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn-primary text-base px-7 py-3">
              Create your account <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="btn-ghost text-base px-7 py-3">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="max-w-7xl mx-auto px-6 py-10 flex items-center justify-between text-xs text-white/40 border-t border-white/5">
      <div>© DisciplineX — Stay sharp. Ship daily.</div>
      <a
        href="https://github.com"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 hover:text-white/70 transition"
      >
        <Github className="w-3.5 h-3.5" /> Source
      </a>
    </footer>
  );
}
