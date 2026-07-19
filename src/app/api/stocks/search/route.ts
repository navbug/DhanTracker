import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { NIFTY500_STOCKS } from "@/data/indices/index";

/**
 * GET /api/stocks/search?q=RELIANCE
 *
 * Search priority:
 * 1. Filter Nifty 500 static list by symbol/name — instant, no NSE call
 * 2. If query looks like an exact symbol and not found in Nifty 500 — hit NSE API
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

    // ── Step 2: If nothing found and query is short (likely a symbol), try NSE API ──
    if (results.length === 0) {
      try {
        const { NseIndia } = await import("stock-nse-india");
        const nse = new NseIndia();
        const data = await nse.getEquityDetails(query.toUpperCase());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const info = (data as any)?.info;
        if (info?.symbol && !seen.has(info.symbol)) {
          results.push({
            symbol: info.symbol,
            companyName: info.companyName ?? info.symbol,
          });
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