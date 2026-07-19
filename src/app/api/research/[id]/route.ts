import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

async function verifyOwnership(id: string, userId: string) {
  const board = await db.research.findUnique({ where: { id }, select: { userId: true } });
  if (!board || board.userId !== userId) return null;
  return board;
}

// ─── GET /api/research/[id] — full board including canvas JSON ────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const board = await db.research.findUnique({ where: { id: params.id } });
    if (!board || board.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: {
        ...board,
        createdAt: board.createdAt.toISOString(),
        updatedAt: board.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

// ─── PATCH /api/research/[id] — update title, description, canvas, thumbnail ─

const updateSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  category: z.enum(["MARKET", "SECTOR", "STOCK", "PERSONAL"]).optional(),
  description: z.string().max(2000).nullable().optional(),
  canvas: z.unknown().optional(),     // tldraw TLStoreSnapshot
  thumbnail: z.string().nullable().optional(), // base64 or S3 URL
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const owned = await verifyOwnership(params.id, user.id);
    if (!owned) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed" },
        { status: 400 }
      );
    }

    const updated = await db.research.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.canvas !== undefined ? { canvas: parsed.data.canvas as never } : {}),
        ...(parsed.data.thumbnail !== undefined ? { thumbnail: parsed.data.thumbnail } : {}),
      },
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        thumbnail: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { ...updated, updatedAt: updated.updatedAt.toISOString() },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

// ─── DELETE /api/research/[id] ───────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const owned = await verifyOwnership(params.id, user.id);
    if (!owned) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    await db.research.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}
