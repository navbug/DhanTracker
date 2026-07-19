import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

function calculatePnL(
  entry: number,
  exitPrice: number | undefined | null,
  qty: number,
  outcome: string,
  target: number,
  sl: number
): number | null {
  if (outcome === "OPEN") return null;
  let exit = exitPrice ?? undefined;
  if (!exit) {
    if (outcome === "TARGET_HIT") exit = target;
    else if (outcome === "SL_HIT") exit = sl;
    else if (outcome === "BREAKEVEN") exit = entry;
    else return null;
  }
  return (exit - entry) * qty;
}

async function verifyOwnership(tradeId: string, userId: string) {
  const trade = await db.trade.findUnique({ where: { id: tradeId }, select: { userId: true } });
  if (!trade || trade.userId !== userId) return null;
  return trade;
}

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/trades/[id] ────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const trade = await db.trade.findUnique({ where: { id } });
    if (!trade || trade.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: {
        ...trade,
        date: trade.date.toISOString(),
        createdAt: trade.createdAt.toISOString(),
        updatedAt: trade.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

// ─── PATCH /api/trades/[id] ──────────────────────────────────────────────────

const updateTradeSchema = z.object({
  date: z.string().optional(),
  stock: z.string().min(1).max(30).transform((s) => s.toUpperCase().trim()).optional(),
  tradeSetup: z.enum(["QUICK_TRADE", "HIT", "DIT", "WIT", "MIT", "QIT", "HVIT", "YIT"]).optional(),
  priority: z.enum(["MUST_TRADE", "HIGH", "MEDIUM", "LOW"]).optional(),
  entry: z.number().positive().optional(),
  sl: z.number().positive().optional(),
  target: z.number().positive().optional(),
  qty: z.number().int().positive().optional(),
  outcome: z.enum(["OPEN", "TARGET_HIT", "SL_HIT", "PARTIAL_PROFIT", "BREAKEVEN", "MANUAL_EXIT"]).optional(),
  timeTaken: z.string().max(50).nullable().optional(),
  remark: z.string().max(2000).nullable().optional(),
  screenshots: z.array(z.string()).max(10).optional(),
  exitPrice: z.number().positive().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const user: any = await requireAuth();
    const owned = await verifyOwnership(id, user.id);
    if (!owned) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateTradeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Fetch current trade to recalculate P&L with merged values
    const current = await db.trade.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const merged = { ...current, ...parsed.data };
    const pnl = calculatePnL(
      merged.entry,
      merged.exitPrice,
      merged.qty,
      merged.outcome,
      merged.target,
      merged.sl
    );

    const updateData = {
      ...parsed.data,
      pnl,
      ...(parsed.data.date ? { date: new Date(parsed.data.date) } : {}),
    };

    const updated = await db.trade.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        date: updated.date.toISOString(),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

// ─── DELETE /api/trades/[id] ─────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const user: any = await requireAuth();
    const owned = await verifyOwnership(id, user.id);
    if (!owned) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    await db.trade.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id } });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}