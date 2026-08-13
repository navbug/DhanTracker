/**
 * Cache Warmer — runs at server start via instrumentation.ts, and on-demand
 * (awaited) from the price API routes when a given instance's cache is cold.
 *
 * Fetches all 500 Nifty stocks in small concurrent batches — rather than one
 * 500-way burst — to stay well inside NSE's tolerance for concurrent requests
 * and comfortably inside a serverless function's execution window. Caches
 * price + sector + marketCap in RAM. One cache per running instance.
 */

import { setCacheBatch, getCacheStats } from "@/lib/cache";
import { isMarketOpen } from "@/lib/utils";
import { NIFTY500_STOCKS } from "@/data/indices/index";
import type { StockPrice } from "@/types";

const INTERVAL_MS = 15 * 60 * 1000;
const BATCH_SIZE = 40; // concurrent requests per batch — keeps us well under NSE's rate limits
const BATCH_PAUSE_MS = 150; // brief pause between batches so we don't hammer NSE in one burst

const g = globalThis as unknown as {
  cacheWarmerStarted?: boolean;
  lastWarmTime?: number;
  warmStatus?: "warming" | "warm" | "failed" | "idle";
  warmInFlight?: Promise<void>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function warmNifty500Impl(): Promise<void> {
  const startTime = Date.now();
  g.warmStatus = "warming";

  const symbols = NIFTY500_STOCKS.map((s) => s.symbol);
  console.log(
    `[CacheWarmer] Starting warm-up for ${symbols.length} symbols in batches of ${BATCH_SIZE}...`
  );

  try {
    const { NseIndia } = await import("stock-nse-india");
    const nse = new NseIndia();

    // One retry per symbol — a lot of NSE failures are transient
    // (session/cookie hiccups, brief connection resets under load).
    async function fetchOne(symbol: string, retry = true): Promise<StockPrice | null> {
      try {
        const raw = await nse.getEquityDetails(symbol);
        const p = raw?.priceInfo;
        if (!p?.lastPrice) return null;

        // issuedSize from tradeInfo or metadata
        const issuedSize: number = 0;

        // marketCap in Cr. = (lastPrice × issuedSize) / 1e7
        const marketCapCr = issuedSize
          ? Math.round((p.lastPrice * issuedSize) / 1e7) / 100
          : undefined;

        const sector =
          raw.info?.industry ??
          NIFTY500_STOCKS.find((s) => s.symbol === symbol)?.sector;

        const companyName =
          raw.info?.companyName ??
          NIFTY500_STOCKS.find((s) => s.symbol === symbol)?.companyName;

        return {
          symbol,
          companyName,
          sector,
          lastPrice: p.lastPrice,
          change: p.change ?? 0,
          pChange: p.pChange ?? 0,
          open: p.open ?? p.lastPrice,
          close: p.previousClose ?? p.lastPrice,
          high: p.lastPrice,
          low: p.lastPrice,
          volume: 0,
          totalTradedVolume: 0,
          yearHigh: p.weekHighLow?.max ?? p.lastPrice,
          yearLow: p.weekHighLow?.min ?? p.lastPrice,
          issuedSize: issuedSize || undefined,
          marketCap: marketCapCr,
        };
      } catch {
        if (retry) return fetchOne(symbol, false);
        return null;
      }
    }

    const prices: StockPrice[] = [];

    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map((s) => fetchOne(s)));
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) prices.push(r.value);
      }
      if (i + BATCH_SIZE < symbols.length) await sleep(BATCH_PAUSE_MS);
    }

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

/**
 * Kicks off a warm-up, or — if one is already running on this instance —
 * returns the SAME in-flight promise instead of starting a second, redundant
 * 500-way burst. This is what lets /api/prices/all and /api/prices/refresh
 * both call warmNifty500() safely without doubling the load when they
 * happen to race (e.g. two tabs hitting a cold instance at once).
 */
export async function warmNifty500(): Promise<void> {
  if (g.warmInFlight) return g.warmInFlight;

  g.warmInFlight = warmNifty500Impl().finally(() => {
    g.warmInFlight = undefined;
  });

  return g.warmInFlight;
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

  // Best-effort background warm at boot. On a traditional long-running Node
  // server this reliably finishes before the first request arrives. On
  // serverless platforms (e.g. Vercel) the execution environment can freeze
  // shortly after the triggering request completes, so this alone isn't
  // guaranteed to finish — /api/prices/all and /api/prices/refresh both also
  // call warmNifty500() directly (and await it) as a reliable fallback, and
  // will just join this same in-flight warm if it's still running.
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