import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { razorpay, PREMIUM_PLAN_AMOUNT_PAISE, PREMIUM_PLAN_CURRENCY } from "@/lib/razorpay";

// ─── POST /api/payments/create-order ─────────────────────────────────────────
// Creates a ₹49 Razorpay order for the Premium plan. The client opens
// Razorpay Checkout (restricted to UPI) with the returned order id.

export async function POST() {
  try {
    const user = await requireAuth();
    if (!user.id || !user.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { success: false, error: "Payments are not configured yet. Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET." },
        { status: 503 }
      );
    }

    const order = await razorpay.orders.create({
      amount: PREMIUM_PLAN_AMOUNT_PAISE,
      currency: PREMIUM_PLAN_CURRENCY,
      receipt: `premium_${user.id}_${Date.now()}`,
      notes: { userId: user.id, plan: "premium_monthly" },
    });

    await db.payment.create({
      data: {
        userId: user.id,
        razorpayOrderId: order.id,
        amount: PREMIUM_PLAN_AMOUNT_PAISE,
        currency: PREMIUM_PLAN_CURRENCY,
        status: "CREATED",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        name: user.name ?? "",
        email: user.email,
      },
    });
  } catch (err) {
    console.error("[create-order] Failed:", err);
    return NextResponse.json({ success: false, error: "Could not create order" }, { status: 500 });
  }
}
