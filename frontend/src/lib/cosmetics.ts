// Frame gradient classes are kept here so Tailwind's JIT scanner picks them up.
// The shop catalog (backend) returns the same strings, but those strings live in
// API responses and Tailwind would never see them — leading to missing styles
// at runtime. Keeping the literal class strings in this file fixes that.
export const FRAME_GRADIENT: Record<string, string> = {
  violet_ring: 'from-violet-400 via-fuchsia-400 to-cyan-400',
  gold_ring: 'from-amber-200 via-amber-400 to-yellow-600',
  plasma: 'from-cyan-300 via-fuchsia-500 to-violet-600',
  mythic_ring: 'from-emerald-300 via-cyan-400 via-violet-500 to-pink-500',
};

export function frameGradient(code: string | null | undefined): string {
  if (!code) return '';
  return FRAME_GRADIENT[code] ?? '';
}
