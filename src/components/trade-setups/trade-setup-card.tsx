"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useDeleteTradeSetup } from "@/hooks/use-trade-setups";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SETUP_STAGE_LABELS, type TradeSetupPost, type SetupStage } from "@/types";

const STAGE_BADGE: Record<SetupStage, string> = {
  UPCOMING: "bg-amber-50 text-amber-700 border-amber-200",
  LIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PAST: "bg-slate-100 text-slate-600 border-slate-200",
};

interface TradeSetupCardProps {
  post: TradeSetupPost;
  isAdmin: boolean;
  onOpen: (post: TradeSetupPost) => void;
  onEdit: (post: TradeSetupPost) => void;
}

export function TradeSetupCard({ post, isAdmin, onOpen, onEdit }: TradeSetupCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const deleteMutation = useDeleteTradeSetup();

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(post.id);
    setDeleteConfirm(false);
  };

  return (
    <>
      <div
        className="group rounded-xl border border-border bg-white shadow-card hover:shadow-card-hover transition-all cursor-pointer overflow-hidden"
        onClick={() => onOpen(post)}
      >
        {/* Chart thumbnail */}
        <div className="relative w-full h-36 bg-muted overflow-hidden flex items-center justify-center">
          <ImageIcon className="absolute size-8 text-muted-foreground/20" />
          <img
            src={post.chartImageUrl}
            alt={`${post.stockSymbol} chart`}
            className="relative w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span
            className={cn(
              "absolute top-2 right-2 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
              STAGE_BADGE[post.stage]
            )}
          >
            {SETUP_STAGE_LABELS[post.stage]}
          </span>
        </div>

        {/* Card body */}
        <div className="p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate leading-snug">
                <span className="font-mono">{post.stockSymbol}</span>
                {post.description && (
                  <span className="text-muted-foreground font-normal"> — {post.description}</span>
                )}
              </h3>
              {post.companyName && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{post.companyName}</p>
              )}
            </div>

            {isAdmin && (
              <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-all opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="size-4" />
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg border border-border shadow-lg p-1 w-32">
                      <button
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded transition-colors"
                        onClick={() => {
                          setMenuOpen(false);
                          onEdit(post);
                        }}
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </button>
                      <div className="h-px bg-border my-1" />
                      <button
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded transition-colors"
                        onClick={() => {
                          setMenuOpen(false);
                          setDeleteConfirm(true);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground/50 mt-2">
            Updated {formatDistanceToNow(new Date(post.updatedAt), { addSuffix: true })}
          </p>
        </div>
      </div>

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
