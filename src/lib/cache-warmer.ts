/**
 * Cache Warmer — runs at server start via instrumentation.ts
 * Fetches all 500 Nifty stocks from Yahoo Finance in a handful of batched
 * quote() calls (Yahoo accepts many symbols per call, unlike NSE which
 * needed one request per symbol), caches price + sector + marketCap in RAM.
 * Refreshes every 15 minutes. One cache shared across all users and watchlists.
 */

import { setCacheBatch, getCacheStats } from "@/lib/cache";
import { isMarketOpen } from "@/lib/utils";
import { NIFTY500_STOCKS } from "@/data/indices/index";
import { fetchPooled } from "@/lib/fetch-pool";
import { yahooFinance, toYahooSymbol, quoteToStockPrice } from "@/lib/yahoo-finance";
import type { StockPrice } from "@/types";

const INTERVAL_MS = 15 * 60 * 1000;
const CHUNK_SIZE = 100; // symbols per quote() call
const CHUNK_CONCURRENCY = 3; // concurrent quote() calls in flight

const g = globalThis as unknown as {
  cacheWarmerStarted?: boolean;
  lastWarmTime?: number;
  warmStatus?: "warming" | "warm" | "failed" | "idle";
};

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function warmNifty500(): Promise<void> {
  const startTime = Date.now();
  g.warmStatus = "warming";

  const symbols = NIFTY500_STOCKS.map((s) => s.symbol);
  const chunks = chunk(symbols, CHUNK_SIZE);
  console.log(
    `[CacheWarmer] Starting warm-up for ${symbols.length} symbols (${chunks.length} batched requests)...`
  );

  try {
    const chunkResults = await fetchPooled(
      chunks,
      async (symbolChunk) => {
        const yahooSymbols = symbolChunk.map(toYahooSymbol);
        return yahooFinance.quote(yahooSymbols, { return: "object" });
      },
      {
        concurrency: CHUNK_CONCURRENCY,
        onProgress: (completed, total) => {
          console.log(
            `[CacheWarmer] ${completed}/${total} batches fetched (${Math.min(
              completed * CHUNK_SIZE,
              symbols.length
            )}/${symbols.length} symbols)`
          );
        },
      }
    );

    const prices: StockPrice[] = [];

    chunkResults.forEach((result, chunkIndex) => {
      if (result.status !== "fulfilled") return;
      const symbolChunk = chunks[chunkIndex];
      const quotesBySymbol = result.value;

      for (const symbol of symbolChunk) {
        const quote = quotesBySymbol[toYahooSymbol(symbol)];
        if (!quote) continue; // Yahoo had nothing for this symbol this run

        const staticEntry = NIFTY500_STOCKS.find((s) => s.symbol === symbol);
        const price = quoteToStockPrice(
          quote,
          symbol,
          staticEntry?.sector,
          staticEntry?.companyName
        );
        if (price) prices.push(price);
      }
    });

    if (prices.length > 0) {
      setCacheBatch(prices);
      g.lastWarmTime = Date.now();
      g.warmStatus = "warm";
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[CacheWarmer] Done. ${prices.length}/${symbols.length} symbols cached in ${elapsed}s.`
      );
    } else {
      g.warmStatus = "failed";
      console.error("[CacheWarmer] 0 prices returned — will retry in 15min.");
    }
  } catch (err) {
    g.warmStatus = "failed";
    console.error("[CacheWarmer] Error:", err);
  }
}

async function refresh(): Promise<void> {
  if (!isMarketOpen() && g.warmStatus === "warm" && g.lastWarmTime) {
    if ((Date.now() - g.lastWarmTime) / 60000 < 120) {
      console.log("[CacheWarmer] Market closed, cache fresh — skipping refresh.");
      return;
    }
  }
  await warmNifty500();
}

export function startCacheWarmer(): void {
  if (g.cacheWarmerStarted) return;
  g.cacheWarmerStarted = true;
  g.warmStatus = "idle";

  warmNifty500().catch((err) => console.error("[CacheWarmer] Initial warm failed:", err));

  setInterval(() => {
    refresh().catch((err) => console.error("[CacheWarmer] Refresh failed:", err));
  }, INTERVAL_MS);

  console.log("[CacheWarmer] Scheduler active — 15min interval.");
}

export function getCacheWarmerStatus() {
  return {
    status: g.warmStatus ?? "not_started",
    lastWarmTime: g.lastWarmTime ?? null,
    cacheSize: getCacheStats().size,
  };
}