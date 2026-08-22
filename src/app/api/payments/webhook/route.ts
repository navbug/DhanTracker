import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature, PREMIUM_DURATION_DAYS } from "@/lib/razorpay";

// ─── POST /api/payments/webhook ──────────────────────────────────────────────
// Safety net for the "browser closed right after paying" case where the
// client never calls /api/payments/verify. Configure this URL + a webhook
// secret in the Razorpay Dashboard (Settings → Webhooks), subscribed to the
// `payment.captured` event, and set RAZORPAY_WEBHOOK_SECRET to match.
//
// Idempotent: if /verify already marked the payment PAID, this is a no-op.

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature || !verifyWebhookSignature({ rawBody, signature })) {
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    if (event.event !== "payment.captured") {
      // Acknowledge other event types without acting on them.
      return NextResponse.json({ success: true, data: { ignored: true } });
    }

    const paymentEntity = event.payload?.payment?.entity;
    const orderId: string | undefined = paymentEntity?.order_id;
    const paymentId: string | undefined = paymentEntity?.id;

    if (!orderId || !paymentId) {
      return NextResponse.json({ success: false, error: "Malformed payload" }, { status: 400 });
    }

    const payment = await db.payment.findUnique({ where: { razorpayOrderId: orderId } });
    if (!payment) {
      // Order not created via our API — ignore rather than error.
      return NextResponse.json({ success: true, data: { ignored: true } });
    }

    if (payment.status === "PAID") {
      return NextResponse.json({ success: true, data: { alreadyProcessed: true } });
    }

    const user = await db.user.findUnique({ where: { id: payment.userId }, select: { premiumUntil: true } });
    const now = new Date();
    const base = user?.premiumUntil && user.premiumUntil.getTime() > now.getTime() ? user.premiumUntil : now;
    const newPremiumUntil = new Date(base.getTime() + PREMIUM_DURATION_DAYS * 24 * 60 * 60 * 1000);

    await db.$transaction([
      db.payment.update({
        where: { id: payment.id },
        data: { status: "PAID", razorpayPaymentId: paymentId },
      }),
      db.user.update({
        where: { id: payment.userId },
        data: { premiumUntil: newPremiumUntil },
      }),
    ]);

    return NextResponse.json({ success: true, data: { processed: true } });
  } catch (err) {
    console.error("[payments/webhook] Failed:", err);
    return NextResponse.json({ success: false, error: "Webhook processing failed" }, { status: 500 });
  }
}
