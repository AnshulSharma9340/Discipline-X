import { Bell, Flame, LogOut, Zap } from 'lucide-react';
import { useAuth } from '@/store/auth';

export function Topbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="h-16 border-b border-white/5 bg-ink-900/40 backdrop-blur-xl flex items-center px-6 gap-4">
      <div className="flex-1">
        <div className="text-sm text-white/60">
          Welcome back, <span className="text-white font-medium">{user?.name || 'Operator'}</span>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
        <Flame className="w-3.5 h-3.5 text-orange-400" />
        <span className="font-medium">{user?.streak ?? 0}</span>
        <span className="text-white/50">day streak</span>
      </div>

      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
        <Zap className="w-3.5 h-3.5 text-neon-violet" />
        <span className="font-medium">{user?.xp ?? 0}</span>
        <span className="text-white/50">XP</span>
      </div>

      <button className="w-9 h-9 grid place-items-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition">
        <Bell className="w-4 h-4" />
      </button>

      <button
        onClick={signOut}
        className="w-9 h-9 grid place-items-center rounded-full bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 transition"
        title="Sign out"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </header>
  );
}
