/**
 * Index data barrel.
 *
 * Architecture:
 * - Nifty 500 prices are fetched once at server start and cached in RAM.
 * - Predefined watchlists (Nifty50/100/Midcap150/Smallcap250) are subsets of Nifty 500.
 *   Their stock lists come from static files; prices come from the shared server cache.
 * - No per-watchlist price fetching. One cache → all watchlists.
 */

import { NIFTY50_STOCKS, NIFTY50_META } from "./nifty50";
import { NIFTY100_STOCKS, NIFTY100_META } from "./nifty100";
import { NIFTY_MIDCAP150_STOCKS, NIFTY_MIDCAP150_META } from "./nifty-midcap150";
import { NIFTY_SMALLCAP250_STOCKS, NIFTY_SMALLCAP250_META } from "./nifty-smallcap250";
import { NIFTY500_STOCKS, NIFTY500_SYMBOLS, NIFTY500_META } from "./nifty500";
import type { IndexStock } from "@/types";

export { NIFTY500_STOCKS, NIFTY500_SYMBOLS };
export { NIFTY_SMALLCAP250_STOCKS };

// ─── REGISTRY ─────────────────────────────────────────────────────────────────

export const INDEX_REGISTRY = {
  "nifty50":           { stocks: NIFTY50_STOCKS,           meta: NIFTY50_META           },
  "nifty100":          { stocks: NIFTY100_STOCKS,          meta: NIFTY100_META          },
  "nifty-midcap150":   { stocks: NIFTY_MIDCAP150_STOCKS,   meta: NIFTY_MIDCAP150_META   },
  "nifty-smallcap250": { stocks: NIFTY_SMALLCAP250_STOCKS, meta: NIFTY_SMALLCAP250_META },
  "nifty500":           { stocks: NIFTY500_STOCKS,           meta: NIFTY500_META           },
} as const;

export type PredefinedIndexId = keyof typeof INDEX_REGISTRY;

export function isPredefinedIndex(id: string): id is PredefinedIndexId {
  return id in INDEX_REGISTRY;
}

export function getIndexStocks(id: string): IndexStock[] {
  return INDEX_REGISTRY[id as PredefinedIndexId]?.stocks ?? [];
}

export function getIndexMeta(id: string) {
  return INDEX_REGISTRY[id as PredefinedIndexId]?.meta ?? null;
}

// ─── NIFTY 500 LOOKUP MAP ─────────────────────────────────────────────────────
// Used by custom watchlist stock search — check Nifty 500 before hitting NSE API.

const _nifty500Map = new Map<string, IndexStock>(
  NIFTY500_STOCKS.map((s) => [s.symbol.toUpperCase(), s])
);

export function getNifty500Stock(symbol: string): IndexStock | null {
  return _nifty500Map.get(symbol.toUpperCase()) ?? null;
}

export function isInNifty500(symbol: string): boolean {
  return _nifty500Map.has(symbol.toUpperCase());
}