import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Trophy,
  Flame,
  Settings,
  Shield,
  Users,
  AlertTriangle,
  BarChart3,
  Brain,
  Timer,
  Check,
  BookOpen,
  ShoppingBag,
  Sparkles,
  Heart,
  Swords,
  Building2,
  MessageSquare,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { frameGradient } from '@/lib/cosmetics';
import { useAuth } from '@/store/auth';
import { useUI } from '@/store/ui';

const userLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: ClipboardList, label: "Today's Tasks" },
  { to: '/focus', icon: Timer, label: 'Focus Timer' },
  { to: '/habits', icon: Check, label: 'Habits' },
  { to: '/reflection', icon: BookOpen, label: 'Reflection' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/coach', icon: Brain, label: 'AI Coach' },
];

const userLinks2 = [
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/squads', icon: Swords, label: 'Squads' },
  { to: '/buddy', icon: Heart, label: 'Buddy' },
  { to: '/streak', icon: Flame, label: 'Streak & Stats' },
  { to: '/achievements', icon: Trophy, label: 'Achievements' },
  { to: '/shop', icon: ShoppingBag, label: 'XP Shop' },
  { to: '/emergency', icon: AlertTriangle, label: 'Emergency' },
  { to: '/org', icon: Building2, label: 'Organization' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const adminLinks = [
  { to: '/admin', icon: Shield, label: 'Admin Console' },
  { to: '/admin/tasks', icon: ClipboardList, label: 'Manage Tasks' },
  { to: '/admin/ai-tasks', icon: Sparkles, label: 'AI Task Gen' },
  { to: '/admin/squads', icon: Swords, label: 'Manage Squads' },
  { to: '/admin/submissions', icon: BarChart3, label: 'Submissions' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/emergency', icon: AlertTriangle, label: 'Emergency Queue' },
];

export function Sidebar() {
  const user = useAuth((s) => s.user);
  const isAdmin = user?.org_role === 'owner' || user?.org_role === 'moderator';
  const sidebarOpen = useUI((s) => s.sidebarOpen);
  const setSidebarOpen = useUI((s) => s.setSidebarOpen);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-200',
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden
      />

      <aside
        className={cn(
          // Base layout
          'flex flex-col gap-0.5 p-3 border-r border-white/[0.06] backdrop-blur-xl overflow-y-auto',
          // Mobile: fixed slide-over drawer
          'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-black/90 transition-transform duration-200',
          // Desktop: static, in flow
          'md:static md:z-0 md:w-64 md:max-w-none md:translate-x-0 md:bg-black/40 md:shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Brand row + mobile close button */}
        <div className="flex items-center justify-between mb-2">
          <Link
            to="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2.5 px-3 py-4 group"
          >
            <div className="w-7 h-7 rounded-md brand-tile grid place-items-center transition group-hover:scale-105">
              <span className="text-black font-display font-bold text-sm leading-none">D</span>
            </div>
            <span className="font-display font-semibold tracking-tight text-[15px]">DisciplineX</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden mr-2 w-9 h-9 grid place-items-center rounded-lg border border-white/10 hover:border-white/30 hover:bg-white/[0.03] transition"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        <SectionTitle>Daily</SectionTitle>
        {userLinks.map((l) => (
          <SideLink key={l.to} {...l} onNavigate={() => setSidebarOpen(false)} />
        ))}

        <SectionTitle className="mt-5">Progress</SectionTitle>
        {userLinks2.map((l) => (
          <SideLink key={l.to} {...l} onNavigate={() => setSidebarOpen(false)} />
        ))}

        {isAdmin && (
          <>
            <SectionTitle className="mt-5">Admin</SectionTitle>
            {adminLinks.map((l) => (
              <SideLink key={l.to} {...l} onNavigate={() => setSidebarOpen(false)} />
            ))}
          </>
        )}

        <div className="mt-auto pt-4">
          <Link
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.02] transition"
          >
            <SidebarAvatar
              initial={user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
              frameCode={user?.active_frame ?? ''}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{user?.name || user?.email}</div>
              {user?.active_title ? (
                <div className="text-[10px] uppercase tracking-[0.16em] truncate accent-text font-medium">
                  « {humanTitle(user.active_title)} »
                </div>
              ) : null}
              <div className="text-[11px] text-white/45 capitalize">
                {user?.org_role ?? user?.role} · Lv {user?.level ?? 1}
              </div>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}

const TITLE_LABELS: Record<string, string> = {
  early_riser: 'Early Riser',
  iron_will: 'Iron Will',
  night_owl: 'Night Owl',
  code_wizard: 'Code Wizard',
  marathoner: 'The Marathoner',
  ascendant: 'Ascendant',
  mythic_one: 'The Mythic',
};

function humanTitle(code: string): string {
  return TITLE_LABELS[code] ?? code.replace(/_/g, ' ');
}

function SidebarAvatar({ initial, frameCode }: { initial: string; frameCode: string }) {
  const gradient = frameGradient(frameCode);
  if (!gradient) {
    return (
      <div className="w-8 h-8 rounded-full bg-white grid place-items-center text-sm font-semibold text-black shrink-0">
        {initial}
      </div>
    );
  }
  return (
    <div
      className={cn(
        'p-[2px] rounded-full bg-gradient-to-br shrink-0 animate-[gradient-x_6s_ease_infinite]',
        gradient,
      )}
      style={{ backgroundSize: '200% 200%' }}
    >
      <div className="w-7 h-7 rounded-full bg-white grid place-items-center text-[13px] font-semibold text-black">
        {initial}
      </div>
    </div>
  );
}

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'px-3 mt-2 mb-1 text-[10px] uppercase tracking-[0.18em] text-white/35 font-medium',
        className,
      )}
    >
      {children}
    </div>
  );
}

function SideLink({
  to,
  icon: Icon,
  label,
  onNavigate,
}: {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard' || to === '/admin'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150',
          isActive
            ? 'nav-active text-white'
            : 'text-white/55 hover:text-white hover:bg-white/[0.03]',
        )
      }
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
      {label}
    </NavLink>
  );
}
