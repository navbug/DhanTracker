import { NextResponse } from "next/server";
import { getAllCachedRaw } from "@/lib/cache";
import { warmNifty500 } from "@/lib/cache-warmer";

export const maxDuration = 60;

/**
 * GET /api/prices/all
 * Returns ALL cached prices — used once at app boot to populate client Zustand store.
 * Returns raw cache without TTL filtering so boot never gets empty data.
 *
 * The background cache warmer (kicked off from instrumentation.ts) may not
 * have finished yet on a cold instance — or, on serverless platforms, may
 * have been frozen mid-fetch between invocations. If the cache is empty when
 * this route is hit, we do a real, awaited warm-up here before responding,
 * so the very first request to a fresh instance still gets real data instead
 * of silently returning {} and leaving the client with nothing.
 */
export async function GET() {
  let prices = getAllCachedRaw();

  if (Object.keys(prices).length === 0) {
    await warmNifty500().catch(() => {});
    prices = getAllCachedRaw();
  }

  return NextResponse.json({ success: true, data: prices });
}