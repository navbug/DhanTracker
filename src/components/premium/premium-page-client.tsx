"use client";

import { CheckCircle2, LineChart, Sparkles, ShieldCheck } from "lucide-react";
import { useSubscriptionStatus, useSubscribeToPremium } from "@/hooks/use-premium";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/index";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

// ─── DEMO CHART ILLUSTRATION ──────────────────────────────────────────────────
// Hand-drawn placeholder standing in for a real "chart marking" screenshot —
// shows the entry / target / SL convention used across published setups.

const CANDLES = [
  { x: 30, o: 190, c: 175, h: 195, l: 172 },
  { x: 65, o: 175, c: 185, h: 188, l: 170 },
  { x: 100, o: 185, c: 160, h: 190, l: 158 },
  { x: 135, o: 160, c: 168, h: 172, l: 155 },
  { x: 170, o: 168, c: 140, h: 170, l: 138 },
  { x: 205, o: 140, c: 150, h: 154, l: 136 },
  { x: 240, o: 150, c: 120, h: 152, l: 118 },
  { x: 275, o: 120, c: 130, h: 134, l: 116 },
  { x: 310, o: 130, c: 100, h: 132, l: 98 },
  { x: 345, o: 100, c: 108, h: 112, l: 96 },
  { x: 380, o: 108, c: 85, h: 110, l: 82 },
  { x: 415, o: 85, c: 92, h: 96, l: 80 },
  { x: 450, o: 92, c: 65, h: 94, l: 62 },
  { x: 485, o: 65, c: 72, h: 76, l: 60 },
  { x: 520, o: 72, c: 48, h: 74, l: 45 },
  { x: 555, o: 48, c: 54, h: 58, l: 42 },
  { x: 590, o: 54, c: 35, h: 56, l: 32 },
];

function DemoChartPreview() {
  return (
    <svg viewBox="0 0 640 230" className="w-full h-56" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="55" x2="640" y2="55" stroke="#E2E8F0" strokeWidth="1" />
      <line x1="0" y1="110" x2="640" y2="110" stroke="#E2E8F0" strokeWidth="1" />
      <line x1="0" y1="165" x2="640" y2="165" stroke="#E2E8F0" strokeWidth="1" />

      {CANDLES.map((k, i) => {
        const bullish = k.c < k.o;
        const bodyTop = Math.min(k.o, k.c);
        const bodyH = Math.max(Math.abs(k.o - k.c), 2);
        const color = bullish ? "#10B981" : "#EF4444";
        return (
          <g key={i}>
            <line x1={k.x} x2={k.x} y1={k.h} y2={k.l} stroke={color} strokeWidth="1.5" />
            <rect x={k.x - 5} y={bodyTop} width="10" height={bodyH} fill={color} rx="1" />
          </g>
        );
      })}

      {/* Target */}
      <line x1="0" y1="45" x2="640" y2="45" stroke="#10B981" strokeDasharray="5 4" strokeWidth="1.5" />
      <text x="10" y="36" fill="#10B981" fontSize="12" fontWeight="700">
        TARGET · ₹2,940
      </text>

      {/* Entry */}
      <line x1="0" y1="150" x2="640" y2="150" stroke="#3B82F6" strokeDasharray="5 4" strokeWidth="1.5" />
      <text x="10" y="141" fill="#3B82F6" fontSize="12" fontWeight="700">
        ENTRY · ₹2,715
      </text>

      {/* Stop loss */}
      <line x1="0" y1="205" x2="640" y2="205" stroke="#EF4444" strokeDasharray="5 4" strokeWidth="1.5" />
      <text x="10" y="220" fill="#EF4444" fontSize="12" fontWeight="700">
        SL · ₹2,650
      </text>
    </svg>
  );
}

// ─── FEATURES ─────────────────────────────────────────────────────────────────

const FEATURES = [
  "Upcoming trade setups with entry, stop loss & target clearly marked on the chart",
  "A WhatsApp update the moment a new trade setup is added",
  "Live and Past setups stay free for everyone, for reference and learning",
];

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export function PremiumPageClient() {
  const { data: subscription, isLoading } = useSubscriptionStatus();
  const { subscribe, isPending } = useSubscribeToPremium();

  const isPremium = subscription?.isPremium ?? false;
  const premiumUntil = subscription?.premiumUntil;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-6">
        {/* Heading */}
        <div className="text-center flex flex-col gap-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-1">
            <Sparkles className="size-5 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Premium Plan</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Get upcoming trade setups with proper chart marking. WhatsApp update on every new
            trade setup added.
          </p>
        </div>

        {/* Demo chart */}
        <div className="rounded-2xl border border-border bg-white shadow-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
            <LineChart className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Demo chart screenshot — sample setup marking
            </span>
          </div>
          <div className="p-4">
            <DemoChartPreview />
          </div>
        </div>

        {/* Features */}
        <div className="flex flex-col gap-2.5 px-1">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-start gap-2.5">
              <CheckCircle2 className="size-4 text-profit shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{f}</p>
            </div>
          ))}
        </div>

        {/* Subscribe card */}
        <div className="rounded-xl border border-border bg-white shadow-card p-5 flex flex-col items-center gap-3">
          {isLoading ? (
            <Skeleton className="h-11 w-full max-w-xs rounded-lg" />
          ) : subscription?.isAdmin ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" />
              You have full access as the site admin
            </div>
          ) : isPremium ? (
            <>
              <Badge variant="profit" className="gap-1">
                <Sparkles className="size-3" />
                Premium Active
              </Badge>
              {premiumUntil && (
                <p className="text-xs text-muted-foreground">
                  Valid until {formatDate(premiumUntil)}
                </p>
              )}
              <Button
                onClick={subscribe}
                loading={isPending}
                size="lg"
                variant="outline"
                className="w-full max-w-xs"
              >
                Renew for another month — ₹49
              </Button>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground text-center">
                <ShieldCheck className="size-3 shrink-0" />
                Pay securely via UPI — scan the QR code in the Razorpay checkout window
              </div>
            </>
          ) : (
            <>
              <Button onClick={subscribe} loading={isPending} size="lg" className="w-full max-w-xs">
                Subscribe @ ₹49/month
              </Button>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground text-center">
                <ShieldCheck className="size-3 shrink-0" />
                Pay securely via UPI — scan the QR code in the Razorpay checkout window
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
