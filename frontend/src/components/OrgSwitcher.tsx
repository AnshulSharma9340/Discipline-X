import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Check, ChevronDown, Crown, Plus, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/cn';

type MyOrg = {
  id: string;
  name: string;
  slug: string;
  description: string;
  my_role: 'owner' | 'moderator' | 'member';
  is_active: boolean;
  joined_at: string;
};

function roleIcon(role: MyOrg['my_role']) {
  if (role === 'owner') return <Crown className="w-3 h-3 text-amber-300" />;
  if (role === 'moderator') return <Shield className="w-3 h-3 text-neon-cyan" />;
  return null;
}

export function OrgSwitcher() {
  const user = useAuth((s) => s.user);
  const [orgs, setOrgs] = useState<MyOrg[]>([]);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Lazy-load org list when opened the first time, refresh on every open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api.get<MyOrg[]>('/orgs/my').then((res) => {
      if (!cancelled) setOrgs(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!user?.org_id) return null;

  const active = orgs.find((o) => o.is_active);
  const activeName = active?.name ?? 'Loading…';

  async function switchTo(orgId: string) {
    if (orgId === user?.org_id) {
      setOpen(false);
      return;
    }
    setSwitching(orgId);
    try {
      await api.post(`/orgs/switch/${orgId}`);
      toast.success('Switched organization');
      // Hard reload so all org-scoped UI (dashboard, tasks, leaderboard, etc.)
      // refetches with the new active context. Cleaner than wiring refresh
      // into every cached query.
      window.location.href = '/dashboard';
    } catch {
      setSwitching(null);
    }
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/25 hover:bg-white/[0.03] transition text-sm max-w-[180px] sm:max-w-[260px]"
      >
        <Building2 className="w-3.5 h-3.5 text-white/55 shrink-0" strokeWidth={1.75} />
        <span className="truncate">{activeName}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-white/45 shrink-0 transition',
            open && 'rotate-180',
          )}
          strokeWidth={1.75}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[280px] rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-2 max-h-80 overflow-auto">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white/35">
                Your organizations
              </div>

              {orgs.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-white/40">Loading…</div>
              ) : (
                orgs.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => switchTo(o.id)}
                    disabled={switching !== null}
                    className={cn(
                      'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-white/[0.06] transition disabled:opacity-50',
                      o.is_active && 'bg-white/[0.04]',
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-neon-violet/15 border border-neon-violet/25 grid place-items-center shrink-0 text-xs font-display font-semibold text-neon-violet">
                      {o.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{o.name}</span>
                        {roleIcon(o.my_role)}
                      </div>
                      <div className="text-[11px] text-white/45 capitalize">{o.my_role}</div>
                    </div>
                    {o.is_active && (
                      <Check
                        className="w-4 h-4 text-neon-cyan shrink-0 mt-1.5"
                        strokeWidth={2}
                      />
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-white/5 p-2">
              <Link
                to="/onboarding?add=1"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/[0.06] transition text-sm"
              >
                <div className="w-8 h-8 rounded-lg border border-dashed border-white/15 grid place-items-center shrink-0">
                  <Plus className="w-4 h-4 text-white/55" strokeWidth={1.75} />
                </div>
                <span className="text-white/80">Add another organization</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
