import { create } from "zustand";
import type { Trade, TradeSetup } from "@/types";

// ─── COMPUTED ANALYTICS ───────────────────────────────────────────────────────

const ALL_SETUPS: TradeSetup[] = ["QUICK_TRADE", "HIT", "DIT", "WIT", "MIT", "QIT", "HVIT", "YIT"];
const WON_OUTCOMES = ["TARGET_HIT", "PARTIAL_PROFIT", "BREAKEVEN", "MANUAL_EXIT"];

export interface TradeAnalytics {
  totalTrades: number;
  openTrades: number;
  wonTrades: number;
  lostTrades: number;
  overallAccuracy: number;
  netPnl: number;
  bestTrade: number;
  worstTrade: number;
  accuracyBySetup: Record<TradeSetup, { total: number; won: number; accuracy: number | null }>;
  recentTrades: Array<{ stock: string; outcome: Trade["outcome"]; tradeSetup: TradeSetup; pnl: number | null; date: string }>;
  topWinner: { stock: string; pnl: number; setup: TradeSetup } | null;
  topLoser: { stock: string; pnl: number; setup: TradeSetup } | null;
}

function computeAnalytics(trades: Trade[]): TradeAnalytics {
  if (trades.length === 0) {
    return {
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
      ) as TradeAnalytics["accuracyBySetup"],
      recentTrades: [],
      topWinner: null,
      topLoser: null,
    };
  }

  const sorted = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const closed = sorted.filter((t) => t.outcome !== "OPEN");
  const won = closed.filter((t) => WON_OUTCOMES.includes(t.outcome) && (t.pnl ?? 0) > 0);
  const lost = closed.filter((t) => t.outcome === "SL_HIT" || (t.pnl ?? 0) < 0);

  const netPnl = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const pnls = closed.map((t) => t.pnl ?? 0);
  const bestTrade = pnls.length ? Math.max(...pnls) : 0;
  const worstTrade = pnls.length ? Math.min(...pnls) : 0;

  const overallAccuracy =
    closed.length > 0
      ? Math.round((won.length / closed.length) * 100 * 10) / 10
      : 0;

  const accuracyBySetup = Object.fromEntries(
    ALL_SETUPS.map((setup) => {
      const setupTrades = closed.filter((t) => t.tradeSetup === setup);
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
  ) as TradeAnalytics["accuracyBySetup"];

  const withPnl = closed.filter((t) => t.pnl != null);
  const topWinner = withPnl.reduce<Trade | null>(
    (best, t) => (!best || (t.pnl ?? 0) > (best.pnl ?? 0) ? t : best),
    null
  );
  const topLoser = withPnl.reduce<Trade | null>(
    (worst, t) => (!worst || (t.pnl ?? 0) < (worst.pnl ?? 0) ? t : worst),
    null
  );

  return {
    totalTrades: trades.length,
    openTrades: trades.filter((t) => t.outcome === "OPEN").length,
    wonTrades: won.length,
    lostTrades: lost.length,
    overallAccuracy,
    netPnl,
    bestTrade,
    worstTrade,
    accuracyBySetup,
    recentTrades: sorted.slice(0, 5).map((t) => ({
      stock: t.stock,
      outcome: t.outcome,
      tradeSetup: t.tradeSetup,
      pnl: t.pnl ?? null,
      date: t.date,
    })),
    topWinner: topWinner
      ? { stock: topWinner.stock, pnl: topWinner.pnl!, setup: topWinner.tradeSetup }
      : null,
    topLoser: topLoser
      ? { stock: topLoser.stock, pnl: topLoser.pnl!, setup: topLoser.tradeSetup }
      : null,
  };
}

// ─── STORE ────────────────────────────────────────────────────────────────────

interface TradeStore {
  trades: Trade[];
  isLoaded: boolean;

  // Boot
  setTrades: (trades: Trade[]) => void;

  // Analytics — computed, not fetched
  getAnalytics: () => TradeAnalytics;

  // CRUD — instant Zustand update, API fired in background by hooks
  addTrade: (trade: Trade) => void;
  replaceTrade: (tempId: string, real: Trade) => void; // swap temp ID after create
  updateTrade: (id: string, updates: Partial<Trade>) => void;
  removeTrade: (id: string) => void;
}

export const useTradeStore = create<TradeStore>((set, get) => ({
  trades: [],
  isLoaded: false,

  setTrades: (trades) => set({ trades, isLoaded: true }),

  getAnalytics: () => computeAnalytics(get().trades),

  addTrade: (trade) =>
    set((s) => ({ trades: [trade, ...s.trades] })),

  replaceTrade: (tempId, real) =>
    set((s) => ({
      trades: s.trades.map((t) => (t.id === tempId ? real : t)),
    })),

  updateTrade: (id, updates) =>
    set((s) => ({
      trades: s.trades.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  removeTrade: (id) =>
    set((s) => ({ trades: s.trades.filter((t) => t.id !== id) })),
}));
