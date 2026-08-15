/**
 * Shared Yahoo Finance client + conversion helpers.
 *
 * Replaces stock-nse-india. Key differences that matter elsewhere in the app:
 *
 * - yahoo-finance2's `quote()` accepts an ARRAY of symbols and returns them all
 *   in one HTTP call, unlike stock-nse-india which required one call per symbol.
 *   That's why the cache warmer now does a handful of batched calls instead of
 *   500 individual ones.
 * - The client is a plain stateless HTTP wrapper (no shared cookie jar that gets
 *   reset out from under concurrent requests), so the session-race issues we
 *   had to work around for stock-nse-india don't apply here. We still use
 *   fetchPooled() for the batched quote() calls, but only to keep a lid on
 *   concurrent outbound requests generally, not to dodge a session bug.
 * - NSE symbols need a ".NS" suffix on Yahoo (e.g. "RELIANCE" -> "RELIANCE.NS").
 *   Every function in this file takes/returns the plain NSE symbol (no suffix)
 *   so the rest of the app doesn't need to know about Yahoo's ticker format.
 * - `quote()` does not include sector/industry — that only comes from
 *   `quoteSummary()`'s `assetProfile` module, and that endpoint is single-symbol
 *   only. Callers should prefer the static index data for sector and only fall
 *   back to a live quoteSummary() lookup for symbols outside that static list.
 */

import YahooFinance from "yahoo-finance2";
import type { Quote } from "yahoo-finance2/modules/quote";
import type { StockPrice } from "@/types";

export const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

/** NSE symbols on Yahoo Finance need the ".NS" suffix, e.g. RELIANCE -> RELIANCE.NS */
export function toYahooSymbol(nseSymbol: string): string {
  return `${nseSymbol.toUpperCase()}.NS`;
}

/** Strip the .NS suffix back off, e.g. RELIANCE.NS -> RELIANCE */
export function fromYahooSymbol(yahooSymbol: string): string {
  return yahooSymbol.replace(/\.NS$/i, "").toUpperCase();
}

/**
 * Converts a Yahoo `quote()` result into our internal StockPrice shape.
 * Returns null if Yahoo didn't actually have a tradeable price for this symbol
 * (e.g. delisted, or not found) so the caller can skip it like a failed fetch.
 *
 * `staticSector`/`staticCompanyName` are optional fallbacks (from the static
 * index data) used when Yahoo's quote itself doesn't carry them — quote()
 * doesn't return sector at all, and companyName (longName/shortName) is
 * sometimes missing for smaller-cap names.
 */
export function quoteToStockPrice(
  quote: Quote,
  nseSymbol: string,
  staticSector?: string,
  staticCompanyName?: string
): StockPrice | null {
  const price = quote.regularMarketPrice;
  if (price == null) return null;

  return {
    symbol: nseSymbol,
    companyName: quote.longName ?? quote.shortName ?? staticCompanyName,
    sector: staticSector,
    lastPrice: price,
    change: quote.regularMarketChange ?? 0,
    pChange: quote.regularMarketChangePercent ?? 0,
    open: quote.regularMarketOpen ?? price,
    close: quote.regularMarketPreviousClose ?? price,
    high: quote.regularMarketDayHigh ?? price,
    low: quote.regularMarketDayLow ?? price,
    volume: quote.regularMarketVolume ?? 0,
    totalTradedVolume: quote.regularMarketVolume ?? 0,
    yearHigh: quote.fiftyTwoWeekHigh ?? price,
    yearLow: quote.fiftyTwoWeekLow ?? price,
    // Yahoo returns marketCap in raw ₹, not Cr — convert like the rest of the app does.
    // (raw / 1e5) rounded, then / 100 == raw / 1e7 rounded to 2 decimal places.
    marketCap:
      quote.marketCap != null
        ? Math.round(quote.marketCap / 1e5) / 100
        : undefined,
  };
}

/**
 * Looks up sector for a single symbol via quoteSummary's assetProfile module.
 * Single-symbol only (Yahoo doesn't batch this one) — only use for symbols
 * that don't already have a sector in the static index data, and keep the
 * caller count small (this is meant for one-off custom-stock lookups, not
 * bulk warming).
 */
export async function fetchSectorLive(nseSymbol: string): Promise<string | undefined> {
  try {
    const result = await yahooFinance.quoteSummary(toYahooSymbol(nseSymbol), {
      modules: ["assetProfile"],
    });
    return result.assetProfile?.sector || undefined;
  } catch {
    return undefined;
  }
}