import { useMemo } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { cn } from '@/lib/cn';

interface Cell {
  date: string;
  value: number;
}

function intensity(v: number) {
  if (v >= 90) return 'bg-neon-violet/90 shadow-glow';
  if (v >= 70) return 'bg-neon-violet/70';
  if (v >= 50) return 'bg-neon-violet/50';
  if (v >= 25) return 'bg-neon-violet/30';
  if (v > 0) return 'bg-neon-violet/15';
  return 'bg-white/5';
}

export function Heatmap({ data }: { data: Cell[] }) {
  const grouped = useMemo(() => {
    const byDate = new Map(data.map((c) => [c.date, c.value]));
    const dates = data.map((c) => new Date(c.date));
    if (dates.length === 0) return [];
    const first = dates[0];
    const last = dates[dates.length - 1];
    const weekStart = startOfWeek(first, { weekStartsOn: 1 });

    const weeks: { date: Date; value: number; outOfRange: boolean }[][] = [];
    let cursor = weekStart;
    while (cursor <= last) {
      const week: typeof weeks[number] = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(cursor, i);
        const key = format(d, 'yyyy-MM-dd');
        week.push({
          date: d,
          value: byDate.get(key) ?? 0,
          outOfRange: d < first || d > last,
        });
      }
      weeks.push(week);
      cursor = addDays(cursor, 7);
    }
    return weeks;
  }, [data]);

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-1.5">
        {grouped.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1.5">
            {week.map((d, di) => (
              <div
                key={di}
                title={`${format(d.date, 'PP')} — ${d.value.toFixed(0)}`}
                className={cn(
                  'w-3 h-3 rounded-[3px] transition',
                  d.outOfRange ? 'opacity-0' : intensity(d.value),
                )}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-white/40">
        <span>Less</span>
        <div className="w-3 h-3 rounded-[3px] bg-white/5" />
        <div className="w-3 h-3 rounded-[3px] bg-neon-violet/15" />
        <div className="w-3 h-3 rounded-[3px] bg-neon-violet/30" />
        <div className="w-3 h-3 rounded-[3px] bg-neon-violet/50" />
        <div className="w-3 h-3 rounded-[3px] bg-neon-violet/70" />
        <div className="w-3 h-3 rounded-[3px] bg-neon-violet/90" />
        <span>More</span>
      </div>
    </div>
  );
}
