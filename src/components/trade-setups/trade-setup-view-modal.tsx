"use client";

import { useState } from "react";
import { Pencil, Trash2, ImageIcon } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useDeleteTradeSetup } from "@/hooks/use-trade-setups";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/index";
import { SETUP_STAGE_LABELS, type TradeSetupPost, type SetupStage } from "@/types";

const STAGE_BADGE_VARIANT: Record<SetupStage, "warning" | "profit" | "secondary"> = {
  UPCOMING: "warning",
  LIVE: "profit",
  PAST: "secondary",
};

function ChartImage({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </p>
      <div className="relative w-full aspect-video rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center">
        <ImageIcon className="absolute size-8 text-muted-foreground/20" />
        <img
          src={url}
          alt={label}
          className="relative w-full h-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    </div>
  );
}

interface TradeSetupViewModalProps {
  post: TradeSetupPost | null;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: (post: TradeSetupPost) => void;
}

export function TradeSetupViewModal({ post, isAdmin, onClose, onEdit }: TradeSetupViewModalProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const deleteMutation = useDeleteTradeSetup();

  if (!post) return null;

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(post.id);
    setDeleteConfirm(false);
    onClose();
  };

  return (
    <>
      <Dialog open={Boolean(post)} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 flex-wrap pr-6">
              <DialogTitle className="text-base font-semibold">
                <span className="font-mono">{post.stockSymbol}</span>
                {post.description && (
                  <span className="text-muted-foreground font-normal"> — {post.description}</span>
                )}
              </DialogTitle>
              <Badge variant={STAGE_BADGE_VARIANT[post.stage]}>{SETUP_STAGE_LABELS[post.stage]}</Badge>
            </div>
            {post.companyName && (
              <p className="text-sm text-muted-foreground">{post.companyName}</p>
            )}
          </DialogHeader>

          {/* Images — dual before/after for Past, single for Upcoming/Live */}
          {post.stage === "PAST" && post.resultChartImageUrl ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <ChartImage label="Before entry" url={post.chartImageUrl} />
              <ChartImage label="After result" url={post.resultChartImageUrl} />
            </div>
          ) : (
            <ChartImage label="Chart" url={post.chartImageUrl} />
          )}

          <p className="text-xs text-muted-foreground/60">
            Published {formatDate(post.createdAt)}
          </p>

          {isAdmin && (
            <DialogFooter className="gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => onEdit(post)}
              >
                <Pencil className="size-3.5" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {isAdmin && (
        <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete this trade setup?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono font-medium text-foreground">{post.stockSymbol}</span> will
              be permanently removed for all users.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                loading={deleteMutation.isPending}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
