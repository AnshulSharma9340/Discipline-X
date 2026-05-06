import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'violet' | 'cyan' | 'green' | 'red' | 'amber';

const tones: Record<Tone, string> = {
  neutral: 'bg-white/5 text-white/70 border-white/10',
  violet: 'bg-neon-violet/15 text-neon-violet border-neon-violet/30',
  cyan: 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30',
  green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  red: 'bg-red-500/15 text-red-300 border-red-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
