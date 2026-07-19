"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useVirtualizer } from "@tanstack/react-virtual";
import { RefreshCw, Plus, Search, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useWatchlist, useRemoveStock, useReorderStocks, type WatchlistStock } from "@/hooks/use-watchlist";
import { usePrices, useExtraStockPrices, useRefreshPrices } from "@/hooks/use-prices";
import { useNotesStore } from "@/store/notes-store";
import { StockRow, WatchlistTableHeader, STOCK_ROW_HEIGHT } from "@/components/watchlist/stock-row";
import { WatchlistLoadingSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/index";
import { cn, isMarketOpen } from "@/lib/utils";
import type { StockPrice } from "@/types";

// Modals — lazy loaded since they're only opened on user action
const AddStockModal = dynamic(
  () => import("@/components/watchlist/add-stock-modal").then((m) => ({ default: m.AddStockModal })),
  { ssr: false }
);
const NotesModal = dynamic(
  () => import("@/components/watchlist/notes-modal").then((m) => ({ default: m.NotesModal })),
  { ssr: false }
);

// ─── DRAG STATE ───────────────────────────────────────────────────────────────
interface DragState {
  draggingIndex: number | null;
  overIndex: number | null;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

interface WatchlistClientProps {
  watchlistId: string;
}

export function WatchlistClient({ watchlistId }: WatchlistClientProps) {
  // ── State ──────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"symbol" | "pChange" | "marketCap" | null>("marketCap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const sortFieldRef = useRef<"symbol" | "pChange" | "marketCap" | null>("marketCap");
  const [addStockOpen, setAddStockOpen] = useState(false);
  const [notesModal, setNotesModal] = useState<{ stock: WatchlistStock } | null>(null);
  const [dragState, setDragState] = useState<DragState>({ draggingIndex: null, overIndex: null });
  const [stocks, setStocks] = useState<WatchlistStock[] | null>(null); // local order for drag preview

  // ── Data fetching ──────────────────────────────────────
  const { data: watchlist, isLoading, error } = useWatchlist(watchlistId);
  const isCustom = watchlist?.type === "custom";

  // Use server-fetched stocks or our local drag-reordered copy
  const baseStocks = stocks ?? watchlist?.stocks ?? [];

  // Extract symbols for price fetching
  const symbols = useMemo(
    () => baseStocks.map((s) => s.symbol),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [watchlist?.stocks]
  );

  // Nifty 500 prices come from Zustand (instant, boot-loaded)
  const { data: nifty500Prices, isLoading: pricesLoading } = usePrices(symbols);

  // Non-Nifty-500 custom stocks: fetched via API on demand
  const { data: extraPrices = {} } = useExtraStockPrices(symbols);

  // Merged price map — Zustand first, extra prices fill the gaps
  const priceMap = useMemo(
    () => ({ ...extraPrices, ...nifty500Prices }),
    [nifty500Prices, extraPrices]
  );
  const pricesFetching = false;

  // Global stock notes (shared across all watchlists)
  const { notes } = useNotesStore();

  const refreshPrices = useRefreshPrices();
  const removeMutation = useRemoveStock(watchlistId);
  const reorderMutation = useReorderStocks(watchlistId);

  // ── Sort and filter ────────────────────────────────────
  const displayStocks = useMemo(() => {
    let list = [...baseStocks];

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) ||
          s.companyName?.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortField) {
      list.sort((a, b) => {
        let av: number | string = 0;
        let bv: number | string = 0;

        if (sortField === "symbol") {
          av = a.symbol;
          bv = b.symbol;
        } else if (sortField === "pChange") {
          av = (priceMap as Record<string, StockPrice>)[a.symbol]?.pChange ?? -Infinity;
          bv = (priceMap as Record<string, StockPrice>)[b.symbol]?.pChange ?? -Infinity;
        } else if (sortField === "marketCap") {
          av = (priceMap as Record<string, StockPrice>)[a.symbol]?.marketCap ?? a.marketCap ?? 0;
          bv = (priceMap as Record<string, StockPrice>)[b.symbol]?.marketCap ?? b.marketCap ?? 0;
        }

        if (typeof av === "string" && typeof bv === "string") {
          return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
      });
    }

    return list;
  }, [baseStocks, search, sortField, sortDir, priceMap]);

  // ── Sort handler ───────────────────────────────────────
  const handleSort = useCallback((field: "symbol" | "pChange" | "marketCap") => {
    // Read current values directly — no nested setState
    setSortField((prev) => {
      if (prev === field) return field; // direction handled below
      return field;
    });
    setSortDir((prevDir) => {
      // Can't read sortField here (stale closure), so track via a ref approach:
      // if the field being clicked matches the current sortField ref, toggle — else default
      return field === sortFieldRef.current
        ? (prevDir === "asc" ? "desc" : "asc")
        : (field === "symbol" ? "asc" : "desc");
    });
    sortFieldRef.current = field;
  }, []);

  // ── Virtual list ───────────────────────────────────────
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: displayStocks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => STOCK_ROW_HEIGHT,
    overscan: 10,
  });

  // ── Drag and drop (custom watchlists only) ─────────────
  const handleDragStart = (index: number) => {
    setDragState({ draggingIndex: index, overIndex: index });
    // Initialize local stocks for reordering
    setStocks([...(watchlist?.stocks ?? [])]);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragState((prev) => ({ ...prev, overIndex: index }));
  };

  const handleDrop = async (dropIndex: number) => {
    const { draggingIndex } = dragState;
    if (draggingIndex === null || draggingIndex === dropIndex) {
      setDragState({ draggingIndex: null, overIndex: null });
      return;
    }

    const newOrder = [...(watchlist?.stocks ?? [])];
    const [moved] = newOrder.splice(draggingIndex, 1);
    newOrder.splice(dropIndex, 0, moved);

    // Optimistically update local order
    setStocks(newOrder.map((s, i) => ({ ...s, position: i })));
    setDragState({ draggingIndex: null, overIndex: null });

    // Persist to server
    const orderPayload = newOrder.map((s, i) => ({ ...s, position: i }));
    try {
      await reorderMutation.mutateAsync(orderPayload);
    } catch {
      setStocks(null); // Rollback on failure
    }

  const handleDragEnd = () => {
    setDragState({ draggingIndex: null, overIndex: null });
  };

  // ── Delete stock ───────────────────────────────────────
  const handleDelete = async (stock: WatchlistStock) => {
    if (!stock.id) return;
    await removeMutation.mutateAsync(stock.id);
    setStocks(null); // Reset local order
  };

  // ── Refresh prices ─────────────────────────────────────
  const handleRefresh = () => {
    refreshPrices();
    toast.info("Refreshing prices...");
  };

  // ── Loading state ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <WatchlistPageHeader name="Loading..." isCustom={false} stockCount={0} />
        <div className="flex-1 overflow-hidden bg-white border-t border-border">
          <WatchlistLoadingSkeleton rows={15} />
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────
  if (error || !watchlist) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8">
        <AlertCircle className="size-8 text-destructive/50" />
        <p className="text-sm text-muted-foreground text-center">
          {error ?? "Failed to load watchlist"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  const existingSymbols = baseStocks.map((s) => s.symbol);

  return (
    <>
      <div className="flex flex-col h-full">
        {/* ── Header ── */}
        <WatchlistPageHeader
          name={watchlist.name}
          isCustom={isCustom}
          stockCount={displayStocks.length}
          totalCount={baseStocks.length}
          pricesFetching={pricesFetching}
          onAddStock={() => setAddStockOpen(true)}
          onRefresh={handleRefresh}
        />

        {/* ── Toolbar: search + info ── */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-white">
          <Input
            leftIcon={<Search />}
            placeholder="Search stocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 max-w-xs text-xs"
          />
          <div className="ml-auto flex items-center gap-2">
            <PriceRefreshInfo pricesFetching={pricesFetching} />
          </div>
        </div>

        {/* ── Table header ── */}
        <WatchlistTableHeader
          isCustom={isCustom}
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
        />

        {/* ── Virtual stock list ── */}
        {displayStocks.length === 0 ? (
          <EmptyState isCustom={isCustom} search={search} onAddStock={() => setAddStockOpen(true)} />
        ) : (
          <div
            ref={parentRef}
            className="flex-1 overflow-auto bg-white"
            style={{ contain: "strict" }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const stock = displayStocks[virtualRow.index];
                const price = (priceMap as Record<string, StockPrice>)[stock.symbol];
                // Enrich stock metadata from live price data when available
                const enrichedStock = price ? {
                  ...stock,
                  companyName: stock.companyName ?? price.companyName,
                  sector: stock.sector ?? price.sector,
                  marketCap: price.marketCap ?? stock.marketCap,
                } : stock;
                const isDragging = dragState.draggingIndex === virtualRow.index;
                const isDragOver = dragState.overIndex === virtualRow.index && !isDragging;

                return (
                  <div
                    key={stock.symbol}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    draggable={isCustom}
                    onDragStart={() => handleDragStart(virtualRow.index)}
                    onDragOver={(e) => handleDragOver(e, virtualRow.index)}
                    onDrop={() => handleDrop(virtualRow.index)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      isDragOver && "outline outline-1 outline-primary/30 bg-primary/5"
                    )}
                  >
                    <StockRow
                      stock={enrichedStock}
                      price={price}
                      index={virtualRow.index}
                      isCustom={isCustom}
                      note={notes[enrichedStock.symbol.toUpperCase()]}
                      isLoading={pricesLoading && !price}
                      isDragging={isDragging}
                      onNoteClick={isCustom ? setNotesModal.bind(null, { stock }) : undefined}
                      onDelete={isCustom ? handleDelete : undefined}
                      dragHandleProps={
                        isCustom
                          ? {
                              onMouseDown: () => {}, // handled by draggable div above
                            }
                          : undefined
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {isCustom && (
        <AddStockModal
          open={addStockOpen}
          onClose={() => setAddStockOpen(false)}
          watchlistId={watchlistId}
          existingSymbols={existingSymbols}
        />
      )}

      {notesModal && (
        <NotesModal
          open={true}
          onClose={() => setNotesModal(null)}
          symbol={notesModal.stock.symbol}
          initialNote={notes[notesModal.stock.symbol.toUpperCase()] ?? ""}
        />
      )}
    </>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function WatchlistPageHeader({
  name,
  isCustom,
  stockCount,
  totalCount,
  pricesFetching,
  onAddStock,
  onRefresh,
}: {
  name: string;
  isCustom: boolean;
  stockCount: number;
  totalCount?: number;
  pricesFetching?: boolean;
  onAddStock?: () => void;
  onRefresh?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-white">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground">Watchlists</span>
          <span className="text-muted-foreground/40">›</span>
          <h1 className="text-base font-semibold text-foreground">{name}</h1>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {totalCount ?? stockCount}
          </Badge>
          {isCustom && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30">
              Custom
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Refresh prices */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={pricesFetching}
          className="gap-1.5 text-xs h-7"
        >
          <RefreshCw
            className={cn("size-3", pricesFetching && "animate-spin")}
          />
          Refresh prices
        </Button>

        {/* Add stock (custom only) */}
        {isCustom && onAddStock && (
          <Button size="sm" onClick={onAddStock} className="gap-1.5 text-xs h-7">
            <Plus className="size-3" />
            Add Stock
          </Button>
        )}
      </div>
    </div>
  );
}

function PriceRefreshInfo({ pricesFetching }: { pricesFetching: boolean }) {
  const marketOpen = isMarketOpen();

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Clock className="size-3" />
      {pricesFetching ? (
        <span className="text-primary">Updating prices...</span>
      ) : marketOpen ? (
        <span>Auto-refreshes every 15 min</span>
      ) : (
        <span>Market closed · Last traded prices</span>
      )}
    </div>
  );
}

function EmptyState({
  isCustom,
  search,
  onAddStock,
}: {
  isCustom: boolean;
  search: string;
  onAddStock: () => void;
}) {
  if (search) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-16 gap-2">
        <Search className="size-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No stocks match &ldquo;{search}&rdquo;</p>
      </div>
    );
  }

  if (isCustom) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-16 gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Plus className="size-5 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Empty watchlist</p>
          <p className="text-xs text-muted-foreground mt-1">
            Start adding stocks to track their prices
          </p>
        </div>
        <Button size="sm" onClick={onAddStock} className="gap-1.5">
          <Plus className="size-3.5" />
          Add your first stock
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 py-16 gap-2">
      <p className="text-sm text-muted-foreground">No stocks to display</p>
    </div>
  );
}