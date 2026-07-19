"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Play,
  X,
  BookOpen,
  BarChart3,
  Eye,
  TrendingUp,
  ArrowRight,
  Shield,
  Zap,
  Target,
  CheckCircle2,
  Presentation,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// AuthForm pulls in react-hook-form + zod — lazy load so landing hero paints first
const AuthForm = dynamic(
  () =>
    import("@/components/auth/auth-form").then((m) => ({
      default: m.AuthForm,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    ),
  },
);

// ─── VIDEO MODAL ─────────────────────────────────────────────────────────────

function VideoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Modal content */}
      <div
        className="relative z-10 w-full max-w-3xl mx-4 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
        >
          <X className="size-4" />
        </button>
        {/* Placeholder video — replace with actual demo video URL */}
        <div className="aspect-video bg-navy-950 flex items-center justify-center">
          <div className="text-center text-white/60">
            <Play className="size-16 mb-3 mx-auto opacity-40" />
            <p className="text-sm">Demo video coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FEATURE CARDS ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: BookOpen,
    title: "Trading Ledger",
    description:
      "Log every trade with setup type, priority, entry/exit data, screenshots & remarks. Track P&L instantly.",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    icon: Eye,
    title: "Custom Watchlists",
    description:
      "Build custom watchlists. Drag-to-reorder, add notes per stock, refresh in one click.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
  {
    icon: BarChart3,
    title: "Dashboard",
    description:
      "Accuracy by trade setup, Net P&L, best trades, and sector weightage at a glance.",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
  },
  {
    icon: Presentation,
    title: "Research Whiteboards",
    description:
      "Do research and auto-save your research across multiple categories: Market, Stocks.",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
] as const;

// ─── TRUST BADGES ────────────────────────────────────────────────────────────

const TRUST = [
  { icon: Shield, label: "Secure & Private" },
  { icon: Zap, label: "Real-time NSE data" },
  { icon: Target, label: "Built for rule traders" },
];

// ─── MAIN LANDING PAGE ────────────────────────────────────────────────────────

export function LandingPage() {
  const [videoOpen, setVideoOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  return (
    <div className="landing-gradient min-h-screen flex flex-col">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/60 bg-white/60 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp className="size-4 text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-foreground">
            DhanTracker
          </span>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <a
            href="#features"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-accent"
          >
            Features
          </a>
          <a
            href="mailto:support@dhantracker.com"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-accent"
          >
            Contact Us
          </a>
        </nav>
      </header>

      {/* ── HERO SECTION ─────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col">
        <section className="flex-1 container mx-auto px-6 py-8 xl:py-12 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 xl:gap-12 items-start">
            {/* ── LEFT: Branding + Video ── */}
            <div className="flex flex-col gap-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Built for Rule-Based Traders
              </div>

              {/* Heading */}
              <div className="flex flex-col gap-3">
                <h1 className="font-display text-4xl xl:text-5xl font-bold leading-tight tracking-tight text-foreground">
                  Your Trading Journal,{" "}
                  <span className="text-primary relative">
                    Perfected.
                    <svg
                      className="absolute -bottom-1 left-0 w-full"
                      viewBox="0 0 200 8"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M1 5.5C40 2 80 1 100 1.5C120 2 160 3.5 199 6"
                        stroke="hsl(218 70% 25%)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        opacity="0.4"
                      />
                    </svg>
                  </span>
                </h1>
                <p className="my-3 text-base xl:text-lg text-muted-foreground leading-relaxed max-w-md">
                  Trade Ledger + Custom Watchlists + Research Whiteboards. All
                  the tools serious traders need, in one clean interface.
                </p>
              </div>

              {/* ── Demo video thumbnail ── */}
              <div className="relative group">
                <div
                  className="relative rounded-xl overflow-hidden border border-border bg-navy-900 aspect-video cursor-pointer shadow-lg hover:shadow-xl transition-shadow duration-300"
                  onClick={() => setVideoOpen(true)}
                >
                  {/* Thumbnail placeholder — replace with actual thumbnail */}
                  <div className="absolute inset-0 bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 flex items-center justify-center">
                    {/* Mock UI preview */}
                    <div className="w-full h-full p-4 opacity-60">
                      <div className="flex gap-2 mb-3">
                        <div className="h-2 w-16 bg-white/20 rounded" />
                        <div className="h-2 w-10 bg-white/10 rounded" />
                        <div className="h-2 w-12 bg-white/10 rounded" />
                      </div>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="bg-white/10 rounded-lg p-2">
                            <div className="h-1.5 w-8 bg-white/20 rounded mb-1" />
                            <div className="h-3 w-12 bg-white/30 rounded" />
                          </div>
                        ))}
                      </div>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex gap-2 mb-1.5">
                          <div className="h-1.5 w-10 bg-white/15 rounded" />
                          <div className="h-1.5 w-16 bg-white/15 rounded" />
                          <div className="h-1.5 w-8 bg-emerald-400/30 rounded" />
                          <div className="h-1.5 w-12 bg-white/10 rounded" />
                        </div>
                      ))}
                    </div>

                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-white/30 transition-all duration-300 shadow-lg">
                        <Play
                          className="size-6 text-white ml-0.5"
                          fill="white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Caption */}
                <p className="text-xs text-muted-foreground text-center mt-2">
                  ↑ Click to watch a 2-minute demo
                </p>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center gap-4">
                {TRUST.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <Icon className="size-3.5 text-primary/70" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: Auth form ── */}
            <div className="lg:sticky lg:top-6">
              <div
                className="rounded-2xl border border-border bg-white shadow-auth p-6"
                style={{ minHeight: "420px" }}
              >
                {/* Form header */}
                <div className="flex flex-col gap-1 mb-5">
                  <h2 className="font-semibold text-lg text-foreground">
                    {authTab === "login"
                      ? "Welcome to Dhan Tracker"
                      : "Start your journey"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {authTab === "login"
                      ? "Enter your credentials"
                      : "Create a free account today"}
                  </p>
                </div>

                {/* ── Demo credentials ── */}
                <div className="mt-2 mb-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
                  <p className="text-xs font-medium text-primary mb-2">
                    Try it with demo credentials
                  </p>
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Email</span>
                      <span className="font-mono text-foreground">
                        ghostcube898@gmail.com
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Password</span>
                      <span className="font-mono text-foreground">
                        passcode
                      </span>
                    </div>
                  </div>
                </div>

                <AuthForm defaultTab={authTab} />

                {/* Switch between login/register */}
                <p className="text-center text-xs text-muted-foreground mt-4">
                  {authTab === "login" ? (
                    <>
                      Don&apos;t have an account?{" "}
                      <button
                        onClick={() => setAuthTab("register")}
                        className="text-primary hover:underline font-medium"
                      >
                        Register
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        onClick={() => setAuthTab("login")}
                        className="text-primary hover:underline font-medium"
                      >
                        Login
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES SECTION ──────────────────────────────────── */}
        <section
          id="features"
          className="relative z-10 border-t border-border/60 bg-white/60 backdrop-blur-sm py-12"
        >
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-8">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">
                Everything you need
              </p>
              <h2 className="font-display font-bold text-2xl text-foreground">
                Key Features
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className={cn(
                      "group rounded-xl p-5 border transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 cursor-default",
                      "bg-white border-border",
                    )}
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center mb-3",
                        feature.bg,
                        feature.border,
                        "border",
                      )}
                    >
                      <Icon className={cn("size-4", feature.color)} />
                    </div>
                    <h3 className="font-semibold text-sm text-foreground mb-1.5">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                onClick={() =>
                  document
                    .querySelector("#auth-form")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm"
              >
                Get started for free
                <ArrowRight className="size-3.5" />
              </button>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {[
                  "No credit card required",
                  "Free forever",
                  "Real-time NSE data",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-profit" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────────────── */}
        <footer className="relative z-10 border-t border-border/60 py-5">
          <div className="container mx-auto px-6 max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
                <TrendingUp className="size-3 text-white" />
              </div>
              <span className="font-display font-bold text-sm text-foreground">
                DhanTracker
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} DhanTracker. Built for Indian
              rule-based traders.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <a
                href="mailto:support@dhantracker.com"
                className="hover:text-foreground transition-colors"
              >
                Contact
              </a>
              <span>Privacy</span>
              <span>Terms</span>
            </div>
          </div>
        </footer>
      </main>

      {/* Video modal */}
      <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} />
    </div>
  );
}
