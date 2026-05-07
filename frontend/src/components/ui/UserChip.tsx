// Reusable user-flair primitives. UserAvatar wraps the initial in an animated
// gradient halo when an `active_frame` is set, otherwise renders a plain bubble.
// UserTitle renders a tier-colored chip under the user's name. Both are kept
// here so cosmetics stay consistent across chat, leaderboard, profile, etc.
import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { frameGradient } from '@/lib/cosmetics';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_INNER: Record<Size, string> = {
  xs: 'w-6 h-6 text-[11px]',
  sm: 'w-7 h-7 text-[13px]',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-20 h-20 text-3xl',
};

const SIZE_PAD: Record<Size, string> = {
  xs: 'p-[1.5px]',
  sm: 'p-[2px]',
  md: 'p-[2px]',
  lg: 'p-[2.5px]',
  xl: 'p-[3px]',
};

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  frameCode?: string | null;
  size?: Size;
  className?: string;
  /** When true, renders a fallback gradient bubble instead of plain white if no frame. */
  brandFallback?: boolean;
}

function initialOf(name?: string | null, email?: string | null) {
  return (name?.[0] ?? email?.[0] ?? '?').toUpperCase();
}

export function UserAvatar({
  name,
  email,
  avatarUrl,
  frameCode,
  size = 'md',
  className,
  brandFallback,
}: UserAvatarProps) {
  const inner = SIZE_INNER[size];
  const pad = SIZE_PAD[size];
  const gradient = frameGradient(frameCode || '');

  const avatarInner = avatarUrl ? (
    <img
      src={avatarUrl}
      alt={name || email || ''}
      className={cn('rounded-full object-cover bg-black', inner)}
    />
  ) : (
    <div
      className={cn(
        'rounded-full grid place-items-center font-semibold shrink-0',
        inner,
        brandFallback
          ? 'bg-gradient-to-br from-violet-400 to-cyan-400 text-white'
          : 'bg-white text-black',
      )}
    >
      {initialOf(name, email)}
    </div>
  );

  if (!gradient) {
    return <div className={cn('shrink-0', className)}>{avatarInner}</div>;
  }

  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-br shrink-0 animate-[gradient-x_6s_ease_infinite]',
        pad,
        gradient,
        className,
      )}
      style={{ backgroundSize: '200% 200%' }}
      title={frameCode ? `Frame: ${frameCode}` : undefined}
    >
      <div className="rounded-full bg-black grid place-items-center">
        {avatarInner}
      </div>
    </div>
  );
}

const TITLE_LABELS: Record<string, { name: string; tier: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' }> = {
  early_riser: { name: 'Early Riser', tier: 'common' },
  iron_will: { name: 'Iron Will', tier: 'rare' },
  night_owl: { name: 'Night Owl', tier: 'rare' },
  code_wizard: { name: 'Code Wizard', tier: 'epic' },
  marathoner: { name: 'The Marathoner', tier: 'epic' },
  ascendant: { name: 'Ascendant', tier: 'legendary' },
  mythic_one: { name: 'The Mythic', tier: 'mythic' },
};

const TITLE_TIER_TEXT = {
  common: 'text-white/55',
  rare: 'text-cyan-300',
  epic: 'text-violet-300',
  legendary: 'text-amber-300',
  mythic: 'text-pink-300',
} as const;

export function titleLookup(code?: string | null) {
  if (!code) return null;
  const def = TITLE_LABELS[code];
  if (def) return def;
  return { name: code.replace(/_/g, ' '), tier: 'common' as const };
}

interface UserTitleProps {
  code?: string | null;
  size?: 'xs' | 'sm';
  className?: string;
  /** When true, renders the title with brackets in tier-color, no chip border. */
  inline?: boolean;
}

export function UserTitle({ code, size = 'xs', className, inline }: UserTitleProps) {
  const def = titleLookup(code);
  if (!def) return null;

  if (inline) {
    return (
      <span
        className={cn(
          'truncate font-medium uppercase tracking-[0.16em]',
          size === 'xs' ? 'text-[10px]' : 'text-[11px]',
          TITLE_TIER_TEXT[def.tier],
          className,
        )}
        style={{ textShadow: `0 0 12px currentColor` }}
        title={`Title: ${def.name}`}
      >
        « {def.name} »
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium uppercase tracking-[0.14em]',
        size === 'xs' ? 'text-[9px]' : 'text-[10px]',
        TITLE_TIER_TEXT[def.tier],
        'border-current/30 bg-current/[0.06]',
        className,
      )}
      title={`Title: ${def.name}`}
    >
      {def.name}
    </span>
  );
}

/** Inline name + title pair used in chat/leaderboard rows. */
export function UserNameWithTitle({
  name,
  titleCode,
  className,
  nameClassName,
  appendix,
}: {
  name: string;
  titleCode?: string | null;
  className?: string;
  nameClassName?: string;
  appendix?: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col min-w-0', className)}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn('font-medium truncate', nameClassName)}>{name}</span>
        {appendix}
      </div>
      {titleCode ? <UserTitle code={titleCode} inline /> : null}
    </div>
  );
}
