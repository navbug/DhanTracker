import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const upsertSchema = z.object({
  symbol: z.string().min(1).max(30).transform((s) => s.toUpperCase().trim()),
  note: z.string().max(2000).nullable(),
});

// ─── GET /api/stock-notes ─────────────────────────────────────────────────────
// Returns all notes for the authenticated user as { [symbol]: note }.
// Called once at app boot to populate the client-side notes store.

export async function GET() {
  try {
    const user = await requireAuth();

    const notes = await db.stockNote.findMany({
      where: { userId: user.id },
      select: { symbol: true, note: true },
    });

    const data = Object.fromEntries(notes.map((n) => [n.symbol, n.note]));

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

// ─── PUT /api/stock-notes ─────────────────────────────────────────────────────
// Upserts a note for a symbol. Passing note: null deletes the note.

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { symbol, note } = parsed.data;

    if (!note) {
      // Delete the note if it exists
      await db.stockNote.deleteMany({ where: { userId: user.id, symbol } });
      return NextResponse.json({ success: true, data: { symbol, note: null } });
    }

    // Upsert
    const saved = await db.stockNote.upsert({
      where: { userId_symbol: { userId: user.id, symbol } },
      create: { userId: user.id, symbol, note },
      update: { note },
      select: { symbol: true, note: true },
    });

    return NextResponse.json({ success: true, data: saved });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}