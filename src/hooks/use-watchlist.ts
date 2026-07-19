"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useWatchlistStore } from "@/store/watchlist-store";
import { isPredefinedIndex, getIndexStocks, getIndexMeta } from "@/data/indices/index";
import type { IndexStock } from "@/types";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface WatchlistStock {
  id?: string;
  symbol: string;
  companyName?: string;
  sector?: string;
  marketCap?: number; // in Cr. from CSV static data
  position: number;
}

export interface WatchlistData {
  id: string;
  name: string;
  type: "predefined" | "custom";
  stocks: WatchlistStock[];
}

// ─── READ: useWatchlist ───────────────────────────────────────────────────────
// Predefined → static file (instant). Custom → Zustand store (instant after boot).

export function useWatchlist(id: string) {
  const { customWatchlists, isLoaded } = useWatchlistStore();

  if (isPredefinedIndex(id)) {
    const stocks = getIndexStocks(id);
    const meta = getIndexMeta(id);
    const data: WatchlistData = {
      id,
      name: meta?.name ?? id,
      type: "predefined",
      stocks: stocks.map((s: IndexStock, i: number) => ({
        symbol: s.symbol,
        companyName: s.companyName,
        sector: s.sector,
        marketCap: s.marketCap,  // CSV fallback shown before live prices load
        position: i,
      })),
    };
    return { data, isLoading: false, error: null };
  }

  const wl = customWatchlists.find((w) => w.id === id);
  return {
    data: wl
      ? ({ id: wl.id, name: wl.name, type: "custom" as const, stocks: wl.stocks } as WatchlistData)
      : null,
    isLoading: !isLoaded,
    error: null,
  };
}

// ─── READ: useCustomWatchlists ────────────────────────────────────────────────

export function useCustomWatchlists() {
  const { customWatchlists, isLoaded } = useWatchlistStore();
  return { data: customWatchlists, isLoading: !isLoaded };
}

// ─── ADD STOCK ────────────────────────────────────────────────────────────────

export function useAddStock(watchlistId: string) {
  const { addStock, replaceStock, removeStock } = useWatchlistStore();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (symbol: string) => {
      setIsPending(true);
      const tempId = `temp_${Date.now()}`;
      const tempStock: WatchlistStock = { id: tempId, symbol: symbol.toUpperCase(), position: 9999 };
      addStock(watchlistId, tempStock);

      try {
        const res = await fetch(`/api/watchlists/${watchlistId}/stocks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to add stock");
        replaceStock(watchlistId, tempId, json.data);
        return json.data as WatchlistStock;
      } catch (err) {
        removeStock(watchlistId, tempId);
        toast.error(err instanceof Error ? err.message : "Failed to add stock");
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [watchlistId, addStock, replaceStock, removeStock]
  );

  return { mutateAsync, isPending };
}

// ─── REMOVE STOCK ─────────────────────────────────────────────────────────────

export function useRemoveStock(watchlistId: string) {
  const { removeStock, addStock, customWatchlists } = useWatchlistStore();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (stockId: string) => {
      // Capture rollback
      const wl = customWatchlists.find((w) => w.id === watchlistId);
      const rollback = wl?.stocks.find((s) => s.id === stockId);

      removeStock(watchlistId, stockId);

      setIsPending(true);
      try {
        const res = await fetch(`/api/watchlists/${watchlistId}/stocks/${stockId}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      } catch (err) {
        if (rollback) addStock(watchlistId, rollback);
        toast.error("Failed to remove stock");
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [watchlistId, removeStock, addStock, customWatchlists]
  );

  return { mutateAsync, isPending };
}

// ─── REORDER ──────────────────────────────────────────────────────────────────

export function useReorderStocks(watchlistId: string) {
  const { reorderStocks, customWatchlists } = useWatchlistStore();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (newStocks: WatchlistStock[]) => {
      // Capture rollback
      const rollback = customWatchlists.find((w) => w.id === watchlistId)?.stocks ?? [];

      reorderStocks(watchlistId, newStocks);

      setIsPending(true);
      try {
        const order = newStocks.map((s, i) => ({ id: s.id!, position: i }));
        const res = await fetch(`/api/watchlists/${watchlistId}/reorder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      } catch {
        reorderStocks(watchlistId, rollback);
        toast.error("Failed to save order");
      } finally {
        setIsPending(false);
      }
    },
    [watchlistId, reorderStocks, customWatchlists]
  );

  return { mutateAsync, isPending };
}

// ─── CREATE WATCHLIST ─────────────────────────────────────────────────────────

export function useCreateWatchlist() {
  const { addWatchlist } = useWatchlistStore();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (name: string) => {
      setIsPending(true);
      try {
        const res = await fetch("/api/watchlists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
        addWatchlist({ ...json.data, stocks: [] });
        toast.success(`Watchlist "${name}" created!`);
        return json.data;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create watchlist");
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [addWatchlist]
  );

  return { mutateAsync, isPending };
}

// ─── DELETE WATCHLIST ─────────────────────────────────────────────────────────

export function useDeleteWatchlist() {
  const { removeWatchlist } = useWatchlistStore();

  const mutateAsync = useCallback(
    async (id: string) => {
      removeWatchlist(id);
      try {
        const res = await fetch(`/api/watchlists/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
        toast.success("Watchlist deleted");
      } catch (err) {
        toast.error("Failed to delete watchlist");
        throw err;
      }
    },
    [removeWatchlist]
  );

  return { mutateAsync };
}