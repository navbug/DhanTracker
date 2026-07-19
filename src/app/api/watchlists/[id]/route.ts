import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

// DELETE /api/watchlists/[id] — delete a watchlist
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Verify ownership
    const watchlist = await db.watchlist.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!watchlist) {
      return NextResponse.json(
        { success: false, error: "Watchlist not found" },
        { status: 404 }
      );
    }

    if (watchlist.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    await db.watchlist.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
}

// PATCH /api/watchlists/[id] — rename or update a watchlist
const updateSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-zA-Z0-9\s\-_&().]+$/)
    .optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed" },
        { status: 400 }
      );
    }

    // Verify ownership
    const watchlist = await db.watchlist.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!watchlist || watchlist.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }

    const updated = await db.watchlist.update({
      where: { id },
      data: parsed.data,
      select: { id: true, name: true, updatedAt: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
}

// GET /api/watchlists/[id] — get a single watchlist with its stocks
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const watchlist = await db.watchlist.findUnique({
      where: { id },
      include: {
        stocks: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            symbol: true,
            position: true,
          },
        },
      },
    });

    if (!watchlist) {
      return NextResponse.json(
        { success: false, error: "Watchlist not found" },
        { status: 404 }
      );
    }

    if (watchlist.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: watchlist.id,
        name: watchlist.name,
        type: "custom",
        stocks: watchlist.stocks,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
}