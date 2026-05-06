import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: 'violet' | 'cyan' | 'pink' | 'lime';
  delta?: string;
}

const accents: Record<NonNullable<Props['accent']>, string> = {
  violet: 'from-neon-violet/30 to-neon-indigo/10 text-neon-violet',
  cyan: 'from-neon-cyan/30 to-neon-indigo/10 text-neon-cyan',
  pink: 'from-neon-pink/30 to-neon-violet/10 text-neon-pink',
  lime: 'from-neon-lime/30 to-neon-cyan/10 text-neon-lime',
};

export function StatCard({ label, value, icon: Icon, accent = 'violet', delta }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
      className="glass p-5 relative overflow-hidden group"
    >
      <div
        className={cn(
          'absolute -right-6 -top-6 w-32 h-32 rounded-full blur-2xl opacity-40 bg-gradient-to-br',
          accents[accent],
        )}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-wider text-white/50">{label}</span>
          <Icon className={cn('w-5 h-5', accents[accent].split(' ').slice(-1))} />
        </div>
        <div className="text-3xl font-display font-semibold tracking-tight">{value}</div>
        {delta && <div className="mt-1 text-xs text-white/50">{delta}</div>}
      </div>
    </motion.div>
  );
}
