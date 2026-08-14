import { NextResponse } from "next/server";
import { getAllCachedRaw } from "@/lib/cache";

/**
 * GET /api/prices/all
 * Returns ALL cached prices — used once at app boot to populate client Zustand store.
 * Returns raw cache without TTL filtering so boot never gets empty data.
 * Server cache is populated by the cache warmer at startup.
 */
export async function GET() {
  const prices = getAllCachedRaw();
  return NextResponse.json({ success: true, data: prices });
}