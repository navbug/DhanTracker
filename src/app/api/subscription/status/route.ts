import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// ─── GET /api/subscription/status ────────────────────────────────────────────
// Always a fresh DB read — premium status can change the moment a payment
// is verified, so it must never be cached in the session JWT.

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { isAdmin: true, premiumUntil: true },
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const isPremium =
      dbUser.isAdmin || Boolean(dbUser.premiumUntil && dbUser.premiumUntil.getTime() > Date.now());

    return NextResponse.json({
      success: true,
      data: {
        isPremium,
        isAdmin: dbUser.isAdmin,
        premiumUntil: dbUser.premiumUntil ? dbUser.premiumUntil.toISOString() : null,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}
