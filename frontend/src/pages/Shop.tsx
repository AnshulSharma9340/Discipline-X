import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Loader2,
  Zap,
  ShieldCheck,
  Check,
  Sparkles,
  Crown,
  Frame,
  Palette,
  Rocket,
  Lock,
  Flame,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/cn';
import { frameGradient } from '@/lib/cosmetics';
import type {
  ShopState,
  ThemeItem,
  TitleItem,
  FrameItem,
  ShieldItem,
  BoosterItem,
  ShopTier,
  ActiveBoost,
} from '@/types';

type Tab = 'collection' | 'themes' | 'boosters' | 'shields' | 'titles' | 'frames';

const TABS: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: 'collection', label: 'Collection', icon: Sparkles },
  { id: 'themes', label: 'Themes', icon: Palette },
  { id: 'boosters', label: 'Boosters', icon: Rocket },
  { id: 'shields', label: 'Shields', icon: ShieldCheck },
  { id: 'titles', label: 'Titles', icon: Crown },
  { id: 'frames', label: 'Frames', icon: Frame },
];

const TIER_LABEL: Record<ShopTier, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
};

const TIER_TEXT: Record<ShopTier, string> = {
  common: 'text-white/55',
  rare: 'text-cyan-300',
  epic: 'text-violet-300',
  legendary: 'text-amber-300',
  mythic: 'text-pink-300',
};

function tierClass(tier: ShopTier) {
  return `tier-${tier}`;
}

function fmt(n: number) {
  return n.toLocaleString();
}

function formatCountdown(seconds: number) {
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

export default function Shop() {
  const fetchProfile = useAuth((s) => s.fetchProfile);
  const [state, setState] = useState<ShopState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('collection');

  async function load() {
    setLoading(true);
    try {
      const r = await api.get<ShopState>('/shop/');
      // Defensive: if the backend is an older build, fall back to empty arrays so
      // the page still renders rather than crashing on undefined.map().
      setState({
        xp: r.data.xp ?? 0,
        freeze_tokens: r.data.freeze_tokens ?? 0,
        current_theme: r.data.current_theme ?? 'violet',
        active_title: r.data.active_title ?? '',
        active_frame: r.data.active_frame ?? '',
        active_boost: r.data.active_boost ?? null,
        themes: r.data.themes ?? [],
        titles: r.data.titles ?? [],
        frames: r.data.frames ?? [],
        shields: r.data.shields ?? [],
        boosters: r.data.boosters ?? [],
      });
    } catch (e) {
      const message =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Could not load shop';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function buy(item: string) {
    setBusy(item);
    try {
      await api.post('/shop/buy', { item });
      toast.success('Purchased');
      await load();
      await fetchProfile();
    } catch (e) {
      const message =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Purchase failed';
      toast.error(message);
    } finally {
      setBusy(null);
    }
  }

  async function equip(kind: 'theme' | 'title' | 'frame', code: string) {
    setBusy(`equip:${kind}:${code}`);
    try {
      await api.post('/shop/equip', { kind, code });
      toast.success(code ? 'Equipped' : 'Unequipped');
      await load();
      await fetchProfile();
    } catch (e) {
      const message =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed';
      toast.error(message);
    } finally {
      setBusy(null);
    }
  }

  if (loading || !state) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'rgb(var(--accent))' }} />
      </div>
    );
  }

  const ownedThemes = state.themes.filter((t) => t.owned);
  const ownedTitles = state.titles.filter((t) => t.owned);
  const ownedFrames = state.frames.filter((f) => f.owned);
  const collectionCount =
    ownedThemes.length + ownedTitles.length + ownedFrames.length;

  const counts: Record<Tab, number> = {
    collection: collectionCount,
    themes: state.themes.length,
    boosters: state.boosters.length,
    shields: state.shields.length,
    titles: state.titles.length,
    frames: state.frames.length,
  };

  return (
    <div className="space-y-8">
      <ShopHero state={state} />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-all duration-200',
                active
                  ? 'bg-white text-black border-white'
                  : 'border-white/12 text-white/70 hover:text-white hover:border-white/30 hover:bg-white/[0.03]',
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              <span
                className={cn(
                  'text-[10px] tabular-nums px-1.5 py-0.5 rounded-full',
                  active ? 'bg-black/15 text-black' : 'bg-white/[0.06] text-white/50',
                )}
              >
                {counts[t.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {tab === 'collection' && (
            <CollectionView
              state={state}
              ownedThemes={ownedThemes}
              ownedTitles={ownedTitles}
              ownedFrames={ownedFrames}
              busy={busy}
              equip={equip}
              setTab={setTab}
            />
          )}
          {tab === 'themes' && (
            <ThemeGrid items={state.themes} xp={state.xp} busy={busy} buy={buy} equip={equip} />
          )}
          {tab === 'boosters' && (
            <BoosterGrid
              items={state.boosters}
              xp={state.xp}
              busy={busy}
              buy={buy}
              activeBoost={state.active_boost}
            />
          )}
          {tab === 'shields' && (
            <ShieldGrid
              items={state.shields}
              xp={state.xp}
              busy={busy}
              buy={buy}
              freezeTokens={state.freeze_tokens}
            />
          )}
          {tab === 'titles' && (
            <TitleGrid items={state.titles} xp={state.xp} busy={busy} buy={buy} equip={equip} />
          )}
          {tab === 'frames' && (
            <FrameGrid items={state.frames} xp={state.xp} busy={busy} buy={buy} equip={equip} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */

function ShopHero({ state }: { state: ShopState }) {
  const activeTheme = state.themes.find((t) => t.code === state.current_theme);
  const activeTitle = state.titles.find((t) => t.code === state.active_title);
  const activeFrame = state.frames.find((f) => f.code === state.active_frame);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-white/[0.08] p-7 md:p-9"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)',
      }}
    >
      {/* glow */}
      <div
        className="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full opacity-[0.18] blur-3xl pointer-events-none"
        style={{ background: 'rgb(var(--accent))' }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full opacity-[0.12] blur-3xl pointer-events-none"
        style={{ background: 'rgb(var(--accent-2))' }}
      />

      <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/45">
            <ShoppingBag className="w-3.5 h-3.5" /> XP Shop
          </div>
          <h1 className="mt-2 text-4xl md:text-5xl font-display font-bold leading-[1.05] tracking-tight">
            Spend XP. <span className="accent-text">Look the part.</span>
          </h1>
          <p className="mt-3 text-white/55 max-w-xl">
            Themes restyle your entire app. Boosters multiply XP. Shields protect your streak.
            Titles and frames decorate your profile.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-w-[280px]">
          <Stat
            label="Your XP"
            value={fmt(state.xp)}
            icon={<Zap className="w-3.5 h-3.5" style={{ color: 'rgb(var(--accent))' }} />}
            highlight
          />
          <Stat
            label="Shields"
            value={fmt(state.freeze_tokens)}
            icon={<ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />}
          />
          <BoostStat boost={state.active_boost} />
        </div>
      </div>

      {/* Equipped row */}
      <div className="relative mt-7 flex flex-wrap items-center gap-2 text-xs">
        <span className="eyebrow">Equipped</span>
        <Pill
          label="Theme"
          value={activeTheme?.name ?? 'Aurora Violet'}
          tone="accent"
        />
        <Pill
          label="Title"
          value={activeTitle ? activeTitle.name : '— none —'}
          tone={activeTitle ? 'gold' : 'muted'}
        />
        <Pill
          label="Frame"
          value={activeFrame ? activeFrame.name : '— none —'}
          tone={activeFrame ? 'pink' : 'muted'}
        />
      </div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3',
        highlight
          ? 'border-white/15 bg-white/[0.04]'
          : 'border-white/[0.08] bg-white/[0.02]',
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/40">
        {icon} {label}
      </div>
      <div
        className={cn(
          'mt-1 font-display font-bold tabular-nums',
          highlight ? 'text-2xl accent-text' : 'text-2xl text-white',
        )}
      >
        {value}
      </div>
    </div>
  );
}

function BoostStat({ boost }: { boost: ActiveBoost | null }) {
  const [secs, setSecs] = useState(boost?.seconds_left ?? 0);

  useEffect(() => {
    setSecs(boost?.seconds_left ?? 0);
    if (!boost) return;
    const id = setInterval(() => {
      setSecs((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [boost?.expires_at, boost?.seconds_left, boost]);

  if (!boost) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/40">
          <Rocket className="w-3.5 h-3.5 text-white/40" /> Boost
        </div>
        <div className="mt-1 text-sm text-white/40">No active boost</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-amber-300/30 bg-amber-300/[0.06] px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
        <Sparkles className="w-3.5 h-3.5" /> Active Boost
      </div>
      <div className="mt-1 text-2xl font-display font-bold text-amber-200 tabular-nums">
        {boost.multiplier}× <span className="text-xs font-normal text-amber-200/70">XP</span>
      </div>
      <div className="text-[11px] text-amber-200/60 tabular-nums">{formatCountdown(secs)} left</div>
    </div>
  );
}

function Pill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'accent' | 'gold' | 'pink' | 'muted';
}) {
  const toneCls = {
    accent: 'border-white/15 bg-white/[0.04]',
    gold: 'border-amber-300/25 bg-amber-300/[0.06] text-amber-100',
    pink: 'border-pink-400/25 bg-pink-400/[0.06] text-pink-100',
    muted: 'border-white/[0.08] bg-white/[0.02] text-white/45',
  }[tone];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1', toneCls)}>
      <span className="text-[10px] uppercase tracking-[0.16em] opacity-60">{label}</span>
      <span className="font-medium">{value}</span>
    </span>
  );
}

/* ─────────────────────────── Generic card scaffold ─────────────────────────── */

function ShopCard({
  tier,
  title,
  blurb,
  cost,
  owned,
  active,
  affordable,
  onBuy,
  onEquip,
  onUnequip,
  loadingBuy,
  loadingEquip,
  preview,
  buyLabel = 'Unlock',
  equipLabel = 'Equip',
  showUnequip = false,
}: {
  tier: ShopTier;
  title: string;
  blurb?: string;
  cost: number;
  owned: boolean;
  active: boolean;
  affordable: boolean;
  onBuy: () => void;
  onEquip?: () => void;
  onUnequip?: () => void;
  loadingBuy: boolean;
  loadingEquip?: boolean;
  preview: React.ReactNode;
  buyLabel?: string;
  equipLabel?: string;
  showUnequip?: boolean;
}) {
  const showHolo = tier === 'legendary' || tier === 'mythic';
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'relative rounded-2xl overflow-hidden bg-black/40 backdrop-blur-xl border border-white/[0.08]',
        tierClass(tier),
        showHolo && 'holo',
      )}
    >
      {preview}

      <div className="relative p-4 z-[2]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-display font-semibold truncate">{title}</div>
            {blurb && <div className="text-xs text-white/50 mt-0.5 line-clamp-2">{blurb}</div>}
          </div>
          <span className={cn('text-[10px] uppercase tracking-[0.16em]', TIER_TEXT[tier])}>
            {TIER_LABEL[tier]}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="text-xs">
            {cost === 0 ? (
              <span className="text-emerald-300">Free</span>
            ) : (
              <span className="text-white/70">
                <span className="font-semibold text-white tabular-nums">{fmt(cost)}</span>{' '}
                <span className="text-white/40">XP</span>
              </span>
            )}
          </div>

          {active ? (
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
              <Check className="w-3.5 h-3.5" /> Active
            </div>
          ) : owned ? (
            <div className="flex items-center gap-1.5">
              {showUnequip && onUnequip && (
                <button
                  onClick={onUnequip}
                  disabled={loadingEquip}
                  className="text-[11px] text-white/45 hover:text-white px-2 py-1 rounded-full"
                >
                  Unequip
                </button>
              )}
              <Button
                variant="ghost"
                onClick={onEquip}
                loading={loadingEquip}
                className="!px-3 !py-1.5 text-xs"
              >
                {equipLabel}
              </Button>
            </div>
          ) : (
            <Button
              onClick={onBuy}
              loading={loadingBuy}
              disabled={!affordable}
              className="!px-3 !py-1.5 text-xs"
            >
              {!affordable && <Lock className="w-3 h-3" />} {buyLabel}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────── Themes ─────────────────────────── */

function ThemeGrid({
  items,
  xp,
  busy,
  buy,
  equip,
}: {
  items: ThemeItem[];
  xp: number;
  busy: string | null;
  buy: (item: string) => void;
  equip: (kind: 'theme' | 'title' | 'frame', code: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((t) => (
        <ShopCard
          key={t.code}
          tier={t.tier}
          title={t.name}
          blurb={t.blurb}
          cost={t.cost}
          owned={t.owned}
          active={t.active}
          affordable={xp >= t.cost}
          onBuy={() => buy(t.code)}
          onEquip={() => equip('theme', t.code)}
          loadingBuy={busy === t.code}
          loadingEquip={busy === `equip:theme:${t.code}`}
          preview={
            <div className="relative h-32" style={{ background: t.preview }}>
              {/* glossy sheen */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.35) 100%)',
                }}
              />
              {t.active && (
                <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur px-2 py-0.5 text-[10px] uppercase tracking-wider">
                  <Check className="w-3 h-3" /> Active
                </div>
              )}
              {t.owned && !t.active && (
                <div className="absolute top-2 left-2 rounded-full bg-black/55 backdrop-blur px-2 py-0.5 text-[10px] uppercase tracking-wider">
                  Owned
                </div>
              )}
            </div>
          }
          equipLabel="Apply"
        />
      ))}
    </div>
  );
}

/* ─────────────────────────── Boosters ─────────────────────────── */

function BoosterGrid({
  items,
  xp,
  busy,
  buy,
  activeBoost,
}: {
  items: BoosterItem[];
  xp: number;
  busy: string | null;
  buy: (item: string) => void;
  activeBoost: ActiveBoost | null;
}) {
  return (
    <div className="space-y-4">
      {activeBoost && (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-300/[0.04] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-300/15 grid place-items-center">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div className="flex-1">
            <div className="font-display font-semibold text-amber-100">
              {activeBoost.multiplier}× XP active
            </div>
            <div className="text-xs text-amber-200/60">
              Buying another booster will stack the duration. Higher multipliers replace lower ones.
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((b) => (
          <ShopCard
            key={b.code}
            tier={b.tier}
            title={b.name}
            blurb={b.blurb}
            cost={b.cost}
            owned={false}
            active={false}
            affordable={xp >= b.cost}
            onBuy={() => buy(b.code)}
            loadingBuy={busy === b.code}
            buyLabel="Activate"
            preview={
              <div className="relative h-28 grid place-items-center bg-gradient-to-br from-amber-300/15 via-fuchsia-500/10 to-violet-600/15 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(253,224,71,0.25),transparent_55%)]" />
                <div className="relative text-center">
                  <div className="text-4xl font-display font-bold tabular-nums text-amber-200 drop-shadow-[0_0_18px_rgba(253,224,71,0.45)]">
                    {b.multiplier}×
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-amber-200/70 mt-0.5">
                    for {b.hours < 24 ? `${b.hours}h` : `${b.hours / 24}d`}
                  </div>
                </div>
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Shields ─────────────────────────── */

function ShieldGrid({
  items,
  xp,
  busy,
  buy,
  freezeTokens,
}: {
  items: ShieldItem[];
  xp: number;
  busy: string | null;
  buy: (item: string) => void;
  freezeTokens: number;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.04] p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-400/15 grid place-items-center">
          <Flame className="w-5 h-5 text-cyan-300" />
        </div>
        <div>
          <div className="font-display font-semibold text-cyan-100">
            You hold {freezeTokens} shield{freezeTokens === 1 ? '' : 's'}
          </div>
          <div className="text-xs text-cyan-200/60">
            One shield is auto-spent if you miss a required day — your streak survives.
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((s) => (
          <ShopCard
            key={s.code}
            tier={s.tier}
            title={s.name}
            blurb={s.blurb}
            cost={s.cost}
            owned={false}
            active={false}
            affordable={xp >= s.cost}
            onBuy={() => buy(s.code)}
            loadingBuy={busy === s.code}
            buyLabel={`Buy +${s.grants}`}
            preview={
              <div className="relative h-28 grid place-items-center bg-gradient-to-br from-cyan-400/12 via-blue-500/10 to-indigo-500/12 overflow-hidden">
                <ShieldCheck className="w-12 h-12 text-cyan-200 drop-shadow-[0_0_20px_rgba(34,211,238,0.45)]" />
                <div className="absolute bottom-2 right-2 text-[11px] uppercase tracking-[0.18em] text-cyan-200/70">
                  +{s.grants} day{s.grants === 1 ? '' : 's'}
                </div>
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Titles ─────────────────────────── */

function TitleGrid({
  items,
  xp,
  busy,
  buy,
  equip,
}: {
  items: TitleItem[];
  xp: number;
  busy: string | null;
  buy: (item: string) => void;
  equip: (kind: 'theme' | 'title' | 'frame', code: string) => void;
}) {
  const anyEquipped = useMemo(() => items.some((t) => t.active), [items]);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-300/25 bg-amber-300/[0.04] p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-300/15 grid place-items-center">
            <Crown className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="font-display font-semibold text-amber-100">Profile titles</div>
            <div className="text-xs text-amber-200/60">
              Worn under your name on profile and leaderboard. Equip one at a time.
            </div>
          </div>
        </div>
        {anyEquipped && (
          <button
            onClick={() => equip('title', '')}
            className="text-xs text-amber-100/70 hover:text-amber-100 underline underline-offset-4"
          >
            Unequip current
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((t) => (
          <ShopCard
            key={t.code}
            tier={t.tier}
            title={t.name}
            blurb={t.blurb}
            cost={t.cost}
            owned={t.owned}
            active={t.active}
            affordable={xp >= t.cost}
            onBuy={() => buy(`title:${t.code}`)}
            onEquip={() => equip('title', t.code)}
            loadingBuy={busy === `title:${t.code}`}
            loadingEquip={busy === `equip:title:${t.code}`}
            preview={
              <div
                className={cn(
                  'relative h-28 grid place-items-center px-4 text-center overflow-hidden',
                  'bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent',
                )}
              >
                <div
                  className={cn(
                    'font-display text-2xl tracking-tight',
                    TIER_TEXT[t.tier],
                  )}
                  style={{ textShadow: '0 0 24px currentColor' }}
                >
                  «&nbsp;{t.name}&nbsp;»
                </div>
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Collection ─────────────────────────── */

function CollectionView({
  state,
  ownedThemes,
  ownedTitles,
  ownedFrames,
  busy,
  equip,
  setTab,
}: {
  state: ShopState;
  ownedThemes: ThemeItem[];
  ownedTitles: TitleItem[];
  ownedFrames: FrameItem[];
  busy: string | null;
  equip: (kind: 'theme' | 'title' | 'frame', code: string) => void;
  setTab: (t: Tab) => void;
}) {
  const totalSpent = useMemo(() => {
    const themeCost = ownedThemes.reduce((sum, t) => sum + t.cost, 0);
    const titleCost = ownedTitles.reduce((sum, t) => sum + t.cost, 0);
    const frameCost = ownedFrames.reduce((sum, f) => sum + f.cost, 0);
    return themeCost + titleCost + frameCost;
  }, [ownedThemes, ownedTitles, ownedFrames]);

  const isEmpty =
    ownedThemes.length === 0 && ownedTitles.length === 0 && ownedFrames.length === 0;

  if (isEmpty) {
    return (
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.015] p-12 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl grid place-items-center accent-ring mb-5">
          <Sparkles className="w-6 h-6" style={{ color: 'rgb(var(--accent))' }} />
        </div>
        <h2 className="font-display text-2xl font-bold">Your trophy room is empty</h2>
        <p className="text-white/55 mt-2 max-w-sm mx-auto">
          Buy your first theme, title or frame and it'll show up here. Everything you own
          stays here forever.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setTab('themes')}
            className="btn-primary"
          >
            <Palette className="w-4 h-4" /> Browse themes
          </button>
          <button
            onClick={() => setTab('boosters')}
            className="btn-ghost"
          >
            <Rocket className="w-4 h-4" /> XP boosters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CollectionStat
          label="Themes owned"
          value={`${ownedThemes.length} / ${state.themes.length}`}
          icon={<Palette className="w-3.5 h-3.5" style={{ color: 'rgb(var(--accent))' }} />}
        />
        <CollectionStat
          label="Titles owned"
          value={`${ownedTitles.length} / ${state.titles.length}`}
          icon={<Crown className="w-3.5 h-3.5 text-amber-300" />}
        />
        <CollectionStat
          label="Frames owned"
          value={`${ownedFrames.length} / ${state.frames.length}`}
          icon={<Frame className="w-3.5 h-3.5 text-pink-300" />}
        />
        <CollectionStat
          label="XP invested"
          value={fmt(totalSpent)}
          icon={<Zap className="w-3.5 h-3.5 text-violet-300" />}
        />
      </div>

      {/* Themes */}
      <CollectionSection
        title="Themes"
        empty="No themes owned yet"
        onBrowse={() => setTab('themes')}
        count={ownedThemes.length}
      >
        {ownedThemes.map((t) => (
          <motion.button
            key={t.code}
            whileHover={{ y: -2 }}
            onClick={() => equip('theme', t.code)}
            disabled={busy === `equip:theme:${t.code}` || t.active}
            className={cn(
              'group relative rounded-2xl overflow-hidden text-left bg-black/40 border',
              t.active
                ? 'border-emerald-400/50 ring-1 ring-emerald-400/40'
                : 'border-white/[0.08] hover:border-white/20',
              tierClass(t.tier),
            )}
          >
            <div className="h-24 relative" style={{ background: t.preview }}>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.35) 100%)',
                }}
              />
              {t.active && (
                <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-200">
                  <Check className="w-3 h-3" /> Active
                </div>
              )}
            </div>
            <div className="p-3">
              <div className="font-display font-semibold text-sm truncate">{t.name}</div>
              <div className={cn('text-[10px] uppercase tracking-[0.16em]', TIER_TEXT[t.tier])}>
                {TIER_LABEL[t.tier]}
              </div>
              {!t.active && (
                <div className="mt-1.5 text-[11px] text-white/55 group-hover:text-white transition">
                  Click to apply →
                </div>
              )}
            </div>
          </motion.button>
        ))}
      </CollectionSection>

      {/* Titles */}
      <CollectionSection
        title="Titles"
        empty="No titles unlocked yet"
        onBrowse={() => setTab('titles')}
        count={ownedTitles.length}
      >
        {ownedTitles.map((t) => (
          <motion.button
            key={t.code}
            whileHover={{ y: -2 }}
            onClick={() => equip('title', t.active ? '' : t.code)}
            disabled={busy === `equip:title:${t.code}`}
            className={cn(
              'group relative rounded-2xl overflow-hidden text-left bg-black/40 border p-4',
              t.active
                ? 'border-emerald-400/50 ring-1 ring-emerald-400/40'
                : 'border-white/[0.08] hover:border-white/20',
              tierClass(t.tier),
            )}
          >
            <div
              className={cn('font-display text-xl truncate', TIER_TEXT[t.tier])}
              style={{ textShadow: '0 0 18px currentColor' }}
            >
              «&nbsp;{t.name}&nbsp;»
            </div>
            <div className="text-xs text-white/50 mt-1 line-clamp-2">{t.blurb}</div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className={cn('text-[10px] uppercase tracking-[0.16em]', TIER_TEXT[t.tier])}>
                {TIER_LABEL[t.tier]}
              </span>
              <span
                className={cn(
                  'text-[11px]',
                  t.active ? 'text-emerald-300' : 'text-white/55 group-hover:text-white',
                )}
              >
                {t.active ? '✓ Equipped — click to remove' : 'Click to equip →'}
              </span>
            </div>
          </motion.button>
        ))}
      </CollectionSection>

      {/* Frames */}
      <CollectionSection
        title="Frames"
        empty="No frames unlocked yet"
        onBrowse={() => setTab('frames')}
        count={ownedFrames.length}
      >
        {ownedFrames.map((f) => (
          <motion.button
            key={f.code}
            whileHover={{ y: -2 }}
            onClick={() => equip('frame', f.active ? '' : f.code)}
            disabled={busy === `equip:frame:${f.code}`}
            className={cn(
              'group relative rounded-2xl overflow-hidden text-left bg-black/40 border p-4',
              f.active
                ? 'border-emerald-400/50 ring-1 ring-emerald-400/40'
                : 'border-white/[0.08] hover:border-white/20',
              tierClass(f.tier),
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'p-[3px] rounded-full bg-gradient-to-br animate-[gradient-x_6s_ease_infinite]',
                  frameGradient(f.code),
                )}
                style={{ backgroundSize: '200% 200%' }}
              >
                <div className="w-12 h-12 rounded-full bg-black grid place-items-center text-white font-display font-bold">
                  A
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold truncate">{f.name}</div>
                <div className="text-xs text-white/50 line-clamp-2">{f.blurb}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className={cn('text-[10px] uppercase tracking-[0.16em]', TIER_TEXT[f.tier])}>
                {TIER_LABEL[f.tier]}
              </span>
              <span
                className={cn(
                  'text-[11px]',
                  f.active ? 'text-emerald-300' : 'text-white/55 group-hover:text-white',
                )}
              >
                {f.active ? '✓ Equipped — click to remove' : 'Click to equip →'}
              </span>
            </div>
          </motion.button>
        ))}
      </CollectionSection>

      {/* Consumables stat */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="eyebrow mb-3">Consumables &amp; status</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.04] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-400/15 grid place-items-center">
              <ShieldCheck className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="font-display text-2xl text-cyan-100 tabular-nums">
                {state.freeze_tokens}
              </div>
              <div className="text-xs text-cyan-200/60">streak shield{state.freeze_tokens === 1 ? '' : 's'} held</div>
            </div>
          </div>
          {state.active_boost ? (
            <div className="rounded-xl border border-amber-300/30 bg-amber-300/[0.06] p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-300/15 grid place-items-center">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="font-display text-2xl text-amber-100 tabular-nums">
                  {state.active_boost.multiplier}× XP
                </div>
                <div className="text-xs text-amber-200/60 tabular-nums">
                  {formatCountdown(state.active_boost.seconds_left)} remaining
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] grid place-items-center">
                <Rocket className="w-5 h-5 text-white/40" />
              </div>
              <div>
                <div className="font-display text-base text-white/55">No active boost</div>
                <div className="text-xs text-white/35">Activate one in Boosters →</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CollectionStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/40">
        {icon} {label}
      </div>
      <div className="mt-1 font-display text-xl tabular-nums">{value}</div>
    </div>
  );
}

function CollectionSection({
  title,
  count,
  children,
  empty,
  onBrowse,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  empty: string;
  onBrowse: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm uppercase tracking-[0.18em] text-white/55">{title}</h2>
          <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/50">
            {count}
          </span>
        </div>
        <button
          onClick={onBrowse}
          className="text-[11px] uppercase tracking-[0.16em] text-white/45 hover:text-white transition"
        >
          Browse all →
        </button>
      </div>
      {count === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-8 text-center">
          <div className="text-sm text-white/45">{empty}</div>
          <button onClick={onBrowse} className="btn-ghost mt-3">
            Browse store
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
      )}
    </div>
  );
}

/* ─────────────────────────── Frames ─────────────────────────── */

function FrameGrid({
  items,
  xp,
  busy,
  buy,
  equip,
}: {
  items: FrameItem[];
  xp: number;
  busy: string | null;
  buy: (item: string) => void;
  equip: (kind: 'theme' | 'title' | 'frame', code: string) => void;
}) {
  const anyEquipped = useMemo(() => items.some((f) => f.active), [items]);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-pink-400/25 bg-pink-400/[0.04] p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-400/15 grid place-items-center">
            <Frame className="w-5 h-5 text-pink-300" />
          </div>
          <div>
            <div className="font-display font-semibold text-pink-100">Avatar frames</div>
            <div className="text-xs text-pink-200/60">
              An animated halo around your avatar everywhere your profile shows up.
            </div>
          </div>
        </div>
        {anyEquipped && (
          <button
            onClick={() => equip('frame', '')}
            className="text-xs text-pink-100/70 hover:text-pink-100 underline underline-offset-4"
          >
            Unequip current
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((f) => (
          <ShopCard
            key={f.code}
            tier={f.tier}
            title={f.name}
            blurb={f.blurb}
            cost={f.cost}
            owned={f.owned}
            active={f.active}
            affordable={xp >= f.cost}
            onBuy={() => buy(`frame:${f.code}`)}
            onEquip={() => equip('frame', f.code)}
            loadingBuy={busy === `frame:${f.code}`}
            loadingEquip={busy === `equip:frame:${f.code}`}
            preview={
              <div className="relative h-32 grid place-items-center overflow-hidden">
                <div
                  className={cn(
                    'p-[3px] rounded-full bg-gradient-to-br animate-[gradient-x_6s_ease_infinite]',
                    frameGradient(f.code),
                  )}
                  style={{ backgroundSize: '200% 200%' }}
                >
                  <div className="w-16 h-16 rounded-full bg-black grid place-items-center text-white font-display font-bold text-xl">
                    A
                  </div>
                </div>
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}
