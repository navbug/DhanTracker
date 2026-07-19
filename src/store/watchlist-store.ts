import { create } from "zustand";
import type { WatchlistStock } from "@/hooks/use-watchlist";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface CustomWatchlist {
  id: string;
  name: string;
  type: "custom";
  stocks: WatchlistStock[];
  stockCount: number;
  createdAt: string;
}

// ─── STORE ────────────────────────────────────────────────────────────────────

interface WatchlistStore {
  customWatchlists: CustomWatchlist[];
  isLoaded: boolean;

  // Boot
  setCustomWatchlists: (wls: CustomWatchlist[]) => void;

  // Watchlist CRUD
  addWatchlist: (wl: CustomWatchlist) => void;
  renameWatchlist: (id: string, name: string) => void;
  removeWatchlist: (id: string) => void;

  // Stock CRUD within a watchlist
  addStock: (watchlistId: string, stock: WatchlistStock) => void;
  replaceStock: (watchlistId: string, tempId: string, real: WatchlistStock) => void;
  removeStock: (watchlistId: string, stockId: string) => void;
  reorderStocks: (watchlistId: string, newStocks: WatchlistStock[]) => void;
}

export const useWatchlistStore = create<WatchlistStore>((set) => ({
  customWatchlists: [],
  isLoaded: false,

  setCustomWatchlists: (customWatchlists) =>
    set({ customWatchlists, isLoaded: true }),

  addWatchlist: (wl) =>
    set((s) => ({ customWatchlists: [...s.customWatchlists, wl] })),

  renameWatchlist: (id, name) =>
    set((s) => ({
      customWatchlists: s.customWatchlists.map((wl) =>
        wl.id === id ? { ...wl, name } : wl
      ),
    })),

  removeWatchlist: (id) =>
    set((s) => ({
      customWatchlists: s.customWatchlists.filter((wl) => wl.id !== id),
    })),

  addStock: (watchlistId, stock) =>
    set((s) => ({
      customWatchlists: s.customWatchlists.map((wl) =>
        wl.id === watchlistId
          ? {
              ...wl,
              stocks: [...wl.stocks, stock],
              stockCount: wl.stockCount + 1,
            }
          : wl
      ),
    })),

  replaceStock: (watchlistId, tempId, real) =>
    set((s) => ({
      customWatchlists: s.customWatchlists.map((wl) =>
        wl.id === watchlistId
          ? {
              ...wl,
              stocks: wl.stocks.map((st) => (st.id === tempId ? real : st)),
            }
          : wl
      ),
    })),

  removeStock: (watchlistId, stockId) =>
    set((s) => ({
      customWatchlists: s.customWatchlists.map((wl) =>
        wl.id === watchlistId
          ? {
              ...wl,
              stocks: wl.stocks.filter((st) => st.id !== stockId),
              stockCount: Math.max(0, wl.stockCount - 1),
            }
          : wl
      ),
    })),

  reorderStocks: (watchlistId, newStocks) =>
    set((s) => ({
      customWatchlists: s.customWatchlists.map((wl) =>
        wl.id === watchlistId ? { ...wl, stocks: newStocks } : wl
      ),
    })),
}));