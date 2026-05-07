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
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/store/auth';

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

  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col gap-0.5 p-3 border-r border-white/[0.06] bg-black/40 backdrop-blur-xl overflow-y-auto">
      {/* Brand — minimal, matches landing */}
      <Link to="/dashboard" className="flex items-center gap-2.5 px-3 py-4 mb-2 group">
        <div className="w-7 h-7 rounded-md bg-white grid place-items-center transition group-hover:scale-105">
          <span className="text-black font-display font-bold text-sm leading-none">D</span>
        </div>
        <span className="font-display font-semibold tracking-tight text-[15px]">DisciplineX</span>
      </Link>

      <SectionTitle>Daily</SectionTitle>
      {userLinks.map((l) => (
        <SideLink key={l.to} {...l} />
      ))}

      <SectionTitle className="mt-5">Progress</SectionTitle>
      {userLinks2.map((l) => (
        <SideLink key={l.to} {...l} />
      ))}

      {isAdmin && (
        <>
          <SectionTitle className="mt-5">Admin</SectionTitle>
          {adminLinks.map((l) => (
            <SideLink key={l.to} {...l} />
          ))}
        </>
      )}

      <div className="mt-auto pt-4">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.02] transition"
        >
          <div className="w-8 h-8 rounded-full bg-white grid place-items-center text-sm font-semibold text-black shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{user?.name || user?.email}</div>
            <div className="text-[11px] text-white/45 capitalize">
              {user?.org_role ?? user?.role} · Lv {user?.level ?? 1}
            </div>
          </div>
        </Link>
      </div>
    </aside>
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
}: {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard' || to === '/admin'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors duration-150',
          isActive
            ? 'bg-white/[0.07] text-white'
            : 'text-white/55 hover:text-white hover:bg-white/[0.03]',
        )
      }
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
      {label}
    </NavLink>
  );
}
