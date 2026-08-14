"use client";

import { useEffect, useRef } from "react";
import { useTradeStore } from "@/store/trade-store";
import { useWatchlistStore } from "@/store/watchlist-store";
import { useResearchStore } from "@/store/research-store";
import { usePriceStore } from "@/store/price-store";
import { useNotesStore } from "@/store/notes-store";
import { usePricePoller } from "@/hooks/use-prices";
import type { Trade, StockPrice } from "@/types";
import type { ResearchBoard } from "@/hooks/use-research";

// ─── APP BOOTSTRAP ────────────────────────────────────────────────────────────
// Mounted ONLY inside the authenticated dashboard layout.
// Fires all boot fetches in parallel once per session. Safe to call repeatedly
// because hasFetched guards against double-firing on HMR or StrictMode.

export function AppBootstrap() {
  const hasFetched = useRef(false);
  const { setTrades }           = useTradeStore();
  const { setCustomWatchlists } = useWatchlistStore();
  const { setBoards }           = useResearchStore();
  const { setPrices }           = usePriceStore();
  const { setNotes }            = useNotesStore();

  // Price poller — only polls every 15min, never on mount
  usePricePoller();

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function boot() {
      const [tradesRes, watchlistsRes, researchRes, pricesRes, notesRes] =
        await Promise.allSettled([
          fetch("/api/trades?limit=500").then((r) => r.json()),
          fetch("/api/watchlists?full=true").then((r) => r.json()),
          fetch("/api/research").then((r) => r.json()),
          fetch("/api/prices/all").then((r) => r.json()),
          fetch("/api/stock-notes").then((r) => r.json()),
        ]);

      if (tradesRes.status === "fulfilled" && tradesRes.value?.success) {
        setTrades(tradesRes.value.data as Trade[]);
      } else {
        setTrades([]);
      }

      if (watchlistsRes.status === "fulfilled" && watchlistsRes.value?.success) {
        setCustomWatchlists(watchlistsRes.value.data ?? []);
      } else {
        setCustomWatchlists([]);
      }

      if (researchRes.status === "fulfilled" && researchRes.value?.success) {
        setBoards(researchRes.value.data as ResearchBoard[]);
      } else {
        setBoards([]);
      }

      if (pricesRes.status === "fulfilled" && pricesRes.value?.success) {
        const data = pricesRes.value.data as Record<string, StockPrice>;
        // Always mark prices as loaded — even empty (cache still warming)
        setPrices(Object.keys(data).length > 0 ? data : {});
      } else {
        setPrices({});
      }

      if (notesRes.status === "fulfilled" && notesRes.value?.success) {
        setNotes(notesRes.value.data as Record<string, string>);
      } else {
        setNotes({});
      }
    }

    boot().catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}