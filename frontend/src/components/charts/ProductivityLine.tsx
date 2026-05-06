import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Point {
  date: string;
  productivity: number;
  discipline: number;
}

export function ProductivityLine({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="prodG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="discG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="date"
          stroke="rgba(255,255,255,0.4)"
          tickFormatter={(v) => v.slice(5)}
          fontSize={11}
        />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
        <Tooltip
          contentStyle={{
            background: 'rgba(17,20,29,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
          }}
          labelStyle={{ color: '#fff' }}
        />
        <Area
          type="monotone"
          dataKey="productivity"
          stroke="#8b5cf6"
          strokeWidth={2}
          fill="url(#prodG)"
        />
        <Area
          type="monotone"
          dataKey="discipline"
          stroke="#22d3ee"
          strokeWidth={2}
          fill="url(#discG)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
