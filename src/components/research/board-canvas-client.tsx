"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ChevronLeft,
  Check,
  Loader2,
  AlertCircle,
  Pencil,
  Clock,
  WifiOff,
} from "lucide-react";
import { useResearchBoard } from "@/hooks/use-research";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/index";
import { cn } from "@/lib/utils";
import { RESEARCH_CATEGORY_LABELS, type ResearchCategory } from "@/types";

// tldraw canvas — must be client-only (no SSR)
const TldrawCanvas = dynamic(
  () => import("@/components/research/tldraw-canvas").then((m) => ({ default: m.TldrawCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#f1f0ee]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Loading canvas...</p>
        </div>
      </div>
    ),
  }
);

// BoardForm edit modal — lazy loaded
const BoardForm = dynamic(
  () => import("@/components/research/board-form").then((m) => ({ default: m.BoardForm })),
  { ssr: false }
);

// ─── SAVE STATUS INDICATOR ────────────────────────────────────────────────────

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs transition-all",
        status === "saved" && "text-profit/70",
        status === "saving" && "text-muted-foreground",
        status === "unsaved" && "text-amber-500",
        status === "error" && "text-destructive"
      )}
    >
      {status === "saving" && <Loader2 className="size-3 animate-spin" />}
      {status === "saved" && <Check className="size-3" />}
      {status === "unsaved" && <Clock className="size-3" />}
      {status === "error" && <WifiOff className="size-3" />}
      <span>
        {status === "saving" && "Saving…"}
        {status === "saved" && "Saved"}
        {status === "unsaved" && "Unsaved changes"}
        {status === "error" && "Save failed"}
      </span>
    </div>
  );
}

// ─── CATEGORY BADGE COLORS ────────────────────────────────────────────────────

const CAT_BADGE: Record<ResearchCategory, string> = {
  MARKET: "bg-blue-50 text-blue-700 border-blue-200",
  SECTOR: "bg-violet-50 text-violet-700 border-violet-200",
  STOCK: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PERSONAL: "bg-amber-50 text-amber-700 border-amber-200",
};

// ─── BOARD CANVAS CLIENT ──────────────────────────────────────────────────────

interface BoardCanvasClientProps {
  boardId: string;
}

export function BoardCanvasClient({ boardId }: BoardCanvasClientProps) {
  const { data: board, isLoading, error } = useResearchBoard(boardId);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [editOpen, setEditOpen] = useState(false);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {/* Toolbar skeleton */}
        <div className="h-11 border-b border-border bg-white flex items-center px-4 gap-3">
          <Skeleton className="h-4 w-24" />
          <div className="w-px h-5 bg-border" />
          <Skeleton className="h-5 w-36" />
        </div>
        {/* Canvas area */}
        <div className="flex-1 bg-[#f1f0ee] flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground/50" />
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3">
        <AlertCircle className="size-8 text-destructive/50" />
        <p className="text-sm text-muted-foreground">Board not found</p>
        <Link href="/research" className="text-sm text-primary hover:underline">
          ← Back to boards
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* ── Top toolbar ── */}
        <div className="h-11 border-b border-border bg-white flex items-center px-4 gap-3 shrink-0 z-10">
          {/* Back */}
          <Link
            href="/research"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-3.5" />
            Boards
          </Link>

          <div className="w-px h-5 bg-border" />

          {/* Board title + category */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className={cn(
                "shrink-0 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                CAT_BADGE[board.category]
              )}
            >
              {RESEARCH_CATEGORY_LABELS[board.category]}
            </span>
            <h1 className="text-sm font-semibold text-foreground truncate">
              {board.title}
            </h1>
            <button
              onClick={() => setEditOpen(true)}
              className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-all"
            >
              <Pencil className="size-3" />
            </button>
          </div>

          {/* Save status */}
          <SaveStatusIndicator status={saveStatus} />
        </div>

        {/* ── Canvas — full remaining height ── */}
        <div className="flex-1 overflow-hidden relative">
          <TldrawCanvas
            boardId={boardId}
            initialSnapshot={board.canvas}
            onSaveStatusChange={setSaveStatus}
          />
        </div>
      </div>

      {/* Edit board details modal */}
      <BoardForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editBoard={board}
      />
    </>
  );
}