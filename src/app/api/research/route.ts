import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const createSchema = z.object({
  title: z.string().min(1, "Title required").max(200).trim(),
  category: z.enum(["MARKET", "SECTOR", "STOCK", "PERSONAL"]),
  description: z.string().max(2000).optional().nullable(),
});

// ─── GET /api/research ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("q");

    const boards = await db.research.findMany({
      where: {
        userId: user.id,
        ...(category && category !== "all" ? { category: category as never } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        thumbnail: true,
        createdAt: true,
        updatedAt: true,
        // canvas intentionally excluded from list — only loaded on detail
      },
    });

    return NextResponse.json({ success: true, data: boards });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

// ─── POST /api/research ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const board = await db.research.create({
      data: {
        userId: user.id,
        title: parsed.data.title,
        category: parsed.data.category,
        description: parsed.data.description ?? null,
      },
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        thumbnail: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: board }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}
