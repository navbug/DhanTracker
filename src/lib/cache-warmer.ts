/**
 * Cache Warmer — runs at server start via instrumentation.ts, and on-demand
 * from the price API routes when a given instance's cache is cold.
 *
 * IMPORTANT — why this uses a pool of NseIndia instances instead of a big
 * batch size:
 *
 * The `stock-nse-india` library hardcodes a per-instance concurrency cap —
 * each `NseIndia` object only lets 5 requests run at once (`noOfConnections`
 * is an instance property; extra calls just poll in a sleep(500) loop until
 * a slot frees up). Firing 40, 50, or even 500 concurrent promises at a
 * SINGLE instance makes no difference — they all still funnel through that
 * same 5-wide gate. And each getEquityDetails() call does two sequential
 * requests internally (a referer "warm" page, then the quote API), so
 * warming 500 symbols through one instance realistically takes minutes —
 * far past Vercel's execution ceiling.
 *
 * The fix: since noOfConnections lives on `this`, multiple independent
 * NseIndia() instances each get their own 5-slot allowance. A pool of N
 * instances gives ~5×N real concurrent connections to NSE. This is the
 * actual lever — increasing an outer batch size around a single instance
 * does nothing, because the instance itself was always the bottleneck.
 *
 * Tune INSTANCE_POOL_SIZE down if Vercel logs show NSE 403s/blocks under
 * load (Akamai WAF sits in front of NSE and can throttle bursts); tune it
 * up if warms are completing well within the time budget with no failures.
 */

import { setCacheBatch, getCacheStats } from "@/lib/cache";
import { isMarketOpen } from "@/lib/utils";
import { NIFTY500_STOCKS } from "@/data/indices/index";
import type { StockPrice } from "@/types";

const INTERVAL_MS = 15 * 60 * 1000;
const INSTANCE_POOL_SIZE = 10; // ~50 real concurrent connections (10 × 5 per-instance cap)

const g = globalThis as unknown as {
  cacheWarmerStarted?: boolean;
  lastWarmTime?: number;
  warmStatus?: "warming" | "warm" | "failed" | "idle";
  warmInFlight?: Promise<void>;
};

async function warmNifty500Impl(): Promise<void> {
  const startTime = Date.now();
  g.warmStatus = "warming";

  const symbols = NIFTY500_STOCKS.map((s) => s.symbol);
  console.log(
    `[CacheWarmer] Starting warm-up for ${symbols.length} symbols across a pool of ${INSTANCE_POOL_SIZE} NseIndia instances...`
  );

  try {
    const { NseIndia } = await import("stock-nse-india");
    const pool = Array.from({ length: INSTANCE_POOL_SIZE }, () => new NseIndia());

    // One retry per symbol — a lot of NSE failures are transient
    // (session/cookie hiccups, brief connection resets under load).
    async function fetchOne(
      nse: InstanceType<typeof NseIndia>,
      symbol: string,
      retry = true
    ): Promise<StockPrice | null> {
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
        if (retry) return fetchOne(nse, symbol, false);
        return null;
      }
    }

    // Round-robin symbols across the pool so each instance's own 5-slot
    // cap is used independently — this is what actually gives us real
    // concurrency, not the size of this Promise.allSettled call.
    const results = await Promise.allSettled(
      symbols.map((symbol, i) => fetchOne(pool[i % INSTANCE_POOL_SIZE], symbol))
    );

    const prices: StockPrice[] = [];
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) prices.push(r.value);
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
 * pass. This is what lets /api/prices/all and /api/prices/refresh both call
 * warmNifty500() safely without doubling the load when they happen to race.
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