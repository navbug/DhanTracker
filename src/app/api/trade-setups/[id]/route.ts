import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin, isPremiumActive } from "@/lib/auth";
import type { TradeSetupPost } from "@prisma/client";

const stageEnum = z.enum(["UPCOMING", "LIVE", "PAST"]);

const updateSchema = z.object({
  stockSymbol: z
    .string()
    .min(1)
    .max(30)
    .transform((s) => s.toUpperCase().trim())
    .optional(),
  companyName: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  stage: stageEnum.optional(),
  chartImageUrl: z.string().url().optional(),
  resultChartImageUrl: z.string().url().nullable().optional(),
});

function serialize(post: TradeSetupPost) {
  return {
    id: post.id,
    stockSymbol: post.stockSymbol,
    companyName: post.companyName,
    description: post.description,
    stage: post.stage,
    chartImageUrl: post.chartImageUrl,
    resultChartImageUrl: post.resultChartImageUrl,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/trade-setups/[id] ───────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    if (!user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const post = await db.tradeSetupPost.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (post.stage === "UPCOMING") {
      const premium = await isPremiumActive(user.id);
      if (!premium) {
        return NextResponse.json(
          { success: false, error: "premium_required", message: "Subscribe to Premium to view this setup." },
          { status: 402 }
        );
      }
    }

    return NextResponse.json({ success: true, data: serialize(post) });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

// ─── PATCH /api/trade-setups/[id] — admin only ───────────────────────────────

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await requireAdmin();

    const current = await db.tradeSetupPost.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const merged = { ...current, ...parsed.data };

    // Cross-field rule: PAST requires a result chart; anything else must not keep one.
    if (merged.stage === "PAST" && !merged.resultChartImageUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: { resultChartImageUrl: ["Result chart image is required for Past setups"] },
        },
        { status: 400 }
      );
    }

    const updated = await db.tradeSetupPost.update({
      where: { id },
      data: {
        ...parsed.data,
        resultChartImageUrl: merged.stage === "PAST" ? merged.resultChartImageUrl : null,
      },
    });

    return NextResponse.json({ success: true, data: serialize(updated) });
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

// ─── DELETE /api/trade-setups/[id] — admin only ──────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await requireAdmin();

    const existing = await db.tradeSetupPost.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    await db.tradeSetupPost.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}
