"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Tables } from "@/lib/db-types";

interface VisibilityChartProps {
  rankings: Tables<"rankings">[];
}

interface ChartPoint {
  date: string;
  averageRank: number;
  keywordCount: number;
}

function prepareChartData(rankings: Tables<"rankings">[]): ChartPoint[] {
  const byDate: Record<string, { total: number; count: number }> = {};

  for (const ranking of rankings) {
    if (ranking.rank_absolute == null) continue;
    const date = new Date(ranking.checked_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    if (!byDate[date]) {
      byDate[date] = { total: 0, count: 0 };
    }
    byDate[date].total += ranking.rank_absolute;
    byDate[date].count += 1;
  }

  const entries = Object.entries(byDate).map(([date, { total, count }]) => ({
    date,
    averageRank: count > 0 ? Math.round((total / count) * 10) / 10 : 0,
    keywordCount: count,
  }));

  entries.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return entries;
}

export function VisibilityChart({ rankings }: VisibilityChartProps) {
  const data = prepareChartData(rankings);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No ranking history yet. Add keywords to see the chart.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis
            reversed
            domain={[1, "dataMax"]}
            tick={{ fontSize: 12 }}
            label={{
              value: "Avg. position",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12, fill: "var(--muted-foreground)" },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--popover)",
              borderColor: "var(--border)",
              borderRadius: "8px",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--foreground)" }}
          />
          <Line
            type="monotone"
            dataKey="averageRank"
            name="Avg. position"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--chart-1)" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
