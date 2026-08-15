import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCached, setCache } from "@/lib/cache";
import { NIFTY500_STOCKS } from "@/data/indices/index";
import {
  yahooFinance,
  toYahooSymbol,
  quoteToStockPrice,
  fetchSectorLive,
} from "@/lib/yahoo-finance";
import type { StockPrice } from "@/types";

const requestSchema = z.object({
  symbols: z.array(z.string().min(1).max(30)).min(1).max(300),
});

/**
 * POST /api/prices
 * Used for custom watchlist stocks NOT in Nifty 500.
 * Nifty 500 prices are already in server cache from the warmer.
 *
 * Flow:
 * 1. Return cached price if available (Nifty 500 always hits cache)
 * 2. For non-Nifty-500 symbols only: fetch from Yahoo Finance and cache
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid symbols" }, { status: 400 });
    }

    const symbols = parsed.data.symbols.map((s) => s.toUpperCase());
    const result: Record<string, StockPrice> = {};
    const uncached: string[] = [];

    for (const symbol of symbols) {
      const cached = getCached(symbol);
      if (cached) {
        result[symbol] = cached;
      } else {
        uncached.push(symbol);
      }
    }

    // Only fetch for symbols not in cache (non-Nifty-500 custom stocks) —
    // Yahoo's quote() takes the whole list in one call, unlike NSE which
    // needed one request per symbol.
    if (uncached.length > 0) {
      const yahooSymbols = uncached.map(toYahooSymbol);
      const quotesBySymbol = await yahooFinance.quote(yahooSymbols, {
        return: "object",
      });

      // Sector fetches ARE still one-request-per-symbol (quoteSummary doesn't
      // batch), so only do it for symbols we don't already have a static
      // sector for, and only after we know the quote actually succeeded.
      const needsLiveSector: string[] = [];

      for (const symbol of uncached) {
        const quote = quotesBySymbol[toYahooSymbol(symbol)];
        if (!quote) continue;

        const staticEntry = NIFTY500_STOCKS.find((s) => s.symbol === symbol);
        const price = quoteToStockPrice(
          quote,
          symbol,
          staticEntry?.sector,
          staticEntry?.companyName
        );
        if (!price) continue;

        if (!price.sector) needsLiveSector.push(symbol);

        setCache(symbol, price);
        result[symbol] = price;
      }

      // Small, bounded set (only symbols with no static sector match) — safe
      // to fetch live, one quoteSummary call per symbol.
      if (needsLiveSector.length > 0) {
        await Promise.all(
          needsLiveSector.map(async (symbol) => {
            const sector = await fetchSectorLive(symbol);
            if (sector && result[symbol]) {
              result[symbol] = { ...result[symbol], sector };
              setCache(symbol, result[symbol]);
            }
          })
        );
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[PRICES API] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch prices" }, { status: 500 });
  }
}