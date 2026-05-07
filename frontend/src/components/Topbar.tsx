import { Bell, Flame, LogOut, Zap } from 'lucide-react';
import { useAuth } from '@/store/auth';

export function Topbar() {
  const { user, signOut } = useAuth();

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
