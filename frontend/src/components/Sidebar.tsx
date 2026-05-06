import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/store/auth';

const userLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: ClipboardList, label: "Today's Tasks" },
  { to: '/focus', icon: Timer, label: 'Focus Timer' },
  { to: '/habits', icon: Check, label: 'Habits' },
  { to: '/reflection', icon: BookOpen, label: 'Reflection' },
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
  // Show admin section if user is org owner OR moderator
  const isAdmin = user?.org_role === 'owner' || user?.org_role === 'moderator';

  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col gap-1 p-4 border-r border-white/5 bg-ink-900/40 backdrop-blur-xl overflow-y-auto">
      <div className="px-3 py-4 mb-2">
        <div className="text-2xl font-display font-bold neon-text">DisciplineX</div>
        <div className="text-xs text-white/40 mt-0.5 tracking-wider uppercase">
          Stay Sharp · Ship Daily
        </div>
      </div>

      <SectionTitle>Daily</SectionTitle>
      {userLinks.map((l) => (
        <SideLink key={l.to} {...l} />
      ))}

      <SectionTitle className="mt-4">Progress</SectionTitle>
      {userLinks2.map((l) => (
        <SideLink key={l.to} {...l} />
      ))}

      {isAdmin && (
        <>
          <SectionTitle className="mt-4">Admin</SectionTitle>
          {adminLinks.map((l) => (
            <SideLink key={l.to} {...l} />
          ))}
        </>
      )}

      <div className="mt-auto pt-4">
        <div className="p-3 glass">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-violet to-neon-cyan grid place-items-center text-sm font-semibold">
              {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{user?.name || user?.email}</div>
              <div className="text-xs text-white/50 capitalize">
                {user?.role} · Lv {user?.level ?? 1}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-3 text-[10px] uppercase tracking-widest text-white/40 mb-1', className)}>
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
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
          isActive
            ? 'bg-white/10 text-white shadow-soft'
            : 'text-white/60 hover:text-white hover:bg-white/5',
        )
      }
    >
      <Icon className="w-4 h-4" />
      {label}
    </NavLink>
  );
}
