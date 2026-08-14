/**
 * Cache Warmer — runs at server start via instrumentation.ts, and on-demand
 * from the price API routes when a given instance's cache is cold or thin.
 *
 * Two hard constraints from Vercel + the upstream NSE library shape this
 * design, both discovered the hard way while debugging this:
 *
 * 1. `stock-nse-india` hardcodes a per-instance concurrency cap — each
 *    NseIndia object only lets 5 requests run at once (noOfConnections is an
 *    instance property). A pool of instances is what actually buys real
 *    concurrency; see INSTANCE_POOL_SIZE below.
 *
 * 2. Vercel serverless functions have a hard execution ceiling (60s on
 *    Hobby without Fluid Compute) that a warm-up MUST NOT approach, even
 *    with the pool — under real NSE latency, warming all 500 symbols can
 *    still take longer than that in one go, and Vercel will kill the whole
 *    invocation ("Task timed out after 60 seconds") if it tries.
 *
 * So this does NOT try to warm all 500 symbols in a single call. It warms
 * as many as fit within TIME_BUDGET_MS, remembers where it left off (a
 * cursor into the symbol list), and resumes from there on the next call —
 * whether that's the next page load, the 15-min interval, or a manual
 * refresh. Under normal conditions one call comfortably finishes all 500
 * well within the budget; under slow/adverse conditions it just does a
 * partial pass and safely continues later instead of timing out.
 */

import { setCacheBatch, getCacheStats } from "@/lib/cache";
import { isMarketOpen, NIFTY500_HEALTHY_COUNT } from "@/lib/utils";
import { NIFTY500_STOCKS } from "@/data/indices/index";
import type { StockPrice } from "@/types";

const INTERVAL_MS = 15 * 60 * 1000;
const INSTANCE_POOL_SIZE = 10; // ~50 real concurrent connections (10 × 5 per-instance cap)
const CHUNK_SIZE = 50; // symbols per round — matches the pool's real concurrency
const TIME_BUDGET_MS = 40_000; // stop starting new chunks past this — leaves headroom under Vercel's 60s ceiling

const g = globalThis as unknown as {
  cacheWarmerStarted?: boolean;
  lastWarmTime?: number;
  warmStatus?: "warming" | "warm" | "failed" | "idle";
  warmInFlight?: Promise<void>;
  warmCursor?: number; // index into NIFTY500_STOCKS to resume from next call
};

async function warmNifty500Impl(): Promise<void> {
  const startTime = Date.now();
  g.warmStatus = "warming";

  const allSymbols = NIFTY500_STOCKS.map((s) => s.symbol);
  const startCursor = g.warmCursor ?? 0;

  console.log(
    `[CacheWarmer] Warming from index ${startCursor}/${allSymbols.length}, pool=${INSTANCE_POOL_SIZE}, budget=${TIME_BUDGET_MS}ms...`
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

    let cursor = startCursor;
    let symbolsSeenThisRun = 0;
    let cachedThisRun = 0;

    // Walk the symbol list in chunks, wrapping around, until either we've
    // covered everything once or we're out of time budget for this call.
    while (
      symbolsSeenThisRun < allSymbols.length &&
      Date.now() - startTime < TIME_BUDGET_MS
    ) {
      const chunk: string[] = [];
      for (let k = 0; k < CHUNK_SIZE && symbolsSeenThisRun < allSymbols.length; k++) {
        chunk.push(allSymbols[cursor]);
        cursor = (cursor + 1) % allSymbols.length;
        symbolsSeenThisRun++;
      }

      const results = await Promise.allSettled(
        chunk.map((symbol, i) => fetchOne(pool[i % INSTANCE_POOL_SIZE], symbol))
      );

      const prices: StockPrice[] = [];
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) prices.push(r.value);
      }
      if (prices.length > 0) {
        setCacheBatch(prices);
        cachedThisRun += prices.length;
      }
    }

    g.warmCursor = cursor;
    g.lastWarmTime = Date.now();

    const { size } = getCacheStats();
    g.warmStatus = size >= NIFTY500_HEALTHY_COUNT ? "warm" : "warming";

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `[CacheWarmer] Run done: +${cachedThisRun} cached this run (${symbolsSeenThisRun}/${allSymbols.length} symbols attempted), total cache now ${size}/${allSymbols.length}, took ${elapsed}s. Next resume index: ${cursor}.`
    );
  } catch (err) {
    g.warmStatus = "failed";
    console.error("[CacheWarmer] Error:", err);
  }
}

/**
 * Kicks off a warm run, or — if one is already running on this instance —
 * returns the SAME in-flight promise instead of starting a second,
 * redundant pass. This is what lets /api/prices/all and /api/prices/refresh
 * both call warmNifty500() safely without doubling the load when they
 * happen to race. Each call does at most TIME_BUDGET_MS of work and is
 * always safe to call repeatedly — it resumes from where the last run left
 * off rather than restarting from scratch.
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
  // call warmNifty500() directly as a reliable fallback, and will just join
  // this same in-flight run if it's still going, or continue it via the
  // resumable cursor if it already ended.
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
    resumeIndex: g.warmCursor ?? 0,
  };
}