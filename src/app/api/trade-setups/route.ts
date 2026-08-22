import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin, isPremiumActive } from "@/lib/auth";
import type { TradeSetupPost } from "@prisma/client";

const stageEnum = z.enum(["UPCOMING", "LIVE", "PAST"]);

const createSchema = z
  .object({
    stockSymbol: z
      .string()
      .min(1, "Stock symbol is required")
      .max(30)
      .transform((s) => s.toUpperCase().trim()),
    companyName: z.string().max(200).optional().nullable(),
    description: z.string().max(2000).optional().nullable(),
    stage: stageEnum,
    chartImageUrl: z.string().url("Chart image is required"),
    resultChartImageUrl: z.string().url().optional().nullable(),
  })
  .refine((data) => data.stage !== "PAST" || Boolean(data.resultChartImageUrl), {
    message: "Result chart image is required for Past setups",
    path: ["resultChartImageUrl"],
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

// ─── GET /api/trade-setups?stage=UPCOMING|LIVE|PAST ──────────────────────────
// UPCOMING is gated behind an active Premium subscription (admins bypass).

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stageParam = searchParams.get("stage");
    const parsedStage = stageEnum.safeParse(stageParam);

    if (!parsedStage.success) {
      return NextResponse.json(
        { success: false, error: "A valid ?stage= query param is required" },
        { status: 400 }
      );
    }
    const stage = parsedStage.data;

    if (stage === "UPCOMING") {
      const premium = await isPremiumActive(user.id);
      if (!premium) {
        return NextResponse.json(
          {
            success: false,
            error: "premium_required",
            message: "Subscribe to Premium to view upcoming trade setups.",
          },
          { status: 402 }
        );
      }
    }

    const posts = await db.tradeSetupPost.findMany({
      where: { stage },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: posts.map(serialize) });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

// ─── POST /api/trade-setups — admin only ─────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    if (!user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { stockSymbol, companyName, description, stage, chartImageUrl, resultChartImageUrl } =
      parsed.data;

    const post = await db.tradeSetupPost.create({
      data: {
        stockSymbol,
        companyName: companyName ?? null,
        description: description ?? null,
        stage,
        chartImageUrl,
        resultChartImageUrl: stage === "PAST" ? resultChartImageUrl ?? null : null,
        createdById: user.id,
      },
    });

    return NextResponse.json({ success: true, data: serialize(post) }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}
