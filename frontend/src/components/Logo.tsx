import { useId } from 'react';
import { cn } from '@/lib/cn';

interface Props {
  /** Pixel size of the rendered tile (square). Default 28 — matches old brand-tile. */
  size?: number;
  /** Extra classes for the outer SVG. */
  className?: string;
  /** Hide the accent dot at the top-right (e.g. very small favicons). */
  noDot?: boolean;
}

/**
 * The DisciplineX brand mark — single source of truth for the logo across
 * the app. Same artwork as `public/favicon.svg`, rendered inline so it
 * stays sharp at any size and inherits sizing from its container.
 */
export function Logo({ size = 28, className, noDot = false }: Props) {
  // Unique gradient ids per render — multiple Logos on a page must not collide.
  const uid = useId().replace(/:/g, '');
  const idBg = `dx-bg-${uid}`;
  const idMark = `dx-mark-${uid}`;
  const idShine = `dx-shine-${uid}`;
  const idGlowA = `dx-glow-a-${uid}`;
  const idGlowB = `dx-glow-b-${uid}`;
  const idDotHalo = `dx-dot-halo-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={cn('shrink-0', className)}
      aria-label="DisciplineX"
      role="img"
    >
      <defs>
        <linearGradient id={idBg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2d1b69" />
          <stop offset="35%" stopColor="#1a0f3d" />
          <stop offset="70%" stopColor="#0a0719" />
          <stop offset="100%" stopColor="#03020a" />
        </linearGradient>
        <linearGradient id={idMark} x1="0.05" y1="0.05" x2="0.95" y2="0.95">
          <stop offset="0%" stopColor="#fdfaff" />
          <stop offset="25%" stopColor="#d4c4fd" />
          <stop offset="55%" stopColor="#9b6cf6" />
          <stop offset="85%" stopColor="#5b9efc" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id={idShine} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={idGlowA} cx="0.22" cy="0.22" r="0.6">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={idGlowB} cx="0.85" cy="0.82" r="0.45">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={idDotHalo} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#22d3ee" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="64" height="64" rx="14" fill={`url(#${idBg})`} />
      <rect width="64" height="64" rx="14" fill={`url(#${idGlowA})`} />
      <rect width="64" height="64" rx="14" fill={`url(#${idGlowB})`} />

      <path
        fill={`url(#${idMark})`}
        fillRule="evenodd"
        d="M 16 14 H 33 C 42.94 14 51 22.06 51 32 C 51 41.94 42.94 50 33 50 H 16 V 14 Z M 24.5 22.5 V 41.5 H 33 C 38.25 41.5 42.5 37.25 42.5 32 C 42.5 26.75 38.25 22.5 33 22.5 H 24.5 Z"
      />

      <rect width="64" height="34" rx="14" fill={`url(#${idShine})`} />
      <rect
        x="0.5"
        y="0.5"
        width="63"
        height="63"
        rx="13.5"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.1"
        strokeWidth="1"
      />

      {!noDot && (
        <>
          <circle cx="48.5" cy="14.5" r="5" fill={`url(#${idDotHalo})`} />
          <circle cx="48.5" cy="14.5" r="2" fill="#22d3ee" />
          <circle cx="48.5" cy="13.7" r="0.7" fill="#ffffff" opacity="0.7" />
        </>
      )}
    </svg>
  );
}

/**
 * Wordmark variant — Logo + "DisciplineX" text, matched typography. Use in
 * brand rows (sidebar header, marketing nav, legal pages).
 */
export function LogoLockup({
  size = 28,
  className,
  textClassName,
}: {
  size?: number;
  className?: string;
  textClassName?: string;
}) {
  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <Logo size={size} />
      <span
        className={cn(
          'font-display font-semibold tracking-[-0.01em] text-[15px]',
          textClassName,
        )}
      >
        DisciplineX
      </span>
    </div>
  );
}
