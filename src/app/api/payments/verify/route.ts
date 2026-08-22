import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { verifyPaymentSignature, PREMIUM_DURATION_DAYS } from "@/lib/razorpay";

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

// ─── POST /api/payments/verify ────────────────────────────────────────────────
// Called from the Razorpay Checkout `handler` right after a successful
// payment. Verifies the signature, then extends premiumUntil by 30 days
// (stacking on top of any remaining premium time, not just from "now").

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid payment payload" }, { status: 400 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    const payment = await db.payment.findUnique({ where: { razorpayOrderId: razorpay_order_id } });
    if (!payment || payment.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Idempotent — if this order was already verified (e.g. webhook beat us to it), just return status.
    if (payment.status === "PAID") {
      const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { premiumUntil: true } });
      return NextResponse.json({
        success: true,
        data: { premiumUntil: dbUser?.premiumUntil?.toISOString() ?? null },
      });
    }

    const isValid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      await db.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", razorpayPaymentId: razorpay_payment_id },
      });
      return NextResponse.json({ success: false, error: "Payment verification failed" }, { status: 400 });
    }

    const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { premiumUntil: true } });
    const now = new Date();
    const base = dbUser?.premiumUntil && dbUser.premiumUntil.getTime() > now.getTime() ? dbUser.premiumUntil : now;
    const newPremiumUntil = new Date(base.getTime() + PREMIUM_DURATION_DAYS * 24 * 60 * 60 * 1000);

    await db.$transaction([
      db.payment.update({
        where: { id: payment.id },
        data: { status: "PAID", razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature },
      }),
      db.user.update({
        where: { id: user.id },
        data: { premiumUntil: newPremiumUntil },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { premiumUntil: newPremiumUntil.toISOString() },
    });
  } catch (err) {
    console.error("[payments/verify] Failed:", err);
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 500 });
  }
}
