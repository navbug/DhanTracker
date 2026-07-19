"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useDeleteBoard, type ResearchBoard } from "@/hooks/use-research";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RESEARCH_CATEGORY_LABELS, type ResearchCategory } from "@/types";

// ─── CATEGORY COLORS ─────────────────────────────────────────────────────────

const CATEGORY_STYLE: Record<ResearchCategory, { badge: string; bg: string; emoji: string }> = {
  MARKET: {
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    bg: "from-blue-50/80 to-transparent",
    emoji: "📈",
  },
  SECTOR: {
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    bg: "from-violet-50/80 to-transparent",
    emoji: "🏭",
  },
  STOCK: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    bg: "from-emerald-50/80 to-transparent",
    emoji: "🎯",
  },
  PERSONAL: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    bg: "from-amber-50/80 to-transparent",
    emoji: "📓",
  },
};

// ─── EMPTY CANVAS PREVIEW ────────────────────────────────────────────────────

function CanvasPreview({ thumbnail, category }: { thumbnail?: string | null; category: ResearchCategory }) {
  const style = CATEGORY_STYLE[category];

  if (thumbnail) {
    return (
      <div className="relative w-full h-36 overflow-hidden rounded-t-xl bg-muted">
        <img
          src={thumbnail}
          alt="Board preview"
          className="w-full h-full object-cover object-top"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    );
  }

  // No thumbnail — show decorative placeholder
  return (
    <div
      className={cn(
        "w-full h-36 rounded-t-xl bg-gradient-to-br flex items-center justify-center",
        style.bg,
        "bg-muted/30"
      )}
    >
      <span className="text-4xl opacity-30 select-none">{style.emoji}</span>
    </div>
  );
}

// ─── BOARD CARD ───────────────────────────────────────────────────────────────

interface BoardCardProps {
  board: ResearchBoard;
  onEdit: (board: ResearchBoard) => void;
  onOpen: (id: string) => void;
}

export function BoardCard({ board, onEdit, onOpen }: BoardCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const deleteMutation = useDeleteBoard();
  const style = CATEGORY_STYLE[board.category];

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(board.id);
    setDeleteConfirm(false);
  };

  return (
    <>
      <div
        className="group rounded-xl border border-border bg-white shadow-card hover:shadow-card-hover transition-all cursor-pointer overflow-hidden"
        onClick={() => onOpen(board.id)}
      >
        {/* Canvas preview */}
        <CanvasPreview thumbnail={board.thumbnail} category={board.category} />

        {/* Card body */}
        <div className="p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Category badge */}
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                    style.badge
                  )}
                >
                  {style.emoji} {RESEARCH_CATEGORY_LABELS[board.category]}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-foreground truncate leading-snug">
                {board.title}
              </h3>

              {/* Description */}
              {board.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                  {board.description}
                </p>
              )}
            </div>

            {/* Actions menu */}
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
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg border border-border shadow-lg p-1 w-36">
                    <button
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded transition-colors"
                      onClick={() => { setMenuOpen(false); onOpen(board.id); }}
                    >
                      <ExternalLink className="size-3.5" />
                      Open board
                    </button>
                    <button
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded transition-colors"
                      onClick={() => { setMenuOpen(false); onEdit(board); }}
                    >
                      <Pencil className="size-3.5" />
                      Edit details
                    </button>
                    <div className="h-px bg-border my-1" />
                    <button
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded transition-colors"
                      onClick={() => { setMenuOpen(false); setDeleteConfirm(true); }}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer: last updated */}
          <p className="text-[10px] text-muted-foreground/50 mt-2">
            Updated {formatDistanceToNow(new Date(board.updatedAt), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Delete confirm */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this board?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{board.title}</span> and all its canvas
            content will be permanently deleted.
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
    </>
  );
}
