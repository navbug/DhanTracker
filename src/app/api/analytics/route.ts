import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { TradeSetup } from "@/types";

const ALL_SETUPS: TradeSetup[] = ["QUICK_TRADE", "HIT", "DIT", "WIT", "MIT", "QIT", "HVIT", "YIT"];
const WON_OUTCOMES = ["TARGET_HIT", "PARTIAL_PROFIT", "BREAKEVEN", "MANUAL_EXIT"];

/**
 * GET /api/analytics
 * Returns all dashboard stats. Computed server-side for accuracy.
 */
export async function GET() {
  try {
    const user = await requireAuth();

    // Single query to get all trades
    const trades = await db.trade.findMany({
      where: { userId: user.id },
      select: {
        outcome: true,
        pnl: true,
        tradeSetup: true,
        stock: true,
        date: true,
        entry: true,
        target: true,
        qty: true,
      },
      orderBy: { date: "desc" },
    });

    if (trades.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalTrades: 0,
          openTrades: 0,
          wonTrades: 0,
          lostTrades: 0,
          overallAccuracy: 0,
          netPnl: 0,
          bestTrade: 0,
          worstTrade: 0,
          accuracyBySetup: Object.fromEntries(
            ALL_SETUPS.map((s) => [s, { total: 0, won: 0, accuracy: null }])
          ),
          recentTrades: [],
          topWinner: null,
          topLoser: null,
        },
      });
    }

    // ── Compute stats ──
    const closedTrades = trades.filter((t) => t.outcome !== "OPEN");
    const openTrades = trades.filter((t) => t.outcome === "OPEN");
    const wonTrades = trades.filter(
      (t) => WON_OUTCOMES.includes(t.outcome) && (t.pnl ?? 0) > 0
    );
    const lostTrades = trades.filter(
      (t) => t.outcome === "SL_HIT" || (t.pnl ?? 0) < 0
    );

    const netPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const pnlValues = closedTrades.map((t) => t.pnl ?? 0);
    const bestTrade = pnlValues.length ? Math.max(...pnlValues) : 0;
    const worstTrade = pnlValues.length ? Math.min(...pnlValues) : 0;

    const overallAccuracy =
      closedTrades.length > 0
        ? Math.round((wonTrades.length / closedTrades.length) * 100 * 10) / 10
        : 0;

    // ── Accuracy by setup ──
    const accuracyBySetup = Object.fromEntries(
      ALL_SETUPS.map((setup) => {
        const setupTrades = closedTrades.filter((t) => t.tradeSetup === setup);
        const setupWon = setupTrades.filter(
          (t) => WON_OUTCOMES.includes(t.outcome) && (t.pnl ?? 0) > 0
        );
        return [
          setup,
          {
            total: setupTrades.length,
            won: setupWon.length,
            accuracy:
              setupTrades.length > 0
                ? Math.round((setupWon.length / setupTrades.length) * 100 * 10) / 10
                : null,
          },
        ];
      })
    );

    // ── Top winner / loser ──
    const withPnl = closedTrades.filter((t) => t.pnl != null);
    const topWinner = withPnl.reduce<(typeof withPnl)[0] | null>(
      (best, t) => (!best || (t.pnl ?? 0) > (best.pnl ?? 0) ? t : best),
      null
    );
    const topLoser = withPnl.reduce<(typeof withPnl)[0] | null>(
      (worst, t) => (!worst || (t.pnl ?? 0) < (worst.pnl ?? 0) ? t : worst),
      null
    );

    return NextResponse.json({
      success: true,
      data: {
        totalTrades: trades.length,
        openTrades: openTrades.length,
        wonTrades: wonTrades.length,
        lostTrades: lostTrades.length,
        overallAccuracy,
        netPnl,
        bestTrade,
        worstTrade,
        accuracyBySetup,
        recentTrades: trades.slice(0, 5).map((t) => ({
          stock: t.stock,
          outcome: t.outcome,
          tradeSetup: t.tradeSetup,
          pnl: t.pnl,
          date: t.date.toISOString(),
        })),
        topWinner: topWinner
          ? { stock: topWinner.stock, pnl: topWinner.pnl, setup: topWinner.tradeSetup }
          : null,
        topLoser: topLoser
          ? { stock: topLoser.stock, pnl: topLoser.pnl, setup: topLoser.tradeSetup }
          : null,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}
