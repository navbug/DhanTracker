import { NextResponse, after } from "next/server";
import { getAllCachedRaw } from "@/lib/cache";
import { warmNifty500 } from "@/lib/cache-warmer";
import { NIFTY500_HEALTHY_COUNT } from "@/lib/utils";

export const maxDuration = 60;

/**
 * GET /api/prices/all
 * Returns ALL cached prices — used at app boot (and by the client's bounded
 * retry poll in AppBootstrap) to populate the Zustand price store.
 *
 * IMPORTANT: this route must respond fast and must NOT block on NSE — see
 * the big comment in lib/cache-warmer.ts for why a full warm can't safely
 * run inline within a single request. So: always return whatever's
 * currently cached immediately. If the cache is below the "healthy" bar
 * (either still empty, or only partially warmed from a previous resumed
 * run), kick off another bounded, resumable warm run via after() rather
 * than awaiting it here. The client retries this endpoint a few times with
 * backoff if it came back thin, to pick up newly-warmed data as it lands.
 *
 * Checking against NIFTY500_HEALTHY_COUNT rather than "cache is empty" is
 * what lets the resumable cursor in cache-warmer.ts actually converge over
 * a few requests instead of getting stuck once any data is cached at all.
 */
export async function GET() {
  const prices = getAllCachedRaw();

  if (Object.keys(prices).length < NIFTY500_HEALTHY_COUNT) {
    after(() => warmNifty500().catch(() => {}));
  }

  return NextResponse.json({ success: true, data: prices });
}