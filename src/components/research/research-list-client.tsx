"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import NProgress from "nprogress";
import { Plus, Search, Layers, AlertCircle } from "lucide-react";
import { useResearchBoards, type ResearchBoard } from "@/hooks/use-research";
import { BoardCard } from "@/components/research/board-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/index";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RESEARCH_CATEGORY_LABELS, type ResearchCategory } from "@/types";

// BoardForm is a modal with react-hook-form — lazy load
const BoardForm = dynamic(
  () => import("@/components/research/board-form").then((m) => ({ default: m.BoardForm })),
  { ssr: false }
);

// ─── CATEGORY FILTER TABS ─────────────────────────────────────────────────────

const CATEGORIES: Array<{ id: string; label: string; emoji: string }> = [
  { id: "all", label: "All boards", emoji: "🗂" },
  { id: "MARKET", label: RESEARCH_CATEGORY_LABELS["MARKET"], emoji: "📈" },
  { id: "SECTOR", label: RESEARCH_CATEGORY_LABELS["SECTOR"], emoji: "🏭" },
  { id: "STOCK", label: RESEARCH_CATEGORY_LABELS["STOCK"], emoji: "🎯" },
  { id: "PERSONAL", label: RESEARCH_CATEGORY_LABELS["PERSONAL"], emoji: "📓" },
];

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function ResearchListClient() {
  const router = useRouter();
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editBoard, setEditBoard] = useState<ResearchBoard | null>(null);

  const { data: boards = [], isLoading, error } = useResearchBoards(
    category !== "all" ? category : undefined,
    search.trim() || undefined
  );

  const handleCreated = useCallback(
    (id: string) => { NProgress.start(); router.push(`/research/${id}`); },
    [router]
  );

  const handleOpen = useCallback(
    (id: string) => { NProgress.start(); router.push(`/research/${id}`); },
    [router]
  );

  const handleEdit = useCallback((board: ResearchBoard) => {
    setEditBoard(board);
    setFormOpen(true);
  }, []);

  const handleFormClose = () => {
    setFormOpen(false);
    setEditBoard(null);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <ResearchHeader onNew={() => setFormOpen(true)} />
        <div className="flex-1 overflow-auto p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="rounded-xl border border-border bg-white overflow-hidden"
                style={{ opacity: 1 - i * 0.08 }}>
                <Skeleton className="h-36 w-full rounded-none" />
                <div className="p-3.5 flex flex-col gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3">
        <AlertCircle className="size-8 text-destructive/50" />
        <p className="text-sm text-muted-foreground">Failed to load boards</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <ResearchHeader onNew={() => setFormOpen(true)} boardCount={boards.length} />

        {/* ── Filter toolbar ── */}
        <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border bg-white flex-wrap">
          <div className="flex items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all",
                  category === cat.id
                    ? "bg-primary text-white border-primary"
                    : "bg-white border-border text-muted-foreground hover:border-muted-foreground"
                )}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>

          <div className="ml-auto">
            <Input
              leftIcon={<Search />}
              placeholder="Search boards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-52 text-xs"
            />
          </div>
        </div>

        {/* ── Board grid ── */}
        <div className="flex-1 overflow-auto p-5">
          {boards.length === 0 ? (
            <EmptyState onNew={() => setFormOpen(true)} hasFilters={category !== "all" || Boolean(search)} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {boards.map((board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  onEdit={handleEdit}
                  onOpen={handleOpen}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <BoardForm
        open={formOpen}
        onClose={handleFormClose}
        editBoard={editBoard}
        onCreated={handleCreated}
      />
    </>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function ResearchHeader({
  onNew,
  boardCount,
}: {
  onNew: () => void;
  boardCount?: number;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-white">
      <div className="flex items-baseline gap-2 flex-1">
        <h1 className="text-base font-semibold text-foreground">Research Boards</h1>
        {boardCount !== undefined && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {boardCount}
          </Badge>
        )}
      </div>
      <Button onClick={onNew} size="sm" className="gap-1.5 text-xs h-7">
        <Plus className="size-3" />
        New board
      </Button>
    </div>
  );
}

function EmptyState({ onNew, hasFilters }: { onNew: () => void; hasFilters: boolean }) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <p className="text-sm text-muted-foreground">No boards match your filters</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
        <Layers className="size-7 text-primary/50" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">No research boards yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Create visual whiteboards for your market analysis, sector research, or individual stock thesis
        </p>
      </div>
      <Button onClick={onNew} size="sm" className="gap-1.5">
        <Plus className="size-3.5" />
        Create your first board
      </Button>
    </div>
  );
}