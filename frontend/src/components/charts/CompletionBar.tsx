import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Point {
  date: string;
  approved: number;
  submitted: number;
  rejected: number;
}

export function CompletionBar({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
        />
        <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }} />
        <Bar dataKey="approved" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="submitted" stackId="a" fill="#8b5cf6" />
        <Bar dataKey="rejected" stackId="a" fill="#ef4444" radius={[0, 0, 4, 4]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
