import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const addStockSchema = z.object({
  symbol: z
    .string()
    .min(1)
    .max(30)
    .transform((s) => s.toUpperCase().trim()),
  companyName: z.string().optional(),
});

// ── Verify user owns the watchlist ────────────────────────────────────────────
async function verifyOwnership(watchlistId: string, userId: string | undefined) {
  const wl = await db.watchlist.findUnique({
    where: { id: watchlistId },
    select: { userId: true },
  });
  if (!wl) return null;
  if (wl.userId !== userId) return null;
  return wl;
}

type RouteParams = { params: Promise<{ id: string }> };

// ── GET /api/watchlists/[id]/stocks ──────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const owned = await verifyOwnership(id, user.id);
    if (!owned) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const stocks = await db.watchlistStock.findMany({
      where: { watchlistId: id },
      orderBy: { position: "asc" },
      select: {
        id: true,
        symbol: true,
        position: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: stocks });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

// ── POST /api/watchlists/[id]/stocks — add a stock ───────────────────────────
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const owned = await verifyOwnership(id, user.id);
    if (!owned) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = addStockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid symbol" },
        { status: 400 }
      );
    }

    const { symbol } = parsed.data;

    // Check for duplicate
    const exists = await db.watchlistStock.findUnique({
      where: { watchlistId_symbol: { watchlistId: id, symbol } },
    });
    if (exists) {
      return NextResponse.json(
        { success: false, error: `${symbol} is already in this watchlist` },
        { status: 409 }
      );
    }

    // Get max position
    const maxPos = await db.watchlistStock.aggregate({
      where: { watchlistId: id },
      _max: { position: true },
    });
    const nextPosition = (maxPos._max.position ?? -1) + 1;

    const stock = await db.watchlistStock.create({
      data: {
        symbol,
        watchlistId: id,
        position: nextPosition,
      },
      select: { id: true, symbol: true, position: true },
    });

    return NextResponse.json({ success: true, data: stock }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}