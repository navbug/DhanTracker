/**
 * NSE data wrapper around the `stock-nse-india` npm package.
 * Handles batching (50 symbols per call), normalizes response shape,
 * and never stores prices in PostgreSQL — only in RAM cache.
 */

import type { StockPrice } from "@/types";
import { chunkArray, sleep } from "@/lib/utils";

// ─── TYPES FROM PACKAGE ───────────────────────────────────────────────────────
// The stock-nse-india package returns different shapes for different endpoints.
// We normalize everything to our StockPrice type.

interface NseEquityPriceInfo {
  lastPrice: number;
  change: number;
  pChange: number;
  open: number;
  close: number;
  previousClose: number;
  high: number;
  low: number;
  vwap?: number;
  weekHighLow?: {
    max: number;
    min: number;
    maxDate?: string;
    minDate?: string;
  };
}

interface NseEquityInfo {
  symbol: string;
  companyName: string;
  industry?: string;
  isFNOSec?: boolean;
}

interface NseEquityTradeInfo {
  totalTradedVolume: number;
  totalTradedValue: number;
  marketCapNSE?: number;
  issuedSize?: number;
}

interface NseEquityResponse {
  info?: NseEquityInfo;
  priceInfo?: NseEquityPriceInfo;
  tradeInfo?: NseEquityTradeInfo;
  metadata?: {
    industry?: string;
    sectorName?: string;
    issuedSize?: number;
  };
}

// ─── NORMALIZATION ────────────────────────────────────────────────────────────

function normalizeEquityResponse(
  symbol: string,
  raw: NseEquityResponse
): StockPrice | null {
  const p = raw?.priceInfo;
  if (!p || typeof p.lastPrice !== "number") return null;

  const issuedSize =
    raw?.tradeInfo?.issuedSize ?? raw?.metadata?.issuedSize ?? 0;
  const marketCap = issuedSize ? p.lastPrice * issuedSize : undefined;

  return {
    symbol: symbol.toUpperCase(),
    lastPrice: p.lastPrice,
    change: p.change ?? 0,
    pChange: p.pChange ?? 0,
    open: p.open ?? p.lastPrice,
    close: p.close ?? p.previousClose ?? p.lastPrice,
    high: p.high ?? p.lastPrice,
    low: p.low ?? p.lastPrice,
    volume: raw?.tradeInfo?.totalTradedVolume ?? 0,
    totalTradedVolume: raw?.tradeInfo?.totalTradedVolume ?? 0,
    yearHigh: p.weekHighLow?.max ?? p.lastPrice,
    yearLow: p.weekHighLow?.min ?? p.lastPrice,
    issuedSize: issuedSize || undefined,
    marketCap,
  };
}

// ─── FETCH SINGLE STOCK ───────────────────────────────────────────────────────

export async function fetchStockPrice(symbol: string): Promise<StockPrice | null> {
  try {
    // Dynamic import so it only loads server-side
    const { NseIndia } = await import("stock-nse-india");
    const nse = new NseIndia();
    const data = await nse.getEquityDetails(symbol.toUpperCase());
    return normalizeEquityResponse(symbol, data as NseEquityResponse);
  } catch (err) {
    console.error(`[NSE] Failed to fetch ${symbol}:`, err);
    return null;
  }
}

// ─── BATCH FETCH ─────────────────────────────────────────────────────────────

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 500; // 500ms between batches to avoid rate limiting

/**
 * Fetches prices for an array of symbols in batches of 50 with 500ms gaps.
 * Returns a map of symbol → StockPrice for successfully fetched symbols.
 * Failed symbols are silently skipped.
 */
export async function fetchStockPricesBatch(
  symbols: string[]
): Promise<Map<string, StockPrice>> {
  const result = new Map<string, StockPrice>();

  if (symbols.length === 0) return result;

  const { NseIndia } = await import("stock-nse-india");
  const nse = new NseIndia();

  const chunks = chunkArray(symbols, BATCH_SIZE);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Fetch all in this chunk concurrently
    const promises = chunk.map(async (symbol) => {
      try {
        const data = await nse.getEquityDetails(symbol.toUpperCase());
        const normalized = normalizeEquityResponse(symbol, data as NseEquityResponse);
        if (normalized) result.set(symbol.toUpperCase(), normalized);
      } catch {
        // Silently skip failed fetches — partial data is fine
      }
    });

    await Promise.allSettled(promises);

    // Wait between batches (except last batch)
    if (i < chunks.length - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return result;
}

// ─── SEARCH NSE STOCKS ────────────────────────────────────────────────────────

export interface NseSearchResult {
  symbol: string;
  companyName: string;
  isin?: string;
}

/**
 * Searches NSE equity list for matching stocks.
 * Returns up to `limit` results matching the query.
 */
export async function searchNseStocks(
  query: string,
  limit = 10
): Promise<NseSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const { NseIndia } = await import("stock-nse-india");
    const nse = new NseIndia();

    // getEquityStockIndices searches across all listed stocks
    // We use getAllStockSymbols if available, otherwise search by equity details
    let results: NseSearchResult[] = [];

    try {
      // Try the equity search endpoint first
      const searchData = await nse.getEquityDetails(query.toUpperCase().trim());
      if (searchData && (searchData as NseEquityResponse)?.info?.symbol) {
        const info = (searchData as NseEquityResponse).info!;
        results = [
          {
            symbol: info.symbol,
            companyName: info.companyName,
          },
        ];
      }
    } catch {
      // Symbol not found exactly — that's fine for search
    }

    return results.slice(0, limit);
  } catch (err) {
    console.error("[NSE] Search error:", err);
    return [];
  }
}

// ─── GET INDEX STOCKS PRICES ──────────────────────────────────────────────────

/**
 * Gets all stock prices for a given NSE index by index name.
 * Uses the index endpoint for efficiency when loading a full index watchlist.
 */
export async function fetchIndexPrices(
  nseIndexName: string
): Promise<Map<string, StockPrice>> {
  const result = new Map<string, StockPrice>();

  try {
    const { NseIndia } = await import("stock-nse-india");
    const nse = new NseIndia();

    // getDataByIndex returns array of stock objects for the entire index
    const indexData = await nse.getDataByIndex(nseIndexName);

    if (!Array.isArray(indexData?.data)) return result;

    for (const item of indexData.data) {
      if (!item?.symbol) continue;

      const price: StockPrice = {
        symbol: item.symbol.toUpperCase(),
        lastPrice: item.lastPrice ?? item.ltp ?? 0,
        change: item.change ?? 0,
        pChange: item.pChange ?? item.netChgPct ?? 0,
        open: item.open ?? item.lastPrice ?? 0,
        close: item.previousClose ?? item.lastPrice ?? 0,
        high: item.dayHigh ?? item.lastPrice ?? 0,
        low: item.dayLow ?? item.lastPrice ?? 0,
        volume: item.totalTradedVolume ?? item.volume ?? 0,
        totalTradedVolume: item.totalTradedVolume ?? 0,
        yearHigh: item.yearHigh ?? item.lastPrice ?? 0,
        yearLow: item.yearLow ?? item.lastPrice ?? 0,
        issuedSize: item.issuedSize,
        marketCap: item.issuedSize ? (item.lastPrice ?? 0) * item.issuedSize : undefined,
      };

      result.set(price.symbol, price);
    }
  } catch (err) {
    console.error(`[NSE] Failed to fetch index ${nseIndexName}:`, err);
  }

  return result;
}

// Map from our slug to NSE index name
export const NSE_INDEX_NAME_MAP: Record<string, string> = {
  nifty50: "NIFTY 50",
  nifty100: "NIFTY 100",
  "nifty-midcap150": "NIFTY MIDCAP 150",
  "nifty-smallcap250": "NIFTY SMALLCAP 250",
};
