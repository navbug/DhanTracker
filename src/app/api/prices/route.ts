import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCached, setCache } from "@/lib/cache";
import { isInNifty500 } from "@/data/indices/index";
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
 * 2. For non-Nifty-500 symbols only: fetch from NSE and cache
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

    // Only fetch from NSE for symbols not in cache (non-Nifty-500 custom stocks)
    if (uncached.length > 0) {
      const { NseIndia } = await import("stock-nse-india");
      const nse = new NseIndia();

      const fetched = await Promise.allSettled(
        uncached.map((symbol) => nse.getEquityDetails(symbol))
      );

      fetched.forEach((r, i) => {
        if (r.status !== "fulfilled" || !r.value?.priceInfo?.lastPrice) return;
        const raw = r.value;
        const p = raw.priceInfo;

        // Extract metadata from NSE response
        const companyName = raw.info?.companyName ?? undefined;
        const sector = undefined;
        const issuedSize: number = 0;
        // marketCap in Cr = (lastPrice × issuedSize) / 1e7
        const marketCap = issuedSize
          ? Math.round((p.lastPrice * issuedSize) / 1e7) / 100
          : undefined;

        const price: StockPrice = {
          symbol: uncached[i],
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
          marketCap,
        };
        setCache(uncached[i], price);
        result[uncached[i]] = price;
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[PRICES API] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch prices" }, { status: 500 });
  }
}