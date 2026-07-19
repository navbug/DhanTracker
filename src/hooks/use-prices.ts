"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { isMarketOpen } from "@/lib/utils";
import { usePriceStore } from "@/store/price-store";
import type { StockPrice } from "@/types";

const POLL_INTERVAL_MS = 15 * 60 * 1000;
export const PRICES_QUERY_KEY = "prices-refresh" as const;

// ─── usePrices ────────────────────────────────────────────────────────────────
// Reads from Zustand — zero network call. Updated by boot fetch and poller.

export function usePrices(
  symbols: string[],
  _options: { enabled?: boolean } = {}
): { data: Record<string, StockPrice>; isLoading: boolean; isFetching: boolean } {
  const { prices, isLoaded } = usePriceStore();

  const data = useMemo(() => {
    const result: Record<string, StockPrice> = {};
    for (const sym of symbols) {
      const upper = sym.toUpperCase();
      if (prices[upper]) result[upper] = prices[upper];
    }
    return result;
  }, [prices, symbols]);

  return { data, isLoading: !isLoaded, isFetching: false };
}

// ─── usePricePoller ───────────────────────────────────────────────────────────
// Mounted ONCE in AppBootstrap.
// Does NOT fetch on mount — boot already loaded prices from server cache.
// Only fires on the 15-min interval to get fresh NSE data.

export function usePricePoller() {
  const marketOpen = isMarketOpen();

  useQuery({
    queryKey: [PRICES_QUERY_KEY],
    queryFn: async () => {
      // Hits NSE directly — only called every 15min or on manual refresh
      const res = await fetch("/api/prices/refresh", { method: "POST" });
      if (!res.ok) throw new Error("Failed to refresh prices");
      const json = await res.json();
      const incoming = json.data as Record<string, StockPrice>;
      if (Object.keys(incoming).length === 0) throw new Error("Empty response");

      const state = usePriceStore.getState();
      if (!state.isLoaded) {
        state.setPrices(incoming);
      } else {
        state.mergePrices(incoming);
      }
      return incoming;
    },
    enabled: true,
    staleTime: POLL_INTERVAL_MS,
    refetchInterval: marketOpen ? POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,  // boot fetch (via AppBootstrap) already populated Zustand
    retry: 3,
    retryDelay: 5000,
  });
}

// ─── useRefreshPrices — manual Refresh button ─────────────────────────────────

export function useRefreshPrices() {
  const qc = useQueryClient();
  return () => qc.refetchQueries({ queryKey: [PRICES_QUERY_KEY] });
}

// ─── useExtraStockPrices ──────────────────────────────────────────────────────
// For custom watchlist stocks NOT in Nifty 500.

import { isInNifty500 } from "@/data/indices/index";

export function useExtraStockPrices(symbols: string[]) {
  const { prices } = usePriceStore();

  const missing = symbols.filter(
    (s) => !prices[s.toUpperCase()] && !isInNifty500(s)
  );

  return useQuery({
    queryKey: ["extra-prices", missing.slice().sort().join(",")],
    queryFn: async () => {
      if (missing.length === 0) return {} as Record<string, StockPrice>;
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: missing }),
      });
      if (!res.ok) throw new Error("Failed to fetch extra prices");
      const json = await res.json();
      return json.data as Record<string, StockPrice>;
    },
    enabled: missing.length > 0,
    staleTime: POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });
}