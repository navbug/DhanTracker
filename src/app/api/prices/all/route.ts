import { NextResponse, after } from "next/server";
import { getAllCachedRaw } from "@/lib/cache";
import { warmNifty500 } from "@/lib/cache-warmer";

export const maxDuration = 60;

/**
 * GET /api/prices/all
 * Returns ALL cached prices — used at app boot (and by the client's bounded
 * retry poll in AppBootstrap) to populate the Zustand price store.
 *
 * IMPORTANT: this route must respond fast and must NOT block on NSE.
 * Vercel serverless functions have a hard execution ceiling (60s on Hobby
 * without Fluid Compute), and warming all 500 Nifty stocks can occasionally
 * exceed that under real-world NSE latency. An earlier version of this route
 * awaited the warm-up inline before responding — which meant that on a cold
 * cache, the ENTIRE boot request could hit that ceiling and get killed by
 * Vercel, returning nothing at all (worse than returning a partial cache).
 *
 * Fix: always return whatever's currently cached immediately. If the cache
 * is cold, kick the warm-up off via after() — Next's supported way to keep
 * work running after the response has been sent — instead of awaiting it
 * here. The client (AppBootstrap) retries this endpoint a few times with
 * backoff if it came back empty, to pick up the warmed data once it lands.
 */
export async function GET() {
  const prices = getAllCachedRaw();

  if (Object.keys(prices).length === 0) {
    after(() => warmNifty500().catch(() => {}));
  }

  return NextResponse.json({ success: true, data: prices });
}