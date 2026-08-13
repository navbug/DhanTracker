import { NextResponse } from "next/server";
import { getCacheWarmerStatus } from "@/lib/cache-warmer";

/**
 * GET /api/prices/status
 * Diagnostic endpoint — not used by the UI. Visit this directly in a browser
 * (while logged into the deployed app) to see what the price cache warmer is
 * actually doing on the current serverless instance: whether it's idle,
 * warming, warm, or failed, how many symbols are cached, and when it last
 * completed. Useful for telling apart "still warming, just needs more time"
 * from "warm-up is actually failing" without digging through Vercel logs.
 */
export async function GET() {
  return NextResponse.json({ success: true, data: getCacheWarmerStatus() });
}