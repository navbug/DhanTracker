"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Plus, AlertTriangle, Lock, Sparkles } from "lucide-react";
import { useTradeSetups, PremiumRequiredError } from "@/hooks/use-trade-setups";
import { useSubscriptionStatus } from "@/hooks/use-premium";
import { TradeSetupCard } from "@/components/trade-setups/trade-setup-card";
import { TradeSetupViewModal } from "@/components/trade-setups/trade-setup-view-modal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SETUP_STAGE_LABELS, type SetupStage, type TradeSetupPost } from "@/types";

// Form modal has react-hook-form + upload logic — lazy load, admin-only anyway
const TradeSetupFormModal = dynamic(
  () =>
    import("@/components/trade-setups/trade-setup-form-modal").then((m) => ({
      default: m.TradeSetupFormModal,
    })),
  { ssr: false }
);

const STAGES: SetupStage[] = ["UPCOMING", "LIVE", "PAST"];

export function TradeSetupsClient() {
  const router = useRouter();
  // Default to Live so first-time (non-Premium) visitors see real content
  // before hitting the Upcoming paywall.
  const [stage, setStage] = useState<SetupStage>("LIVE");
  const [viewPost, setViewPost] = useState<TradeSetupPost | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editPost, setEditPost] = useState<TradeSetupPost | null>(null);

  const { data: subscription } = useSubscriptionStatus();
  const isAdmin = subscription?.isAdmin ?? false;

  const { data: posts = [], isLoading, error } = useTradeSetups(stage);
  const isLocked = error instanceof PremiumRequiredError;

  const handleEdit = (post: TradeSetupPost) => {
    setViewPost(null);
    setEditPost(post);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditPost(null);
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-white">
          <h1 className="text-base font-semibold text-foreground flex-1">Trade Setups</h1>
          {isAdmin && (
            <Button
              onClick={() => {
                setEditPost(null);
                setFormOpen(true);
              }}
              size="sm"
              className="gap-1.5 text-xs h-7"
            >
              <Plus className="size-3" />
              Trade Setup
            </Button>
          )}
        </div>

        {/* Warning banner */}
        <div className="flex items-start gap-2 px-5 py-2.5 bg-amber-50 border-b border-amber-200">
          <AlertTriangle className="size-3.5 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Trade setups provided here are only for research and educational purposes.
          </p>
        </div>

        {/* Stage tabs */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-border bg-white">
          {STAGES.map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                stage === s
                  ? "bg-primary text-white border-primary"
                  : "bg-white border-border text-muted-foreground hover:border-muted-foreground"
              )}
            >
              {s === "UPCOMING" && <Lock className="size-3" />}
              {SETUP_STAGE_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {isLocked ? (
            <LockedUpcomingState onSubscribe={() => router.push("/premium")} />
          ) : isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-white overflow-hidden"
                  style={{ opacity: 1 - i * 0.08 }}
                >
                  <Skeleton className="h-36 w-full rounded-none" />
                  <div className="p-3.5 flex flex-col gap-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p className="text-sm text-muted-foreground">Failed to load trade setups</p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : posts.length === 0 ? (
            <EmptyState
              stage={stage}
              isAdmin={isAdmin}
              onNew={() => {
                setEditPost(null);
                setFormOpen(true);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {posts.map((post) => (
                <TradeSetupCard
                  key={post.id}
                  post={post}
                  isAdmin={isAdmin}
                  onOpen={setViewPost}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <TradeSetupViewModal
        post={viewPost}
        isAdmin={isAdmin}
        onClose={() => setViewPost(null)}
        onEdit={handleEdit}
      />

      {isAdmin && (
        <TradeSetupFormModal open={formOpen} onClose={handleFormClose} editPost={editPost} />
      )}
    </>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function LockedUpcomingState({ onSubscribe }: { onSubscribe: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
        <Lock className="size-7 text-primary/50" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Upcoming setups are a Premium feature</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Subscribe to get upcoming trade setups with proper chart marking, plus a WhatsApp update
          on every new setup added.
        </p>
      </div>
      <Button onClick={onSubscribe} size="sm" className="gap-1.5">
        <Sparkles className="size-3.5" />
        View Premium Plan
      </Button>
    </div>
  );
}

function EmptyState({
  stage,
  isAdmin,
  onNew,
}: {
  stage: SetupStage;
  isAdmin: boolean;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <p className="text-sm text-muted-foreground">
        No {SETUP_STAGE_LABELS[stage].toLowerCase()} trade setups yet
      </p>
      {isAdmin && (
        <Button onClick={onNew} size="sm" className="gap-1.5">
          <Plus className="size-3.5" />
          Add the first one
        </Button>
      )}
    </div>
  );
}
