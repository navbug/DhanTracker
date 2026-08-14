import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { warmNifty500 } from "@/lib/cache-warmer";
import { getAllCachedRaw } from "@/lib/cache";

/**
 * POST /api/prices/refresh
 * Forces a fresh NSE fetch for all 500 stocks, updates server cache, returns result.
 * Called by the client price poller (every 15min) and the manual Refresh button.
 * Auth required — prevents anonymous cache-busting.
 */
export async function POST() {
  try {
    await requireAuth();

    // Re-fetch all 500 from NSE and update server cache
    await warmNifty500();

    // Return the freshly cached data
    const prices = getAllCachedRaw();

    return NextResponse.json({ success: true, data: prices });
  } catch (err) {
    console.error("[PRICES REFRESH] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to refresh prices" },
      { status: 500 }
    );
  }
}