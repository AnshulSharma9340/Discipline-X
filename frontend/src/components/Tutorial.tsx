import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  X,
  ClipboardList,
  Timer,
  Trophy,
  Building2,
  Brain,
  Flame,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const STORAGE_KEY = 'dx-tutorial-completed';

export function shouldShowTutorial(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) !== '1';
}

export function markTutorialComplete() {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function resetTutorial() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

type Step = {
  icon: typeof ClipboardList;
  iconBg: string;
  badge: string;
  title: string;
  body: string;
  tips?: string[];
};

const steps: Step[] = [
  {
    icon: Sparkles,
    iconBg: 'from-neon-violet to-neon-pink',
    badge: 'Welcome',
    title: 'Discipline is a system, not a feeling.',
    body: 'DisciplineX turns daily intention into measurable streaks. Tasks with proof, real consequences if you skip, real rewards when you ship. Quick tour — 1 minute.',
  },
  {
    icon: ClipboardList,
    iconBg: 'from-neon-cyan to-emerald-400',
    badge: 'Step 1',
    title: 'Your daily tasks',
    body: 'Every day your admin assigns tasks. Open Today\'s Tasks, do the work, upload proof — image, PDF, GitHub commit, focus log.',
    tips: [
      'Required tasks count toward your streak.',
      'Approved by admin → XP awarded.',
      'Miss a required one before midnight and your account locks.',
    ],
  },
  {
    icon: Timer,
    iconBg: 'from-amber-400 to-orange-500',
    badge: 'Step 2',
    title: 'Lock in with Focus Timer',
    body: 'Start a Pomodoro or custom block. Survives tab close. Auto-logs your minutes. One-click submit as proof when you\'re done.',
  },
  {
    icon: Flame,
    iconBg: 'from-orange-500 to-red-500',
    badge: 'Step 3',
    title: 'Streaks & emergency',
    body: 'Your streak ticks +1 every day you complete required tasks. Miss a day → account locks at midnight. Submit an Emergency request to unlock.',
    tips: [
      'Earn freeze tokens to skip a day without breaking your streak.',
      'See your full history in Streak & Stats.',
    ],
  },
  {
    icon: Brain,
    iconBg: 'from-neon-violet to-neon-cyan',
    badge: 'Step 4',
    title: 'Your AI Coach',
    body: 'Tracks your last 30 days — burnout score, procrastination index, personalized nudges. Open AI Coach in the sidebar whenever you need a strategic pep-talk.',
  },
  {
    icon: Building2,
    iconBg: 'from-neon-cyan to-blue-400',
    badge: 'Step 5',
    title: 'Switch organizations anytime',
    body: 'You can belong to multiple orgs. The org pill in the topbar shows your active one — click to switch or join another.',
  },
  {
    icon: Trophy,
    iconBg: 'from-amber-300 to-yellow-500',
    badge: "You're set",
    title: "Now ship today's tasks.",
    body: 'Everything else (leaderboard, achievements, shop, chat, squads, buddy) is in the sidebar — click "Progress", "Social", and "Account" sections to expand. Replay this tour anytime from Settings.',
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Tutorial({ open, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') {
        markTutorialComplete();
        onClose();
      }
      if (e.key === 'ArrowRight' && !isLast) setIndex((i) => i + 1);
      if (e.key === 'ArrowLeft' && !isFirst) setIndex((i) => i - 1);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, isLast, isFirst, onClose]);

  function close() {
    markTutorialComplete();
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] grid place-items-center p-4 bg-black/75 backdrop-blur-md"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-neutral-950 to-black shadow-2xl"
          >
            <div className="absolute -top-32 -right-32 w-72 h-72 rounded-full bg-neon-violet/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-72 h-72 rounded-full bg-neon-cyan/10 blur-3xl pointer-events-none" />

            <button
              onClick={close}
              className="absolute top-4 right-4 z-10 w-9 h-9 grid place-items-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition"
              aria-label="Close tour"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative p-7 md:p-9">
              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] uppercase tracking-[0.18em] text-white/60 mb-5">
                    {step.badge}
                  </div>

                  <div
                    className={cn(
                      'w-14 h-14 rounded-2xl bg-gradient-to-br grid place-items-center mb-5 shadow-lg',
                      step.iconBg,
                    )}
                  >
                    <step.icon className="w-6 h-6 text-black" strokeWidth={2.25} />
                  </div>

                  <h2 className="font-display font-semibold text-2xl md:text-3xl tracking-[-0.02em] leading-tight">
                    {step.title}
                  </h2>
                  <p className="text-white/65 mt-3 text-sm md:text-base leading-relaxed">
                    {step.body}
                  </p>

                  {step.tips && (
                    <ul className="mt-5 space-y-2">
                      {step.tips.map((t) => (
                        <li
                          key={t}
                          className="flex items-start gap-2.5 text-sm text-white/65"
                        >
                          <div className="w-1 h-1 rounded-full bg-neon-cyan mt-2 shrink-0" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="mt-8 flex items-center gap-2">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/20 hover:bg-white/40',
                    )}
                    aria-label={`Step ${i + 1}`}
                  />
                ))}
                <div className="flex-1" />
                <button
                  onClick={() => setIndex((i) => i - 1)}
                  disabled={isFirst}
                  className="px-3 py-1.5 rounded-full text-xs text-white/55 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                {isLast ? (
                  <button
                    onClick={close}
                    className="px-5 py-2 rounded-full bg-white text-black font-medium hover:bg-white/90 transition text-sm inline-flex items-center gap-1.5"
                  >
                    Let's go <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setIndex((i) => i + 1)}
                    className="px-5 py-2 rounded-full bg-white text-black font-medium hover:bg-white/90 transition text-sm inline-flex items-center gap-1.5"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!isLast && (
                <button
                  onClick={close}
                  className="absolute bottom-7 left-7 text-xs text-white/35 hover:text-white/70 transition"
                >
                  Skip tour
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
