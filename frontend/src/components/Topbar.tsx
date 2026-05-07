import { Bell, Flame, LogOut, Sparkles, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { useActiveBoost, formatBoostCountdown } from '@/hooks/useActiveBoost';

export function Topbar() {
  const { user, signOut } = useAuth();
  const boost = useActiveBoost();

  return (
    <header className="relative h-16 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl flex items-center px-6 gap-4 sticky top-0 z-20">
      {/* Themed accent stripe at the very top of the shell */}
      <div className="absolute inset-x-0 top-0 h-px accent-stripe pointer-events-none" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white/55">
          Welcome back,{' '}
          <span className="text-white font-medium">{user?.name || 'Operator'}</span>
        </div>
      </div>

      {boost && (
        <Link
          to="/shop"
          title={`${boost.multiplier}× XP active — ${formatBoostCountdown(boost.secondsLeft)} left`}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-300/35 bg-amber-300/[0.08] text-xs hover:bg-amber-300/[0.14] transition relative overflow-hidden"
        >
          <span
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(120deg, transparent 30%, rgba(253,224,71,0.18) 50%, transparent 70%)',
              backgroundSize: '200% 100%',
              animation: 'gradientX 4s linear infinite',
            }}
          />
          <Sparkles className="relative w-3.5 h-3.5 text-amber-300" strokeWidth={2} />
          <span className="relative font-mono font-semibold text-amber-100 tabular-nums">
            {boost.multiplier}×
          </span>
          <span className="relative text-amber-200/70 tabular-nums">
            {formatBoostCountdown(boost.secondsLeft)}
          </span>
        </Link>
      )}

      <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-xs">
        <Flame className="w-3.5 h-3.5 text-orange-400" strokeWidth={2} />
        <span className="font-mono font-medium tabular-nums">{user?.streak ?? 0}</span>
        <span className="text-white/45">d</span>
      </div>

      <div
        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs"
        style={{
          borderColor: 'rgb(var(--accent) / 0.35)',
          background: 'rgb(var(--accent) / 0.06)',
        }}
      >
        <Zap className="w-3.5 h-3.5" style={{ color: 'rgb(var(--accent))' }} strokeWidth={2} />
        <span className="font-mono font-medium tabular-nums">
          {(user?.xp ?? 0).toLocaleString()}
        </span>
      </div>

      <button
        className="w-9 h-9 grid place-items-center rounded-full border border-white/10 hover:border-white/30 hover:bg-white/[0.03] transition"
        title="Notifications"
      >
        <Bell className="w-4 h-4" strokeWidth={1.75} />
      </button>

      <button
        onClick={signOut}
        className="w-9 h-9 grid place-items-center rounded-full border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 transition"
        title="Sign out"
      >
        <LogOut className="w-4 h-4" strokeWidth={1.75} />
      </button>
    </header>
  );
}
