/**
 * Cache Warmer — runs at server start via instrumentation.ts
 * Fetches all 500 Nifty stocks in batches of 50, caches price + sector + marketCap in RAM.
 * Refreshes every 15 minutes. One cache shared across all users and watchlists.
 */

import { setCacheBatch, getCacheStats } from "@/lib/cache";
import { isMarketOpen } from "@/lib/utils";
import { NIFTY500_STOCKS } from "@/data/indices/index";
import type { StockPrice } from "@/types";

const INTERVAL_MS = 15 * 60 * 1000;
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000; // pause between batches so we don't hammer NSE

const g = globalThis as unknown as {
  cacheWarmerStarted?: boolean;
  lastWarmTime?: number;
  warmStatus?: "warming" | "warm" | "failed" | "idle";
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Splits symbols into chunks of BATCH_SIZE and fetches each chunk sequentially,
 * with a small delay between chunks. Returns results in the same order as `symbols`
 * so callers can still zip them back up by index.
 */
async function fetchDetailsInBatches(
  symbols: string[],
  nse: InstanceType<typeof import("stock-nse-india").NseIndia>
): Promise<PromiseSettledResult<Awaited<ReturnType<typeof nse.getEquityDetails>>>[]> {
  const allResults: PromiseSettledResult<Awaited<ReturnType<typeof nse.getEquityDetails>>>[] = [];
  const totalBatches = Math.ceil(symbols.length / BATCH_SIZE);

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batchNum = i / BATCH_SIZE + 1;
    const batch = symbols.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map((symbol) => nse.getEquityDetails(symbol))
    );
    allResults.push(...batchResults);

    console.log(
      `[CacheWarmer] Batch ${batchNum}/${totalBatches} done (${Math.min(
        i + BATCH_SIZE,
        symbols.length
      )}/${symbols.length} symbols fetched)`
    );

    // Don't sleep after the final batch
    if (i + BATCH_SIZE < symbols.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return allResults;
}

export async function warmNifty500(): Promise<void> {
  const startTime = Date.now();
  g.warmStatus = "warming";

  const symbols = NIFTY500_STOCKS.map((s) => s.symbol);
  console.log(
    `[CacheWarmer] Starting warm-up for ${symbols.length} symbols in batches of ${BATCH_SIZE}...`
  );

  try {
    const { NseIndia } = await import("stock-nse-india");
    const nse = new NseIndia();

    const results = await fetchDetailsInBatches(symbols, nse);

    const prices: StockPrice[] = [];

    results.forEach((r, i) => {
      if (r.status !== "fulfilled" || !r.value?.priceInfo?.lastPrice) return;

      const raw = r.value;
      const p = raw.priceInfo;
      const symbol = symbols[i];

      // issuedSize from tradeInfo or metadata
      const issuedSize: number = 0;

      // marketCap in Cr. = (lastPrice × issuedSize) / 1e7
      // issuedSize is total shares, lastPrice is in ₹
      // ₹ × shares = ₹ total → divide by 1 crore (10^7) to get Cr.
      const marketCapCr = issuedSize
        ? Math.round((p.lastPrice * issuedSize) / 1e7) / 100
        : undefined;

      // Sector: NSE's industryInfo.sector is the properly classified field
      // (info.industry is a broader field and is frequently an empty string —
      // use || everywhere here, not ??, so blank strings also fall through)
      const sector =
        raw.industryInfo?.sector ||
        raw.info?.industry ||
        // Fall back to our static index data if NSE doesn't return either
        NIFTY500_STOCKS.find((s) => s.symbol === symbol)?.sector;

      const companyName =
        raw.info?.companyName ??
        NIFTY500_STOCKS.find((s) => s.symbol === symbol)?.companyName;

      prices.push({
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
      });
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