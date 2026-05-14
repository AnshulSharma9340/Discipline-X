import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  ChevronDown,
  CreditCard,
  Flame,
  LogOut,
  Menu,
  Settings as SettingsIcon,
  Sparkles,
  User as UserIcon,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { frameGradient } from '@/lib/cosmetics';
import { useAuth } from '@/store/auth';
import { useUI } from '@/store/ui';
import { useActiveBoost, formatBoostCountdown } from '@/hooks/useActiveBoost';
import { OrgSwitcher } from '@/components/OrgSwitcher';
import { PlanBadge } from '@/components/PlanBadge';

export function Topbar() {
  const { user, signOut } = useAuth();
  const toggleSidebar = useUI((s) => s.toggleSidebar);
  const boost = useActiveBoost();

  return (
    <header className="relative h-16 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl flex items-center px-3 md:px-6 gap-2 md:gap-3 sticky top-0 z-20">
      <div className="absolute inset-x-0 top-0 h-px accent-stripe pointer-events-none" />

      <button
        onClick={toggleSidebar}
        className="md:hidden w-9 h-9 grid place-items-center rounded-lg border border-white/10 hover:border-white/30 hover:bg-white/[0.03] transition shrink-0"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" strokeWidth={1.75} />
      </button>

      <div className="flex-1 min-w-0">
        <OrgSwitcher />
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

      <div className="sm:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-white/10 text-[11px] shrink-0">
        <Flame className="w-3.5 h-3.5 text-orange-400" strokeWidth={2} />
        <span className="font-mono font-medium tabular-nums">{user?.streak ?? 0}</span>
        <span className="text-white/30">·</span>
        <Zap className="w-3.5 h-3.5" style={{ color: 'rgb(var(--accent))' }} strokeWidth={2} />
        <span className="font-mono font-medium tabular-nums">
          {(user?.xp ?? 0).toLocaleString()}
        </span>
      </div>

      <PlanBadge />

      <UserMenu onSignOut={signOut} />
    </header>
  );
}

function UserMenu({ onSignOut }: { onSignOut: () => void }) {
  const user = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const initial = (user?.name?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();
  const gradient = frameGradient(user?.active_frame ?? '');

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full border border-white/10 hover:border-white/25 hover:bg-white/[0.03] transition shrink-0"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {gradient ? (
          <div
            className={cn(
              'p-[2px] rounded-full bg-gradient-to-br animate-[gradient-x_6s_ease_infinite]',
              gradient,
            )}
            style={{ backgroundSize: '200% 200%' }}
          >
            <div className="w-7 h-7 rounded-full bg-white grid place-items-center text-[13px] font-semibold text-black">
              {initial}
            </div>
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-white grid place-items-center text-[13px] font-semibold text-black">
            {initial}
          </div>
        )}
        <ChevronDown
          className={cn('w-3.5 h-3.5 text-white/55 transition-transform', open && 'rotate-180')}
          strokeWidth={2}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden z-50"
            role="menu"
          >
            <div className="px-3 py-3 border-b border-white/[0.06]">
              <div className="text-sm font-medium truncate">{user?.name || user?.email}</div>
              <div className="text-[11px] text-white/45 truncate">
                {(user?.org_role ?? user?.role) || ''} · Lv {user?.level ?? 1}
              </div>
            </div>
            <div className="py-1">
              {user?.id && (
                <MenuItem to={`/u/${user.id}`} icon={UserIcon} onClick={() => setOpen(false)}>
                  Profile
                </MenuItem>
              )}
              <MenuItem to="/settings" icon={SettingsIcon} onClick={() => setOpen(false)}>
                Settings
              </MenuItem>
              <MenuItem to="/billing" icon={CreditCard} onClick={() => setOpen(false)}>
                Billing & Plans
              </MenuItem>
              <MenuItem to="/org" icon={Building2} onClick={() => setOpen(false)}>
                Organization
              </MenuItem>
            </div>
            <div className="py-1 border-t border-white/[0.06]">
              <button
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-300/90 hover:text-red-200 hover:bg-red-500/10 transition"
                role="menuitem"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.75} />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  to,
  icon: Icon,
  children,
  onClick,
}: {
  to: string;
  icon: typeof UserIcon;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition',
          isActive
            ? 'text-white bg-white/[0.04]'
            : 'text-white/75 hover:text-white hover:bg-white/[0.04]',
        )
      }
      role="menuitem"
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
      {children}
    </NavLink>
  );
}
