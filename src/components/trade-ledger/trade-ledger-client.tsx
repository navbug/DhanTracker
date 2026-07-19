"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Plus, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { useTrades, useDeleteTrade, type TradeFilters } from "@/hooks/use-trades";
import { TradeRow, TradeTableHeader, TRADE_ROW_HEIGHT } from "@/components/trade-ledger/trade-row";
import { TradeFilters as TradeFiltersBar, type ActiveFilters } from "@/components/trade-ledger/trade-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/index";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";
import type { Trade, TradeSetup } from "@/types";

// Modals — lazy loaded since they're only needed when user clicks Log Trade / view screenshots
const TradeForm = dynamic(
  () => import("@/components/trade-ledger/trade-form").then((m) => ({ default: m.TradeForm })),
  { ssr: false }
);
const ScreenshotsViewer = dynamic(
  () => import("@/components/trade-ledger/screenshots-viewer").then((m) => ({ default: m.ScreenshotsViewer })),
  { ssr: false }
);

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface SortState {
  field: string;
  dir: "asc" | "desc";
}

interface StatsSnapshot {
  total: number;
  accuracy: number | null;
  netPnl: number;
  closed: number;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function TradeLedgerClient() {

  // ── Filters ──────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<ActiveFilters>({
    outcome: "all",
    setup: "all",
    search: "",
    from: "",
    to: "",
  });

  // ── Sort ──────────────────────────────────────────────────────────────────
  const [sort, setSort] = useState<SortState>({ field: "date", dir: "desc" });
  const sortFieldRef = useRef<string>("date");

  const handleSort = useCallback((field: string) => {
    setSort((prev) => ({
      field,
      dir: field === sortFieldRef.current
        ? (prev.dir === "asc" ? "desc" : "asc")
        : "desc",
    }));
    sortFieldRef.current = field;
  }, []);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Trade | null>(null);
  const [remarkModal, setRemarkModal] = useState<{
    open: boolean;
    stock: string;
    remark: string;
  }>({ open: false, stock: "", remark: "" });
  const [screenshotViewer, setScreenshotViewer] = useState<{
    open: boolean;
    urls: string[];
  }>({ open: false, urls: [] });

  // ── Data ──────────────────────────────────────────────────────────────────
  const storeFilters: TradeFilters = {
    outcome: filters.outcome !== "all" ? filters.outcome : undefined,
    setup: filters.setup !== "all" ? (filters.setup as TradeSetup) : undefined,
    search: filters.search.trim() || undefined,
  };

  const { data: trades = [], isLoading, error } = useTrades(storeFilters);
  const deleteMutation = useDeleteTrade();

  // ── Sort + date filter (client-side) ──────────────────────────────────────
  const displayTrades = useMemo(() => {
    let list = [...trades];

    if (filters.from) {
      const from = new Date(filters.from);
      list = list.filter((t) => new Date(t.date) >= from);
    }
    if (filters.to) {
      const to = new Date(filters.to + "T23:59:59Z");
      list = list.filter((t) => new Date(t.date) <= to);
    }

    list.sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      switch (sort.field) {
        case "date":  av = new Date(a.date).getTime(); bv = new Date(b.date).getTime(); break;
        case "stock": av = a.stock; bv = b.stock; break;
        case "entry": av = a.entry; bv = b.entry; break;
        case "pnl":   av = a.pnl ?? -Infinity; bv = b.pnl ?? -Infinity; break;
        case "qty":   av = a.qty; bv = b.qty; break;
        default: return 0;
      }
      if (typeof av === "string" && typeof bv === "string") {
        return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sort.dir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });

    return list;
  }, [trades, sort, filters.from, filters.to]);

  // ── Header stats ──────────────────────────────────────────────────────────
  const stats = useMemo((): StatsSnapshot => {
    const closed = displayTrades.filter((t) => t.outcome !== "OPEN");
    const won    = closed.filter((t) => (t.pnl ?? 0) > 0);
    const netPnl = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    return {
      total:    displayTrades.length,
      accuracy: closed.length ? Math.round((won.length / closed.length) * 100) : null,
      netPnl,
      closed:   closed.length,
    };
  }, [displayTrades]);

  // ── Virtual list ──────────────────────────────────────────────────────────
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: displayTrades.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => TRADE_ROW_HEIGHT,
    overscan: 12,
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleEdit = useCallback((trade: Trade) => {
    setEditTrade(trade);
    setFormOpen(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setEditTrade(null);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteMutation]);

  const handleViewRemark = useCallback((remark: string, stock: string) => {
    setRemarkModal({ open: true, stock, remark });
  }, []);

  const handleViewScreenshots = useCallback((urls: string[]) => {
    setScreenshotViewer({ open: true, urls });
  }, []);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-full w-full">
        <LedgerHeader stats={null} onAdd={() => {}} />
        <div className="flex-1 p-4 flex flex-col gap-2">
          {Array.from({ length: 14 }, (_, i) => (
            <Skeleton
              key={i}
              className="h-12 w-full rounded"
              style={{ opacity: 1 - i * 0.05 }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3">
        <AlertCircle className="size-8 text-destructive/50" />
        <p className="text-sm text-muted-foreground">Failed to load trades</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  const hasActiveFilters =
    filters.outcome !== "all" ||
    filters.setup !== "all" ||
    Boolean(filters.search) ||
    Boolean(filters.from) ||
    Boolean(filters.to);

  return (
    <>
      {/* ── Layout shell ── */}
      <div className="flex flex-col h-full w-full overflow-hidden">

        {/* Page header + stats */}
        <LedgerHeader stats={stats} onAdd={() => setFormOpen(true)} />

        {/* Filter bar */}
        <TradeFiltersBar
          filters={filters}
          onChange={setFilters}
          totalCount={trades.length}
          filteredCount={displayTrades.length}
        />

        {/* Sticky column header */}
        <div className="w-full shrink-0 bg-white">
          <TradeTableHeader sort={sort} onSort={handleSort} />
        </div>

        {/* Body */}
        {displayTrades.length === 0 ? (
          <EmptyState onAdd={() => setFormOpen(true)} hasFilters={hasActiveFilters} />
        ) : (
          /* Scrollable virtual list — fills remaining height */
          <div
            ref={parentRef}
            className="flex-1 overflow-y-auto overflow-x-hidden w-full bg-white"
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((vr) => {
                const trade = displayTrades[vr.index];
                return (
                  <div
                    key={trade.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${vr.start}px)`,
                    }}
                  >
                    <TradeRow
                      trade={trade}
                      index={vr.index}
                      onEdit={handleEdit}
                      onDelete={setDeleteTarget}
                      onViewRemark={handleViewRemark}
                      onViewScreenshots={handleViewScreenshots}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}

      {/* Trade form (create / edit) */}
      <TradeForm
        open={formOpen}
        onClose={handleFormClose}
        editTrade={editTrade}
      />

      {/* Delete confirm */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete trade?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Permanently remove the{" "}
            <span className="font-mono font-semibold text-foreground">
              {deleteTarget?.stock}
            </span>{" "}
            trade. This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              loading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full remark modal */}
      <Dialog
        open={remarkModal.open}
        onOpenChange={() => setRemarkModal((s) => ({ ...s, open: false }))}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span className="font-mono text-primary">{remarkModal.stock}</span>
              <span className="text-muted-foreground font-normal text-sm">
                — Trade Remark
              </span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mt-1 max-h-[60vh] overflow-y-auto">
            {remarkModal.remark}
          </p>
        </DialogContent>
      </Dialog>

      {/* Screenshots viewer */}
      <ScreenshotsViewer
        open={screenshotViewer.open}
        urls={screenshotViewer.urls}
        onClose={() => setScreenshotViewer({ open: false, urls: [] })}
      />
    </>
  );
}

// ─── LEDGER HEADER ────────────────────────────────────────────────────────────

function LedgerHeader({
  stats,
  onAdd,
}: {
  stats: StatsSnapshot | null;
  onAdd: () => void;
}) {
  const pnlPositive = (stats?.netPnl ?? 0) >= 0;

  return (
    <div className="flex items-center gap-5 px-5 py-3 border-b border-border bg-white shrink-0">
      {/* Title + count */}
      <div className="flex items-baseline gap-2 flex-1 min-w-0">
        <h1 className="text-base font-semibold text-foreground">Trade Ledger</h1>
        {stats && stats.total > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {stats.total} trades
          </Badge>
        )}
      </div>

      {/* Quick stats — only when there are closed trades */}
      {stats && stats.closed > 0 && (
        <div className="hidden md:flex items-center gap-6">
          {stats.accuracy !== null && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Accuracy
              </span>
              <span className="text-sm font-semibold text-foreground num">
                {stats.accuracy}%
              </span>
            </div>
          )}
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Net P&L
            </span>
            <div className="flex items-center gap-1">
              {pnlPositive ? (
                <TrendingUp className="size-3 text-profit" />
              ) : (
                <TrendingDown className="size-3 text-loss" />
              )}
              <span
                className={cn(
                  "text-sm font-semibold num",
                  pnlPositive ? "text-profit" : "text-loss"
                )}
              >
                {pnlPositive ? "+" : ""}
                {formatCurrency(stats.netPnl, true)}
              </span>
            </div>
          </div>
        </div>
      )}

      <Button onClick={onAdd} size="sm" className="gap-1.5 text-xs h-7 shrink-0">
        <Plus className="size-3" />
        Log Trade
      </Button>
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyState({
  onAdd,
  hasFilters,
}: {
  onAdd: () => void;
  hasFilters: boolean;
}) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-20 gap-2">
        <p className="text-sm text-muted-foreground">No trades match your filters</p>
        <p className="text-xs text-muted-foreground/60">Try clearing the filters</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 py-20 gap-4">
      <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
        <Plus className="size-7 text-primary/50" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">No trades logged yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Start tracking your trades to see P&L analytics and accuracy by setup
        </p>
      </div>
      <Button onClick={onAdd} size="sm" className="gap-1.5">
        <Plus className="size-3.5" />
        Log your first trade
      </Button>
    </div>
  );
}