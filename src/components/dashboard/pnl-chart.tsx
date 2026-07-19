"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";

interface PnLDataPoint {
  date: string;
  cumPnl: number;
  tradePnl: number;
  stock: string;
}

interface PnLChartProps {
  trades: Array<{
    date: string;
    pnl: number | null;
    stock: string;
    outcome: string;
  }>;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PnLDataPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const positive = d.tradePnl >= 0;
  return (
    <div className="bg-white border border-border rounded-lg shadow-card-hover px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-1">{format(new Date(d.date), "dd MMM yyyy")}</p>
      <p className="text-foreground font-medium">{d.stock}</p>
      <p className={positive ? "text-profit" : "text-loss"}>
        Trade: {positive ? "+" : ""}₹{Math.abs(d.tradePnl).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </p>
      <p className="text-muted-foreground">
        Cumulative:{" "}
        <span className={d.cumPnl >= 0 ? "text-profit" : "text-loss"}>
          {d.cumPnl >= 0 ? "+" : ""}₹{Math.abs(d.cumPnl).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      </p>
    </div>
  );
}

export function PnLChart({ trades }: PnLChartProps) {
  // Build cumulative P&L data
  const closed = trades
    .filter((t) => t.outcome !== "OPEN" && t.pnl != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (closed.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No closed trades yet
      </div>
    );
  }

  let cumulative = 0;
  const chartData: PnLDataPoint[] = closed.map((t) => {
    cumulative += t.pnl!;
    return {
      date: t.date,
      cumPnl: Math.round(cumulative * 100) / 100,
      tradePnl: t.pnl!,
      stock: t.stock,
    };
  });

  const maxAbs = Math.max(...chartData.map((d) => Math.abs(d.cumPnl)));
  const domain = [-maxAbs * 1.15, maxAbs * 1.15];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart
        data={chartData}
        margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#E2E8F0"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => format(new Date(v), "dd MMM")}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={domain}
          tick={{ fontSize: 10, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => {
            const abs = Math.abs(v);
            if (abs >= 100000) return `${(v / 100000).toFixed(1)}L`;
            if (abs >= 1000) return `${(v / 1000).toFixed(0)}K`;
            return v;
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="#E2E8F0" strokeWidth={1.5} />
        <Line
          type="monotone"
          dataKey="cumPnl"
          stroke={chartData[chartData.length - 1]?.cumPnl >= 0 ? "#10B981" : "#EF4444"}
          strokeWidth={2}
          dot={closed.length < 30 ? { r: 3, fill: "white", strokeWidth: 2 } : false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
