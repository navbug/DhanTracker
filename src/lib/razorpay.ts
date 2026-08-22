import Razorpay from "razorpay";
import crypto from "crypto";

// ─── PREMIUM PLAN ────────────────────────────────────────────────────────────

export const PREMIUM_PLAN_AMOUNT_PAISE = 4900; // ₹49
export const PREMIUM_PLAN_CURRENCY = "INR";
export const PREMIUM_DURATION_DAYS = 30;

// ─── SDK SINGLETON ───────────────────────────────────────────────────────────

const globalForRazorpay = globalThis as unknown as {
  razorpay: Razorpay | undefined;
};

function getRazorpayClient(): Razorpay {
  if (globalForRazorpay.razorpay) return globalForRazorpay.razorpay;

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error(
      "Razorpay is not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET"
    );
  }

  const instance = new Razorpay({ key_id, key_secret });
  globalForRazorpay.razorpay = instance;
  return instance;
}

export const razorpay = new Proxy({} as Razorpay, {
  get(_target, prop) {
    const client = getRazorpayClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any)[prop];
  },
});

// ─── SIGNATURE VERIFICATION ──────────────────────────────────────────────────
// Standard Checkout flow: HMAC-SHA256("order_id|payment_id", key_secret)
// must match the razorpay_signature returned to the client's handler.

export function verifyPaymentSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_secret) return false;

  const expected = crypto
    .createHmac("sha256", key_secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    // Buffers of mismatched length throw — definitely not equal
    return false;
  }
}

/**
 * Verifies the `X-Razorpay-Signature` header on incoming webhook requests.
 * Must be computed over the *raw* request body (before JSON parsing).
 */
export function verifyWebhookSignature({
  rawBody,
  signature,
}: {
  rawBody: string;
  signature: string;
}): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return false;

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
