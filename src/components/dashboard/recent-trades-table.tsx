"use client";

import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { TRADE_SETUP_LABELS, TRADE_OUTCOME_LABELS, type TradeSetup, type TradeOutcome } from "@/types";

interface RecentTrade {
  stock: string;
  outcome: TradeOutcome;
  tradeSetup: TradeSetup;
  pnl: number | null;
  date: string;
}

interface RecentTradesTableProps {
  trades: RecentTrade[];
}

const OUTCOME_COLORS: Record<TradeOutcome, string> = {
  OPEN: "text-blue-600",
  TARGET_HIT: "text-profit",
  SL_HIT: "text-loss",
  PARTIAL_PROFIT: "text-teal-600",
  BREAKEVEN: "text-slate-500",
  MANUAL_EXIT: "text-violet-600",
};

export function RecentTradesTable({ trades }: RecentTradesTableProps) {
  if (trades.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        No recent trades
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="grid grid-cols-5 gap-2 px-1 py-1.5 border-b border-border">
        {["Date", "Stock", "Setup", "Outcome", "P&L"].map((h) => (
          <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {trades.map((trade, i) => {
        const pnlPositive = (trade.pnl ?? 0) >= 0;
        return (
          <div
            key={i}
            className="grid grid-cols-5 gap-2 px-1 py-2 border-b border-border/40 hover:bg-muted/30 transition-colors"
          >
            <span className="text-xs text-muted-foreground">
              {format(new Date(trade.date), "dd MMM")}
            </span>
            <span className="font-mono text-xs font-semibold text-foreground truncate">
              {trade.stock}
            </span>
            <span className="text-xs text-muted-foreground">
              {TRADE_SETUP_LABELS[trade.tradeSetup]}
            </span>
            <span className={cn("text-xs font-medium", OUTCOME_COLORS[trade.outcome])}>
              {TRADE_OUTCOME_LABELS[trade.outcome]}
            </span>
            <span
              className={cn(
                "text-xs font-semibold font-mono num",
                trade.pnl != null
                  ? pnlPositive ? "text-profit" : "text-loss"
                  : "text-muted-foreground"
              )}
            >
              {trade.pnl != null
                ? `${pnlPositive ? "+" : ""}${formatCurrency(trade.pnl, true)}`
                : "Open"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
