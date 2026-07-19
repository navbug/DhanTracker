"use client";

import { memo } from "react";
import { GripVertical, FileText, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { cn, formatMarketCap, formatNumber } from "@/lib/utils";
import type { StockPrice } from "@/types";
import type { WatchlistStock } from "@/hooks/use-watchlist";

// ─── COLUMN TEMPLATE ─────────────────────────────────────────────────────────
// Custom:     S.No | Drag | Notes | Stock | LTP | %Change | Sector | MCap | Delete
// Predefined: S.No | Stock | LTP | %Change | Sector | MCap

export const STOCK_ROW_HEIGHT = 44; // px — used by TanStack Virtual

export const GRID_TEMPLATE_CUSTOM =
  "32px 28px 44px 1fr 100px 86px 140px 110px 36px";
export const GRID_TEMPLATE_PREDEFINED =
  "36px 1fr 100px 86px 140px 110px";

// ─── CHANGE BADGE ─────────────────────────────────────────────────────────────

function ChangeBadge({ pChange }: { pChange: number }) {
  const positive = pChange >= 0;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold num tabular-nums",
        positive
          ? "bg-profit/10 text-profit border border-profit/15"
          : "bg-loss/10 text-loss border border-loss/15"
      )}
    >
      {positive ? (
        <TrendingUp className="size-2.5" />
      ) : (
        <TrendingDown className="size-2.5" />
      )}
      {positive ? "+" : ""}
      {pChange.toFixed(2)}%
    </div>
  );
}

// ─── STOCK ROW ────────────────────────────────────────────────────────────────

interface StockRowProps {
  stock: WatchlistStock;
  price?: StockPrice;
  index: number;
  isCustom: boolean;
  note?: string; // global note for this symbol (from notes-store)
  isLoading?: boolean;
  onNoteClick?: (stock: WatchlistStock) => void; // undefined = predefined (no notes)
  onDelete?: (stock: WatchlistStock) => void;
  // Drag-and-drop props (only for custom watchlists)
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
}

export const StockRow = memo(function StockRow({
  stock,
  price,
  index,
  isCustom,
  note,
  isLoading,
  onNoteClick,
  onDelete,
  dragHandleProps,
  isDragging,
}: StockRowProps) {
  const hasNote = Boolean(note?.trim());

  return (
    <div
      className={cn(
        "grid items-center border-b border-border/40 px-3 bg-white",
        "hover:bg-accent/30 transition-colors duration-75",
        isDragging && "bg-primary/5 shadow-md border-primary/20 rounded z-10",
        isLoading && "opacity-60"
      )}
      style={{
        gridTemplateColumns: isCustom
          ? GRID_TEMPLATE_CUSTOM
          : GRID_TEMPLATE_PREDEFINED,
        height: `${STOCK_ROW_HEIGHT}px`,
      }}
    >
      {/* ── S.No ── */}
      <span className="text-[11px] text-muted-foreground/60 select-none tabular-nums">
        {index + 1}
      </span>

      {/* ── Drag handle (custom only) ── */}
      {isCustom && (
        <div
          {...dragHandleProps}
          className={cn(
            "flex items-center justify-center text-muted-foreground/30",
            "hover:text-muted-foreground cursor-grab active:cursor-grabbing",
            "transition-colors"
          )}
        >
          <GripVertical className="size-4" />
        </div>
      )}

      {/* ── Notes icon (custom watchlists only) ── */}
      {onNoteClick && (
        <SimpleTooltip content={hasNote ? "View/edit note" : "Add note"}>
          <button
            onClick={() => onNoteClick(stock)}
            className={cn(
              "flex items-center justify-center w-6 h-6 rounded transition-all",
              hasNote
                ? "text-primary bg-primary/10 hover:bg-primary/20"
                : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted"
            )}
          >
            <FileText className="size-3.5" />
          </button>
        </SimpleTooltip>
      )}

      {/* ── Stock name + symbol ── */}
      <div className="flex flex-col gap-0 min-w-0 pr-3">
        <span className="font-mono text-xs font-semibold text-foreground truncate leading-tight">
          {stock.symbol}
        </span>
        {stock.companyName && (
          <span className="text-[10px] text-muted-foreground truncate leading-tight">
            {stock.companyName}
          </span>
        )}
      </div>

      {/* ── LTP ── */}
      <div className="text-right pr-2">
        {price ? (
          <span className="font-mono text-xs font-semibold text-foreground num">
            {formatNumber(price.lastPrice)}
          </span>
        ) : (
          <span className="font-mono text-xs text-muted-foreground/40">—</span>
        )}
      </div>

      {/* ── %Change ── */}
      <div className="flex justify-end pr-2">
        {price ? (
          <ChangeBadge pChange={price.pChange} />
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </div>

      {/* ── Sector ── */}
      <div className="truncate">
        <span className="text-[11px] text-muted-foreground truncate">
          {stock.sector ?? "—"}
        </span>
      </div>

      {/* ── Market Cap ── */}
      <div className="text-right pr-2">
        {(price?.marketCap ?? stock.marketCap) ? (
          <span className="text-[11px] text-muted-foreground num">
            {formatMarketCap((price?.marketCap ?? stock.marketCap)!)}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground/40">—</span>
        )}
      </div>

      {/* ── Delete (custom only) ── */}
      {isCustom && onDelete && (
        <SimpleTooltip content="Remove from watchlist">
          <button
            onClick={() => onDelete(stock)}
            className="flex items-center justify-center w-7 h-7 rounded text-muted-foreground/30 hover:text-loss hover:bg-loss/10 transition-all"
          >
            <Trash2 className="size-3.5" />
          </button>
        </SimpleTooltip>
      )}
    </div>
  );
});

// ─── TABLE HEADER ─────────────────────────────────────────────────────────────

interface TableHeaderProps {
  isCustom: boolean;
  sortField: "symbol" | "pChange" | "marketCap" | null;
  sortDir: "asc" | "desc";
  onSort: (field: "symbol" | "pChange" | "marketCap") => void;
}

function SortIcon({
  active,
  dir,
}: {
  field: string;
  active: boolean;
  dir: "asc" | "desc";
}) {
  return (
    <span className="ml-0.5 inline-flex flex-col gap-0" style={{ lineHeight: 1 }}>
      {/* Up triangle */}
      <span
        className={cn(
          "block text-[7px] leading-none",
          active && dir === "asc" ? "text-primary" : "text-muted-foreground/30"
        )}
      >
        ▲
      </span>
      {/* Down triangle */}
      <span
        className={cn(
          "block text-[7px] leading-none",
          active && dir === "desc" ? "text-primary" : "text-muted-foreground/30"
        )}
      >
        ▼
      </span>
    </span>
  );
}

export function WatchlistTableHeader({
  isCustom,
  sortField,
  sortDir,
  onSort,
}: TableHeaderProps) {
  const SortableHeader = ({
    field,
    label,
    align = "left",
  }: {
    field: "symbol" | "pChange" | "marketCap";
    label: string;
    align?: "left" | "right";
  }) => (
    <button
      onClick={() => onSort(field)}
      className={cn(
        "flex items-center gap-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors",
        align === "right" && "justify-end w-full pr-2"
      )}
    >
      {label}
      <SortIcon
        field={field}
        active={sortField === field}
        dir={sortDir}
      />
    </button>
  );

  return (
    <div
      className="grid items-center px-3 py-2 border-b-2 border-border bg-muted/50 sticky top-0 z-10"
      style={{
        gridTemplateColumns: isCustom
          ? GRID_TEMPLATE_CUSTOM
          : GRID_TEMPLATE_PREDEFINED,
      }}
    >
      {/* S.No */}
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        #
      </span>

      {/* Drag (custom only) */}
      {isCustom && <span />}

      {/* Notes (custom only) */}
      {isCustom && (
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Notes
        </span>
      )}

      {/* Stock — sortable */}
      <SortableHeader field="symbol" label="Stock" />

      {/* LTP */}
      <div className="text-right pr-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          LTP ⓘ
        </span>
      </div>

      {/* %Change — sortable */}
      <div className="flex justify-end pr-2">
        <SortableHeader field="pChange" label="%Change" align="right" />
      </div>

      {/* Sector */}
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Sector
      </span>

      {/* MCap — sortable */}
      <SortableHeader field="marketCap" label="M.Cap (Cr)" align="right" />

      {/* Delete (custom only) */}
      {isCustom && <span />}
    </div>
  );
}