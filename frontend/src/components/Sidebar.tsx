import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Trophy,
  Flame,
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
  MessageSquare,
  ChevronDown,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/store/auth';
import { useUI } from '@/store/ui';

type LinkItem = { to: string; icon: typeof LayoutDashboard; label: string };

// Top-level (always visible) — the 5 things a daily user does.
const dailyLinks: LinkItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: ClipboardList, label: "Today's Tasks" },
  { to: '/focus', icon: Timer, label: 'Focus Timer' },
  { to: '/habits', icon: Check, label: 'Habits' },
  { to: '/reflection', icon: BookOpen, label: 'Reflection' },
];

// Collapsible groups — surface power features without overwhelming new users.
const progressLinks: LinkItem[] = [
  { to: '/streak', icon: Flame, label: 'Streak & Stats' },
  { to: '/achievements', icon: Trophy, label: 'Achievements' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/coach', icon: Brain, label: 'AI Coach' },
];

const communityLinks: LinkItem[] = [
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/squads', icon: Swords, label: 'Squads' },
  { to: '/buddy', icon: Heart, label: 'Buddy' },
  { to: '/shop', icon: ShoppingBag, label: 'XP Shop' },
];

const adminLinks: LinkItem[] = [
  { to: '/admin', icon: Shield, label: 'Admin Console' },
  { to: '/admin/tasks', icon: ClipboardList, label: 'Manage Tasks' },
  { to: '/admin/ai-tasks', icon: Sparkles, label: 'AI Task Gen' },
  { to: '/admin/submissions', icon: BarChart3, label: 'Submissions' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/squads', icon: Swords, label: 'Manage Squads' },
  { to: '/admin/emergency', icon: AlertTriangle, label: 'Emergency Queue' },
];

const SECTION_KEY = 'dx-sidebar-sections';

type SectionState = { progress: boolean; community: boolean; admin: boolean };

const DEFAULT_STATE: SectionState = {
  progress: false,
  community: false,
  admin: true,
};

function loadState(): SectionState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(SECTION_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: SectionState) {
  try {
    window.localStorage.setItem(SECTION_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function Sidebar() {
  const user = useAuth((s) => s.user);
  const isAdmin = user?.org_role === 'owner' || user?.org_role === 'moderator';
  const isLocked = user?.access_status === 'locked';
  const sidebarOpen = useUI((s) => s.sidebarOpen);
  const setSidebarOpen = useUI((s) => s.setSidebarOpen);
  const [sections, setSections] = useState<SectionState>(DEFAULT_STATE);

  useEffect(() => {
    setSections(loadState());
  }, []);

  function toggle(key: keyof SectionState) {
    const next = { ...sections, [key]: !sections[key] };
    setSections(next);
    saveState(next);
  }

  return (
    <>
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
          'flex flex-col gap-0.5 p-3 border-r border-white/[0.06] backdrop-blur-xl overflow-y-auto',
          'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-black/90 transition-transform duration-200',
          'md:static md:z-0 md:w-64 md:max-w-none md:translate-x-0 md:bg-black/40 md:shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <Link
            to="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2.5 px-3 py-4 group"
          >
            <Logo size={28} className="transition group-hover:scale-105" />
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

        {/* Always-visible essentials */}
        {dailyLinks.map((l) => (
          <SideLink key={l.to} {...l} onNavigate={() => setSidebarOpen(false)} />
        ))}

        {/* Contextual: Emergency surfaces only when the user is actually locked. */}
        {isLocked && (
          <SideLink
            to="/emergency"
            icon={AlertTriangle}
            label="Emergency"
            tone="danger"
            onNavigate={() => setSidebarOpen(false)}
          />
        )}

        <SectionGroup
          label="Progress"
          open={sections.progress}
          onToggle={() => toggle('progress')}
          items={progressLinks}
          onNavigate={() => setSidebarOpen(false)}
        />
        <SectionGroup
          label="Community"
          open={sections.community}
          onToggle={() => toggle('community')}
          items={communityLinks}
          onNavigate={() => setSidebarOpen(false)}
        />

        {isAdmin && (
          <SectionGroup
            label="Admin"
            open={sections.admin}
            onToggle={() => toggle('admin')}
            items={adminLinks}
            onNavigate={() => setSidebarOpen(false)}
          />
        )}
      </aside>
    </>
  );
}

function SectionGroup({
  label,
  open,
  onToggle,
  items,
  onNavigate,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  items: LinkItem[];
  onNavigate?: () => void;
}) {
  return (
    <div className="mt-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white/35 font-medium hover:text-white/60 transition group"
      >
        <span>{label}</span>
        <ChevronDown
          className={cn(
            'w-3 h-3 transition-transform duration-150',
            open && 'rotate-180',
          )}
          strokeWidth={2}
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-150',
          open ? 'grid-rows-[1fr] mt-0.5' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          {items.map((l) => (
            <SideLink key={l.to} {...l} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SideLink({
  to,
  icon: Icon,
  label,
  onNavigate,
  tone,
}: {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  onNavigate?: () => void;
  tone?: 'danger';
}) {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard' || to === '/admin'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150',
          tone === 'danger'
            ? isActive
              ? 'bg-red-500/15 text-red-200 border border-red-500/30'
              : 'text-red-300/85 hover:text-red-200 hover:bg-red-500/[0.08] border border-red-500/20'
            : isActive
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
