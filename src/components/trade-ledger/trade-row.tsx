"use client";

import { memo } from "react";
import { Pencil, Trash2, Camera } from "lucide-react";
import { format } from "date-fns";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { cn, formatCurrency } from "@/lib/utils";
import {
  TRADE_SETUP_LABELS,
  TRADE_OUTCOME_LABELS,
  type Trade,
} from "@/types";

// ─── LAYOUT CONSTANTS ────────────────────────────────────────────────────────
// Columns: # | Date | Stock | Setup | Priority | Entry | SL | Target | Qty | Outcome | P&L | Time | Remark | 📷 | Actions
//
// Pixel breakdown (total fixed = ~870px, 1fr fills remainder):
//  24  +  72  +  96  +  82  +  68  +  70  +  68  +  70  +  52  +  84  +  76  +  58  +  1fr  +  32  +  52
//
// "Quick Trade" badge ≈ 75px content → 82px col
// "Partial Profit" badge ≈ 78px content → 84px col
// P&L "+₹10.0K" ≈ 60px → 76px col (right-aligned with padding)
// Minimum table width: 900px (enforced on scroll container)

export const TRADE_ROW_HEIGHT = 48;
export const TABLE_MIN_WIDTH  = 900; // px — enables horizontal scroll below this

export const TRADE_GRID_TEMPLATE =
  "24px 72px 96px 82px 66px 70px 66px 70px 48px 78px 70px 56px 1fr 32px 52px";

const COL_GAP = 6; // px — consistent between header and rows

// ─── COLOR MAPS ──────────────────────────────────────────────────────────────

const SETUP_BADGE: Record<string, string> = {
  QUICK_TRADE: "bg-amber-50   text-amber-700   border-amber-200",
  HIT:         "bg-blue-50    text-blue-700    border-blue-200",
  DIT:         "bg-violet-50  text-violet-700  border-violet-200",
  WIT:         "bg-cyan-50    text-cyan-700    border-cyan-200",
  MIT:         "bg-emerald-50 text-emerald-700 border-emerald-200",
  QIT:         "bg-pink-50    text-pink-700    border-pink-200",
  HYIT:        "bg-orange-50  text-orange-700  border-orange-200",
  YIT:         "bg-rose-50    text-rose-700    border-rose-200",
};

const PRIORITY_TEXT: Record<string, string> = {
  MUST_TRADE: "text-red-600 font-semibold",
  HIGH:       "text-orange-600",
  MEDIUM:     "text-yellow-600",
  LOW:        "text-slate-400",
};

const OUTCOME_BADGE: Record<string, string> = {
  OPEN:           "bg-blue-50    text-blue-700    border-blue-200",
  TARGET_HIT:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  SL_HIT:         "bg-red-50     text-red-700     border-red-200",
  PARTIAL_PROFIT: "bg-teal-50    text-teal-700    border-teal-200",
};

// ─── SHARED GRID STYLE ───────────────────────────────────────────────────────
// Applied to both header and every row — guarantees pixel-perfect alignment.

export const gridStyle: React.CSSProperties = {
  gridTemplateColumns: TRADE_GRID_TEMPLATE,
  columnGap: `${COL_GAP}px`,
};

// ─── TABLE HEADER ────────────────────────────────────────────────────────────

interface SortState { field: string; dir: "asc" | "desc"; }

export function TradeTableHeader({
  sort,
  onSort,
}: {
  sort: SortState;
  onSort: (f: string) => void;
}) {
  const Sortable = ({
    field,
    label,
    align = "left",
  }: {
    field: string;
    label: string;
    align?: "left" | "right";
  }) => {
    const active = sort.field === field;
    return (
      <button
        onClick={() => onSort(field)}
        className={cn(
          "flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider",
          "text-muted-foreground hover:text-foreground transition-colors select-none whitespace-nowrap",
          align === "right" && "justify-end w-full"
        )}
      >
        {label}
        <span className="ml-0.5 inline-flex flex-col leading-none gap-px">
          <span className={cn("text-[7px] leading-none", active && sort.dir === "asc"  ? "text-primary" : "text-muted-foreground/30")}>▲</span>
          <span className={cn("text-[7px] leading-none", active && sort.dir === "desc" ? "text-primary" : "text-muted-foreground/30")}>▼</span>
        </span>
      </button>
    );
  };

  const Static = ({
    label,
    align = "left",
  }: {
    label: string;
    align?: "left" | "right";
  }) => (
    <span className={cn(
      "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap",
      align === "right" && "text-right block w-full"
    )}>
      {label}
    </span>
  );

  return (
    <div
      className="grid items-center px-4 py-2.5 border-b-2 border-border bg-muted/60"
      style={{ ...gridStyle, minWidth: TABLE_MIN_WIDTH }}
    >
      <Static label="#" />
      <Sortable field="date"  label="Date" />
      <Sortable field="stock" label="Stock" />
      <Static  label="Setup" />
      <Static  label="Priority" />
      <Sortable field="entry" label="Entry"  align="right" />
      <Static  label="SL"     align="right" />
      <Static  label="Target" align="right" />
      <Sortable field="qty"   label="Qty"   align="right" />
      <Static  label="Outcome" />
      <Sortable field="pnl"   label="P&L"   align="right" />
      <Static  label="Time" />
      <Static  label="Remark" />
      <Static  label="📷"    align="right" />
      <Static  label="Actions" />
    </div>
  );
}

// ─── TRADE ROW ───────────────────────────────────────────────────────────────

interface TradeRowProps {
  trade: Trade;
  index: number;
  onEdit: (trade: Trade) => void;
  onDelete: (trade: Trade) => void;
  onViewRemark: (remark: string, stock: string) => void;
  onViewScreenshots: (urls: string[]) => void;
}

export const TradeRow = memo(function TradeRow({
  trade,
  index,
  onEdit,
  onDelete,
  onViewRemark,
  onViewScreenshots,
}: TradeRowProps) {
  const pnlPositive = (trade.pnl ?? 0) >= 0;
  const hasRemark      = Boolean(trade.remark?.trim());
  const hasScreenshots = trade.screenshots.length > 0;

  return (
    <div
      className="grid items-center px-4 border-b border-border/40 bg-white hover:bg-muted/25 transition-colors duration-75 group"
      style={{
        ...gridStyle,
        minWidth: TABLE_MIN_WIDTH,
        height: `${TRADE_ROW_HEIGHT}px`,
      }}
    >
      {/* # */}
      <span className="text-[10px] text-muted-foreground/40 tabular-nums select-none">
        {index + 1}
      </span>

      {/* Date */}
      <span className="text-[11px] text-foreground tabular-nums whitespace-nowrap">
        {format(new Date(trade.date), "dd MMM yy")}
      </span>

      {/* Stock */}
      <span className="font-mono text-[12px] font-semibold text-foreground truncate">
        {trade.stock}
      </span>

      {/* Setup badge */}
      <div className="flex items-center">
        <span className={cn(
          "inline-flex items-center rounded border px-1.5 py-[3px] text-[10px] font-semibold whitespace-nowrap",
          SETUP_BADGE[trade.tradeSetup] ?? "bg-muted text-muted-foreground border-border"
        )}>
          {TRADE_SETUP_LABELS[trade.tradeSetup] ?? trade.tradeSetup}
        </span>
      </div>

      {/* Priority */}
      <span className={cn("text-[11px] whitespace-nowrap", PRIORITY_TEXT[trade.priority])}>
        {trade.priority === "MUST_TRADE"
          ? "Must"
          : trade.priority.charAt(0) + trade.priority.slice(1).toLowerCase()}
      </span>

      {/* Entry */}
      <span className="text-[11px] font-mono text-right text-foreground tabular-nums block">
        {trade.entry.toLocaleString("en-IN")}
      </span>

      {/* SL */}
      <span className="text-[11px] font-mono text-right text-loss/70 tabular-nums block">
        {trade.sl.toLocaleString("en-IN")}
      </span>

      {/* Target */}
      <span className="text-[11px] font-mono text-right text-profit/70 tabular-nums block">
        {trade.target.toLocaleString("en-IN")}
      </span>

      {/* Qty */}
      <span className="text-[11px] font-mono text-right text-foreground tabular-nums block">
        {trade.qty.toLocaleString("en-IN")}
      </span>

      {/* Outcome — static badge */}
      <div className="flex items-center">
        <span className={cn(
          "inline-flex items-center rounded border px-1.5 py-[3px] text-[10px] font-medium whitespace-nowrap",
          OUTCOME_BADGE[trade.outcome] ?? "bg-slate-50 text-slate-600 border-slate-200"
        )}>
          {TRADE_OUTCOME_LABELS[trade.outcome] ?? trade.outcome}
        </span>
      </div>

      {/* P&L */}
      <div className="text-right">
        {trade.pnl != null ? (
          <span className={cn(
            "text-[11px] font-semibold font-mono tabular-nums",
            pnlPositive ? "text-profit" : "text-loss"
          )}>
            {pnlPositive ? "+" : ""}
            {formatCurrency(trade.pnl, true)}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground/35">—</span>
        )}
      </div>

      {/* Time */}
      <span className="text-[11px] text-muted-foreground truncate">
        {trade.timeTaken || <span className="text-muted-foreground/30">—</span>}
      </span>

      {/* Remark — truncated preview, click for full */}
      <div className="min-w-0 overflow-hidden">
        {hasRemark ? (
          <button
            onClick={() => onViewRemark(trade.remark!, trade.stock)}
            className="w-full text-left text-[11px] text-muted-foreground truncate block hover:text-foreground transition-colors"
            title="Click for full remark"
          >
            {trade.remark}
          </button>
        ) : (
          <span className="text-[11px] text-muted-foreground/30">—</span>
        )}
      </div>

      {/* Screenshots camera */}
      <div className="flex justify-end">
        {hasScreenshots ? (
          <SimpleTooltip content={`${trade.screenshots.length} screenshot${trade.screenshots.length > 1 ? "s" : ""}`}>
            <button
              onClick={() => onViewScreenshots(trade.screenshots)}
              className="w-6 h-6 rounded flex items-center justify-center text-primary/60 hover:text-primary hover:bg-primary/10 transition-all"
            >
              <Camera className="size-3.5" />
            </button>
          </SimpleTooltip>
        ) : (
          <span className="w-6 h-6 flex items-center justify-center">
            <Camera className="size-3.5 text-muted-foreground/20" />
          </span>
        )}
      </div>

      {/* Edit / Delete */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <SimpleTooltip content="Edit">
          <button
            onClick={() => onEdit(trade)}
            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
          >
            <Pencil className="size-3" />
          </button>
        </SimpleTooltip>
        <SimpleTooltip content="Delete">
          <button
            onClick={() => onDelete(trade)}
            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-loss hover:bg-loss/10 transition-all"
          >
            <Trash2 className="size-3" />
          </button>
        </SimpleTooltip>
      </div>
    </div>
  );
});