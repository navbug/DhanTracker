import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// Verify watchlist ownership + stock belongs to watchlist
async function verifyAccess(watchlistId: string, stockId: string, userId: string) {
  const stock = await db.watchlistStock.findFirst({
    where: { id: stockId, watchlistId },
    include: { watchlist: { select: { userId: true } } },
  });
  if (!stock) return null;
  if (stock.watchlist.userId !== userId) return null;
  return stock;
}

// ── DELETE /api/watchlists/[id]/stocks/[stockId] ─────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; stockId: string } }
) {
  try {
    const user = await requireAuth();
    const stock = await verifyAccess(params.id, params.stockId, user.id);
    if (!stock) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    await db.watchlistStock.delete({ where: { id: params.stockId } });

    // Re-normalize positions after deletion
    const remaining = await db.watchlistStock.findMany({
      where: { watchlistId: params.id },
      orderBy: { position: "asc" },
      select: { id: true },
    });

    await Promise.all(
      remaining.map((s, i) =>
        db.watchlistStock.update({ where: { id: s.id }, data: { position: i } })
      )
    );

    return NextResponse.json({ success: true, data: { id: params.stockId } });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}