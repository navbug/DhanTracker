"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SubscriptionStatus } from "@/types";
import { tradeSetupKeys } from "@/hooks/use-trade-setups";

// ─── READ: useSubscriptionStatus ─────────────────────────────────────────────

export const subscriptionKey = ["subscription", "status"] as const;

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: subscriptionKey,
    queryFn: async () => {
      const res = await fetch("/api/subscription/status");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to load subscription status");
      return json.data as SubscriptionStatus;
    },
    staleTime: 60 * 1000,
  });
}

// ─── RAZORPAY CHECKOUT LOADER ─────────────────────────────────────────────────

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ─── SUBSCRIBE FLOW ───────────────────────────────────────────────────────────
// One-time ₹49 UPI payment (via Razorpay Checkout, restricted to the UPI
// method so it opens straight into the QR / intent flow) that extends
// premiumUntil by 30 days on the server after signature verification.

export function useSubscribeToPremium() {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const subscribe = useCallback(async () => {
    setIsPending(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        toast.error("Could not load the payment window. Check your connection and try again.");
        return;
      }

      const orderRes = await fetch("/api/payments/create-order", { method: "POST" });
      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson.success) {
        throw new Error(orderJson.error ?? "Could not start checkout");
      }

      const { orderId, amount, currency, keyId, name, email } = orderJson.data;

      await new Promise<void>((resolve) => {
        const razorpay = new window.Razorpay!({
          key: keyId,
          order_id: orderId,
          amount,
          currency,
          name: "DhanTracker",
          description: "Premium Plan — Monthly",
          prefill: { name, email },
          // Restrict Checkout to UPI only — this opens straight into the
          // QR-scan / intent screen instead of showing cards, netbanking, etc.
          method: {
            netbanking: false,
            card: false,
            wallet: false,
            upi: true,
            paylater: false,
            emi: false,
          },
          theme: { color: "#13346C" }, // matches --primary in globals.css
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const verifyRes = await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(response),
              });
              const verifyJson = await verifyRes.json();
              if (!verifyRes.ok || !verifyJson.success) {
                throw new Error(verifyJson.error ?? "Payment verification failed");
              }
              toast.success("You're on Premium! Upcoming trade setups are now unlocked.");
              queryClient.invalidateQueries({ queryKey: subscriptionKey });
              queryClient.invalidateQueries({ queryKey: tradeSetupKeys.all });
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Payment verification failed");
            } finally {
              resolve();
            }
          },
          modal: {
            ondismiss: () => resolve(),
          },
        });
        razorpay.open();
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout");
    } finally {
      setIsPending(false);
    }
  }, [queryClient]);

  return { subscribe, isPending };
}
