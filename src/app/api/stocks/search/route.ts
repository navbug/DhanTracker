import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { NIFTY500_STOCKS } from "@/data/indices/index";
import { yahooFinance, fromYahooSymbol } from "@/lib/yahoo-finance";

/**
 * GET /api/stocks/search?q=RELIANCE
 *
 * Search priority:
 * 1. Filter Nifty 500 static list by symbol/name — instant, no API call
 * 2. If nothing found — hit Yahoo Finance's search endpoint, filtered to
 *    NSE-listed results (symbol ending in .NS)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";

    if (query.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const q = query.toLowerCase();
    const results: { symbol: string; companyName: string }[] = [];
    const seen = new Set<string>();

    // ── Step 1: Search Nifty 500 static list (instant) ──
    for (const stock of NIFTY500_STOCKS) {
      const matchesSymbol = stock.symbol.toLowerCase().startsWith(q);
      const matchesName   = stock.companyName.toLowerCase().includes(q);

      if (matchesSymbol || matchesName) {
        results.push({ symbol: stock.symbol, companyName: stock.companyName });
        seen.add(stock.symbol);
      }

      if (results.length >= 15) break;
    }

    // ── Step 2: If nothing found, try Yahoo Finance's search, NSE-only ──
    if (results.length === 0) {
      try {
        const searchResults = await yahooFinance.search(query, {
          region: "IN",
          quotesCount: 15,
        });

        for (const quote of searchResults.quotes) {
          if (!quote.isYahooFinance) continue;

          const yahooSymbol = quote.symbol;
          if (!yahooSymbol.toUpperCase().endsWith(".NS")) continue;

          const symbol = fromYahooSymbol(yahooSymbol);
          if (seen.has(symbol)) continue;

          const companyName = quote.longname ?? quote.shortname ?? symbol;

          results.push({ symbol, companyName });
          seen.add(symbol);
        }
      } catch {
        // Not found — return empty
      }
    }

    return NextResponse.json({ success: true, data: results.slice(0, 15) });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}