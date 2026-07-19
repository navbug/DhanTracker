import type { StockPrice } from "@/types";
import { isMarketOpen } from "@/lib/utils";

// ─── CACHE ENTRY ─────────────────────────────────────────────────────────────

interface CacheEntry {
  data: StockPrice;
  fetchedAt: number; // unix ms
}

// ─── TTL CONFIG ───────────────────────────────────────────────────────────────

const MARKET_OPEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MARKET_CLOSED_TTL_MS = 60 * 60 * 1000; // 1 hour (stale data during non-trading hours)

// ─── SINGLETON CACHE ─────────────────────────────────────────────────────────
// Stored in Node.js global so it survives Next.js hot-reloads in dev

const globalForCache = globalThis as unknown as {
  priceCache: Map<string, CacheEntry> | undefined;
};

const cache: Map<string, CacheEntry> =
  globalForCache.priceCache ?? new Map<string, CacheEntry>();

if (process.env.NODE_ENV !== "production") {
  globalForCache.priceCache = cache;
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

export function getCached(symbol: string): StockPrice | null {
  const entry = cache.get(symbol.toUpperCase());
  if (!entry) return null;

  const ttl = isMarketOpen() ? MARKET_OPEN_TTL_MS : MARKET_CLOSED_TTL_MS;
  const age = Date.now() - entry.fetchedAt;

  if (age > ttl) {
    cache.delete(symbol.toUpperCase());
    return null;
  }

  return entry.data;
}

export function setCache(symbol: string, data: StockPrice): void {
  cache.set(symbol.toUpperCase(), {
    data,
    fetchedAt: Date.now(),
  });
}

export function setCacheBatch(entries: StockPrice[]): void {
  const now = Date.now();
  for (const data of entries) {
    cache.set(data.symbol.toUpperCase(), { data, fetchedAt: now });
  }
}

export function invalidateCache(symbol?: string): void {
  if (symbol) {
    cache.delete(symbol.toUpperCase());
  } else {
    cache.clear();
  }
}

export function getCacheStats(): { size: number; symbols: string[] } {
  return {
    size: cache.size,
    symbols: Array.from(cache.keys()),
  };
}

/** Returns which symbols from the given list are stale/missing */
export function getStalSymbols(symbols: string[]): string[] {
  return symbols.filter((s) => !getCached(s));
}

/** Returns all currently cached prices as a plain object */
export function getAllCached(): Record<string, StockPrice> {
  const result: Record<string, StockPrice> = {};
  const ttl = isMarketOpen() ? MARKET_OPEN_TTL_MS : MARKET_CLOSED_TTL_MS;
  const now = Date.now();
  for (const [symbol, entry] of cache.entries()) {
    if (now - entry.fetchedAt <= ttl) {
      result[symbol] = entry.data;
    }
  }
  return result;
}

/** Returns ALL cached prices regardless of TTL — used for boot fetch only */
export function getAllCachedRaw(): Record<string, StockPrice> {
  const result: Record<string, StockPrice> = {};
  for (const [symbol, entry] of cache.entries()) {
    result[symbol] = entry.data;
  }
  return result;
}