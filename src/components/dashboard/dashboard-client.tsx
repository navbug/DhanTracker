"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  AlertCircle,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { useAnalytics, useTrades } from "@/hooks/use-trades";
import { StatCard } from "@/components/dashboard/stat-card";
import { RecentTradesTable } from "@/components/dashboard/recent-trades-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import type { TradeSetup } from "@/types";

// Heavy Recharts components — lazy loaded so they don't block initial paint
const AccuracyChart = dynamic(
  () => import("@/components/dashboard/accuracy-chart").then((m) => ({ default: m.AccuracyChart })),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> }
);
const PnLChart = dynamic(
  () => import("@/components/dashboard/pnl-chart").then((m) => ({ default: m.PnLChart })),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> }
);

// ─── COMPONENT ───────────────────────────────────────────────────────────────

interface DashboardClientProps {
  userName: string;
}

export function DashboardClient({ userName }: DashboardClientProps) {
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics();
  const { data: allTrades = [] } = useTrades({});

  // ── Greet with time-of-day ────────────────────────────────────────────────
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = userName.split(" ")[0];

  // ── Setup performance table ────────────────────────────────────────────────
  const setupTable = useMemo(() => {
    if (!analytics) return [];
    return (Object.entries(analytics.accuracyBySetup) as [TradeSetup, { total: number; won: number; accuracy: number | null }][])
      .filter(([, v]) => v.total > 0)
      .sort((a, b) => (b[1].accuracy ?? 0) - (a[1].accuracy ?? 0));
  }, [analytics]);

  // ── If no trades yet — onboarding state ────────────────────────────────────
  const isEmpty = !analyticsLoading && analytics?.totalTrades === 0;

  if (analyticsLoading) {
    return <DashboardSkeleton userName={firstName} greeting={greeting} />;
  }

  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-auto">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isEmpty
              ? "Start logging your trades to see analytics"
              : `${analytics?.totalTrades} trades total · ${analytics?.openTrades} open`}
          </p>
        </div>
        {!isEmpty && (
          <a href="/trade-ledger">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
              <ExternalLink className="size-3" />
              View Ledger
            </Button>
          </a>
        )}
      </div>

      {/* ── Empty / onboarding ── */}
      {isEmpty && <OnboardingCard />}

      {/* ── Stat cards ── */}
      {!isEmpty && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Trades"
            value={String(analytics!.totalTrades)}
            subtext={`${analytics!.openTrades} open`}
            icon={BookOpen}
            color="primary"
          />
          <StatCard
            label="Overall Accuracy"
            value={
              analytics!.overallAccuracy > 0
                ? `${analytics!.overallAccuracy}%`
                : "—"
            }
            subtext={
              analytics!.wonTrades > 0
                ? `${analytics!.wonTrades}W / ${analytics!.lostTrades}L`
                : "No closed trades"
            }
            icon={Target}
            color={
              analytics!.overallAccuracy >= 60
                ? "profit"
                : analytics!.overallAccuracy > 0
                ? "default"
                : "default"
            }
            trend={analytics!.overallAccuracy >= 50 ? "up" : analytics!.overallAccuracy > 0 ? "down" : undefined}
          />
          <StatCard
            label="Net P&L"
            value={
              analytics!.netPnl !== 0
                ? `${analytics!.netPnl >= 0 ? "+" : ""}${formatCurrency(analytics!.netPnl, true)}`
                : "₹0"
            }
            subtext="Closed trades only"
            icon={analytics!.netPnl >= 0 ? TrendingUp : TrendingDown}
            color={
              analytics!.netPnl > 0 ? "profit" : analytics!.netPnl < 0 ? "loss" : "default"
            }
            trend={analytics!.netPnl >= 0 ? "up" : "down"}
          />
          <StatCard
            label="Best Trade"
            value={
              analytics!.bestTrade > 0
                ? `+${formatCurrency(analytics!.bestTrade, true)}`
                : "—"
            }
            subtext={
              analytics!.topWinner
                ? analytics!.topWinner.stock
                : undefined
            }
            icon={BarChart3}
            color={analytics!.bestTrade > 0 ? "profit" : "default"}
          />
        </div>
      )}

      {/* ── Charts row ── */}
      {!isEmpty && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Accuracy by setup */}
          <div className="rounded-xl border border-border bg-white p-4 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Accuracy by Setup</h2>
              {analytics!.overallAccuracy > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {analytics!.overallAccuracy}% overall
                </Badge>
              )}
            </div>
            <AccuracyChart data={analytics!.accuracyBySetup} />
          </div>

          {/* Cumulative P&L chart */}
          <div className="rounded-xl border border-border bg-white p-4 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Cumulative P&L</h2>
              {analytics!.netPnl !== 0 && (
                <span
                  className={cn(
                    "text-xs font-semibold num",
                    analytics!.netPnl >= 0 ? "text-profit" : "text-loss"
                  )}
                >
                  {analytics!.netPnl >= 0 ? "+" : ""}
                  {formatCurrency(analytics!.netPnl, true)}
                </span>
              )}
            </div>
            <PnLChart trades={allTrades} />
          </div>
        </div>
      )}

      {/* ── Bottom row: Setup table + Recent trades ── */}
      {!isEmpty && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Setup performance table */}
          {setupTable.length > 0 && (
            <div className="rounded-xl border border-border bg-white p-4 shadow-card">
              <h2 className="text-sm font-semibold text-foreground mb-3">Setup Performance</h2>
              <div className="flex flex-col gap-1">
                <div className="grid grid-cols-4 gap-2 px-1 py-1.5 border-b border-border">
                  {["Setup", "Trades", "Won", "Accuracy"].map((h) => (
                    <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {h}
                    </span>
                  ))}
                </div>
                {setupTable.map(([setup, stats]) => (
                  <div
                    key={setup}
                    className="grid grid-cols-4 gap-2 px-1 py-2 border-b border-border/40 hover:bg-muted/20 transition-colors"
                  >
                    <span className="text-xs font-medium text-foreground">{setup.replace("_", " ")}</span>
                    <span className="text-xs text-muted-foreground num">{stats.total}</span>
                    <span className="text-xs text-profit num">{stats.won}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            (stats.accuracy ?? 0) >= 60 ? "bg-profit" :
                            (stats.accuracy ?? 0) >= 40 ? "bg-amber-400" : "bg-loss"
                          )}
                          style={{ width: `${stats.accuracy ?? 0}%` }}
                        />
                      </div>
                      <span className={cn(
                        "text-xs font-semibold num w-8 text-right",
                        (stats.accuracy ?? 0) >= 60 ? "text-profit" :
                        (stats.accuracy ?? 0) >= 40 ? "text-amber-500" : "text-loss"
                      )}>
                        {stats.accuracy?.toFixed(0) ?? 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent trades */}
          <div className="rounded-xl border border-border bg-white p-4 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Recent Trades</h2>
              <a href="/trade-ledger" className="text-xs text-primary hover:underline">
                View all →
              </a>
            </div>
            <RecentTradesTable trades={analytics?.recentTrades ?? []} />
          </div>
        </div>
      )}

      {/* ── Best / Worst trade highlight ── */}
      {!isEmpty && (analytics!.topWinner || analytics!.topLoser) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {analytics!.topWinner && analytics!.topWinner.pnl > 0 && (
            <div className="rounded-xl border border-profit/20 bg-profit/5 p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="size-4 text-profit" />
                <span className="text-xs font-semibold text-profit uppercase tracking-wide">Best Trade</span>
              </div>
              <p className="text-lg font-display font-bold text-profit num">
                +{formatCurrency(analytics!.topWinner.pnl, true)}
              </p>
              <p className="text-xs text-muted-foreground">
                {analytics!.topWinner.stock} · {analytics!.topWinner.setup?.replace("_", " ")}
              </p>
            </div>
          )}
          {analytics!.topLoser && analytics!.topLoser.pnl < 0 && (
            <div className="rounded-xl border border-loss/20 bg-loss/5 p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="size-4 text-loss" />
                <span className="text-xs font-semibold text-loss uppercase tracking-wide">Worst Trade</span>
              </div>
              <p className="text-lg font-display font-bold text-loss num">
                {formatCurrency(analytics!.topLoser.pnl, true)}
              </p>
              <p className="text-xs text-muted-foreground">
                {analytics!.topLoser.stock} · {analytics!.topLoser.setup?.replace("_", " ")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── LOADING SKELETON ─────────────────────────────────────────────────────────

function DashboardSkeleton({ userName, greeting }: { userName: string; greeting: string }) {
  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <h1 className="text-xl font-display font-bold text-foreground">
          {greeting}, {userName} 👋
        </h1>
        <Skeleton className="h-3 w-40 mt-2" />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-xl border border-border bg-white p-5">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="rounded-xl border border-border bg-white p-4 h-72">
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ONBOARDING CARD ──────────────────────────────────────────────────────────

function OnboardingCard() {
  return (
    <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-8">
      <div className="flex flex-col items-center text-center gap-3 max-w-sm mx-auto">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <BookOpen className="size-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Start your trading journal
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Log your first trade to unlock accuracy analytics, P&L tracking, and setup performance charts.
          </p>
        </div>
        <a href="/trade-ledger">
          <Button size="sm" className="gap-1.5">
            <AlertCircle className="size-3.5" />
            Go to Trade Ledger
          </Button>
        </a>
      </div>
    </div>
  );
}