"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { TradeSetup } from "@/types";
import { TRADE_SETUP_LABELS } from "@/types";

interface SetupAccuracy {
  total: number;
  won: number;
  accuracy: number | null;
}

interface AccuracyChartProps {
  data: Record<TradeSetup, SetupAccuracy>;
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; accuracy: number; total: number; won: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-border rounded-lg shadow-card-hover px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{d.name}</p>
      <p className="text-muted-foreground">
        Accuracy:{" "}
        <span className="text-foreground font-medium">{d.accuracy.toFixed(1)}%</span>
      </p>
      <p className="text-muted-foreground">
        Trades: <span className="text-foreground font-medium">{d.total}</span>
      </p>
      <p className="text-muted-foreground">
        Won: <span className="text-profit font-medium">{d.won}</span>
      </p>
    </div>
  );
}

function getBarColor(accuracy: number): string {
  if (accuracy >= 70) return "#10B981"; // profit
  if (accuracy >= 50) return "#F59E0B"; // amber
  if (accuracy >= 30) return "#F97316"; // orange
  return "#EF4444"; // loss
}

export function AccuracyChart({ data }: AccuracyChartProps) {
  const chartData = (Object.entries(data) as [TradeSetup, SetupAccuracy][])
    .filter(([, v]) => v.total > 0)
    .map(([setup, v]) => ({
      setup,
      name: TRADE_SETUP_LABELS[setup],
      accuracy: v.accuracy ?? 0,
      total: v.total,
      won: v.won,
    }))
    .sort((a, b) => b.total - a.total);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No closed trades yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
        barCategoryGap="25%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#E2E8F0"
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F1F5F9" }} />
        <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.setup} fill={getBarColor(entry.accuracy)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
