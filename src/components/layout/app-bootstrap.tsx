"use client";

import { useEffect, useRef } from "react";
import { useTradeStore } from "@/store/trade-store";
import { useWatchlistStore } from "@/store/watchlist-store";
import { useResearchStore } from "@/store/research-store";
import { usePriceStore } from "@/store/price-store";
import { useNotesStore } from "@/store/notes-store";
import { usePricePoller } from "@/hooks/use-prices";
import { NIFTY500_HEALTHY_COUNT } from "@/lib/utils";
import type { Trade, StockPrice } from "@/types";
import type { ResearchBoard } from "@/hooks/use-research";

// ─── APP BOOTSTRAP ────────────────────────────────────────────────────────────
// Mounted ONLY inside the authenticated dashboard layout.
// Fires all boot fetches in parallel once per session. Safe to call repeatedly
// because hasFetched guards against double-firing on HMR or StrictMode.

// If the boot price fetch comes back empty/thin, the server cache was cold
// and /api/prices/all kicked off a background warm-up (see that route) rather
// than blocking the boot request on it. Poll a few more times with backoff to
// pick up that data once it lands, instead of leaving the watchlist showing
// dashes until the next 15-min poll or a manual refresh click.
const PRICE_RETRY_DELAYS_MS = [4000, 8000, 15000, 25000];

export function AppBootstrap() {
  const hasFetched = useRef(false);
  const { setTrades }           = useTradeStore();
  const { setCustomWatchlists } = useWatchlistStore();
  const { setBoards }           = useResearchStore();
  const { setPrices, mergePrices } = usePriceStore();
  const { setNotes }            = useNotesStore();

  // Price poller — only polls every 15min, never on mount
  usePricePoller();

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function pollForMorePrices(attempt: number): Promise<void> {
      if (attempt >= PRICE_RETRY_DELAYS_MS.length) return;
      await new Promise((resolve) => setTimeout(resolve, PRICE_RETRY_DELAYS_MS[attempt]));

      try {
        const res = await fetch("/api/prices/all");
        const json = await res.json();
        if (json?.success) {
          const data = json.data as Record<string, StockPrice>;
          if (Object.keys(data).length > 0) mergePrices(data);
          if (Object.keys(data).length >= NIFTY500_HEALTHY_COUNT) return; // caught up
        }
      } catch {
        // ignore — just try again on the next scheduled attempt
      }

      return pollForMorePrices(attempt + 1);
    }

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

      let priceCount = 0;
      if (pricesRes.status === "fulfilled" && pricesRes.value?.success) {
        const data = pricesRes.value.data as Record<string, StockPrice>;
        priceCount = Object.keys(data).length;
        // Always mark prices as loaded — even empty (cache still warming)
        setPrices(data);
      } else {
        setPrices({});
      }

      if (notesRes.status === "fulfilled" && notesRes.value?.success) {
        setNotes(notesRes.value.data as Record<string, string>);
      } else {
        setNotes({});
      }

      // Cache was cold at boot — its warm-up is running in the background.
      // Poll for it to land instead of waiting on the next 15-min cycle.
      if (priceCount < NIFTY500_HEALTHY_COUNT) {
        pollForMorePrices(0);
      }
    }

    boot().catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}