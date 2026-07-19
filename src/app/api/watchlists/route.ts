import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const createWatchlistSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name is too long")
    .regex(/^[a-zA-Z0-9\s\-_&().]+$/, "Invalid characters in name"),
});

// GET /api/watchlists
// ?full=true → include stocks for each watchlist (used at app boot)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const full = new URL(request.url).searchParams.get("full") === "true";

    const watchlists = await db.watchlist.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: { select: { stocks: true } },
        ...(full
          ? {
              stocks: {
                orderBy: { position: "asc" },
                select: {
                  id: true,
                  symbol: true,
                  position: true,
                },
              },
            }
          : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    const data = watchlists.map((wl) => ({
      id: wl.id,
      name: wl.name,
      stockCount: wl._count.stocks,
      createdAt: wl.createdAt.toISOString(),
      type: "custom" as const,
      ...(full && "stocks" in wl
        ? {
            stocks: (wl.stocks as Array<{ id: string; symbol: string; position: number }>).map((s) => ({
              id: s.id,
              symbol: s.symbol,
              position: s.position,
            })),
          }
        : {}),
    }));

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

// POST /api/watchlists
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const parsed = createWatchlistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name } = parsed.data;

    const existing = await db.watchlist.findUnique({
      where: { userId_name: { userId: user.id, name: name.trim() } },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `You already have a watchlist named "${name}"` },
        { status: 409 }
      );
    }

    const count = await db.watchlist.count({ where: { userId: user.id } });
    if (count >= 5) {
      return NextResponse.json(
        { success: false, error: "Maximum 5 custom watchlists allowed" },
        { status: 403 }
      );
    }

    const watchlist = await db.watchlist.create({
      data: { name: name.trim(), userId: user.id },
      select: { id: true, name: true, createdAt: true },
    });

    return NextResponse.json(
      { success: true, data: { ...watchlist, createdAt: watchlist.createdAt.toISOString(), stockCount: 0, stocks: [], type: "custom" } },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}