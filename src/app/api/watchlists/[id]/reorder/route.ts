import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const reorderSchema = z.object({
  // Array of { id, position } in the new order
  order: z.array(z.object({ id: z.string().cuid(), position: z.number().int().min(0) })),
});

/**
 * PATCH /api/watchlists/[id]/reorder
 * Body: { order: [{ id: stockId, position: number }] }
 * Updates positions for all stocks in the watchlist.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const {id} = await params;
    const user = await requireAuth();

    // Verify ownership
    const wl = await db.watchlist.findUnique({
      where: { id: id },
      select: { userId: true },
    });

    if (!wl || wl.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid order data" }, { status: 400 });
    }

    // Batch update positions in a transaction
    await db.$transaction(
      parsed.data.order.map(({ id, position }) =>
        db.watchlistStock.update({
          where: { id },
          data: { position },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}
