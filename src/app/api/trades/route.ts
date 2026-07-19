import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

// ─── ZOD SCHEMAS ─────────────────────────────────────────────────────────────

const createTradeSchema = z.object({
  date: z.string().datetime({ offset: true }).or(z.string().date()),
  stock: z.string().min(1).max(30).transform((s) => s.toUpperCase().trim()),
  tradeSetup: z.enum(["QUICK_TRADE", "HIT", "DIT", "WIT", "MIT", "QIT", "HVIT", "YIT"]),
  priority: z.enum(["MUST_TRADE", "HIGH", "MEDIUM", "LOW"]),
  entry: z.number().positive("Entry must be positive"),
  sl: z.number().positive("Stop loss must be positive"),
  target: z.number().positive("Target must be positive"),
  qty: z.number().int().positive("Quantity must be a positive integer"),
  outcome: z.enum(["OPEN", "TARGET_HIT", "SL_HIT", "PARTIAL_PROFIT", "BREAKEVEN", "MANUAL_EXIT"]).default("OPEN"),
  timeTaken: z.string().max(50).optional(),
  remark: z.string().max(2000).optional(),
  screenshots: z.array(z.string().url()).max(10).default([]),
  exitPrice: z.number().positive().optional(),
});

// ─── P&L CALCULATOR ──────────────────────────────────────────────────────────

function calculatePnL(
  entry: number,
  exitPrice: number | undefined,
  qty: number,
  outcome: string,
  target: number,
  sl: number
): number | null {
  if (outcome === "OPEN") return null;

  let exit = exitPrice;

  // Use target/SL if no exitPrice provided
  if (!exit) {
    if (outcome === "TARGET_HIT") exit = target;
    else if (outcome === "SL_HIT") exit = sl;
    else if (outcome === "BREAKEVEN") exit = entry;
    else return null; // PARTIAL_PROFIT or MANUAL_EXIT require exitPrice
  }

  return (exit - entry) * qty;
}

// ─── GET /api/trades ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);

    const outcome = searchParams.get("outcome"); // "OPEN"|"TARGET_HIT"|"SL_HIT"|...
    const setup = searchParams.get("setup");
    const search = searchParams.get("q");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 200);

    const where: Prisma.TradeWhereInput = { userId: user.id };

    if (outcome && outcome !== "all") {
      // Support shorthand: "won" = TARGET_HIT|PARTIAL_PROFIT|BREAKEVEN|MANUAL_EXIT with positive PnL
      if (outcome === "won") {
        where.outcome = { in: ["TARGET_HIT", "PARTIAL_PROFIT", "BREAKEVEN", "MANUAL_EXIT"] };
        where.pnl = { gt: 0 };
      } else if (outcome === "lost") {
        where.outcome = { in: ["SL_HIT", "PARTIAL_PROFIT", "MANUAL_EXIT"] };
        where.pnl = { lt: 0 };
      } else if (outcome === "open") {
        where.outcome = "OPEN";
      } else {
        where.outcome = outcome as Prisma.EnumTradeOutcomeFilter;
      }
    }

    if (setup && setup !== "all") {
      where.tradeSetup = setup as Prisma.EnumTradeSetupFilter;
    }

    if (search) {
      where.stock = { contains: search.toUpperCase(), mode: "insensitive" };
    }

    const [trades, total] = await Promise.all([
      db.trade.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.trade.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: trades.map((t) => ({
        ...t,
        date: t.date.toISOString(),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

// ─── POST /api/trades ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const parsed = createTradeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const pnl = calculatePnL(data.entry, data.exitPrice, data.qty, data.outcome, data.target, data.sl);

    const trade = await db.trade.create({
      data: {
        userId: user.id,
        date: new Date(data.date),
        stock: data.stock,
        tradeSetup: data.tradeSetup,
        priority: data.priority,
        entry: data.entry,
        sl: data.sl,
        target: data.target,
        qty: data.qty,
        outcome: data.outcome,
        timeTaken: data.timeTaken,
        remark: data.remark,
        screenshots: data.screenshots,
        exitPrice: data.exitPrice,
        pnl,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...trade,
          date: trade.date.toISOString(),
          createdAt: trade.createdAt.toISOString(),
          updatedAt: trade.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}
