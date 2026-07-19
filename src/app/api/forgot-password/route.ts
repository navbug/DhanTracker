import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
});

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid email address" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();

    // Always return success — never reveal whether email exists
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, password: true },
    });

    // Only send email if user exists and has a password (not OAuth-only)
    if (user?.password) {
      // Invalidate any existing unused tokens for this email
      await db.passwordResetToken.updateMany({
        where: { email, used: false },
        data: { used: true },
      });

      // Create new token
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + TOKEN_EXPIRY_MS);

      await db.passwordResetToken.create({
        data: { email, token, expires },
      });

      // Send email (non-blocking — don't fail the request if email fails)
      await sendPasswordResetEmail(email, token).catch((err) => {
        console.error("[FORGOT PASSWORD] Email send failed:", err);
      });
    }

    // Return success regardless so we don't leak whether email is registered
    return NextResponse.json({
      success: true,
      message: "If an account exists, a reset link has been sent.",
    });
  } catch (err) {
    console.error("[FORGOT PASSWORD] Error:", err);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}