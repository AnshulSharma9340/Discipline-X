// Tiny hook that derives an active-boost descriptor from auth state and ticks
// down every second. Returns null when no boost is active so callers can simply
// `if (!boost) return null;` to hide the badge.
import { useEffect, useState } from 'react';
import { useAuth } from '@/store/auth';

export interface ActiveBoostInfo {
  multiplier: number;
  expiresAt: Date;
  secondsLeft: number;
}

function compute(now: number, expiresIso: string | null, multiplier: number): ActiveBoostInfo | null {
  if (!expiresIso) return null;
  const expiresAt = new Date(expiresIso);
  const secondsLeft = Math.floor((expiresAt.getTime() - now) / 1000);
  if (secondsLeft <= 0 || multiplier <= 1) return null;
  return { multiplier, expiresAt, secondsLeft };
}

export function useActiveBoost(): ActiveBoostInfo | null {
  const expiresIso = useAuth((s) => s.user?.xp_boost_until ?? null);
  const multiplier = useAuth((s) => s.user?.xp_boost_multiplier ?? 1);
  const [info, setInfo] = useState<ActiveBoostInfo | null>(() =>
    compute(Date.now(), expiresIso, multiplier),
  );

  useEffect(() => {
    setInfo(compute(Date.now(), expiresIso, multiplier));
    if (!expiresIso) return;
    const id = setInterval(() => {
      setInfo(compute(Date.now(), expiresIso, multiplier));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresIso, multiplier]);

  return info;
}

export function formatBoostCountdown(seconds: number): string {
  if (seconds <= 0) return '0s';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
