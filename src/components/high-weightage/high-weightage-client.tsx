"use client";

import { CalendarDays } from "lucide-react";
import { HIGH_WEIGHTAGE_INDICES, LAST_UPDATED, type SectorIndex } from "@/data/indices/sector-weightages";
import { cn } from "@/lib/utils";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const ROWS = 5; // Every table always shows exactly 5 rows

// Nifty 50 sector weights live inside the first index entry
const NIFTY50_ENTRY = HIGH_WEIGHTAGE_INDICES.find((i) => i.slug === "nifty50")!;
const SECTOR_WEIGHTS = NIFTY50_ENTRY.sectorWeights ?? [];

// All other indices (everything except the sector-weights source)
const ALL_INDICES = HIGH_WEIGHTAGE_INDICES;

// ─── SECTOR WEIGHTS TABLE ─────────────────────────────────────────────────────

function SectorWeightsTable() {
  const padded = [
    ...SECTOR_WEIGHTS,
    ...Array(Math.max(0, ROWS - SECTOR_WEIGHTS.length)).fill(null),
  ].slice(0, ROWS);

  return (
    <div className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40">
        <span className="text-sm font-semibold text-foreground">Nifty Sector</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_80px] px-4 py-2 border-b border-border bg-muted/20">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Sector
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
          Weight%
        </span>
      </div>

      {/* Rows */}
      {padded.map((row, i) => (
        <div
          key={i}
          className={cn(
            "grid grid-cols-[1fr_80px] items-center px-4 py-2.5",
            i < ROWS - 1 && "border-b border-border/50"
          )}
        >
          <span className="text-[13px] text-foreground truncate">
            {row?.sector ?? <span className="text-muted-foreground/30">—</span>}
          </span>
          <span className="text-[13px] font-semibold font-mono text-right text-foreground num">
            {row ? `${row.weight.toFixed(2)}%` : <span className="text-muted-foreground/30">—</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── INDEX CARD ───────────────────────────────────────────────────────────────

function IndexCard({ index }: { index: SectorIndex }) {
  const padded = [
    ...index.topStocks,
    ...Array(Math.max(0, ROWS - index.topStocks.length)).fill(null),
  ].slice(0, ROWS);

  return (
    <div className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40">
        <span className="text-sm font-semibold text-foreground">{index.name}</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[28px_1fr_80px] px-4 py-2 border-b border-border bg-muted/20">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          #
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Company
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
          Weight%
        </span>
      </div>

      {/* Rows */}
      {padded.map((stock, i) => (
        <div
          key={i}
          className={cn(
            "grid grid-cols-[28px_1fr_80px] items-center px-4 py-2.5",
            i < ROWS - 1 && "border-b border-border/50"
          )}
        >
          <span className="text-[11px] text-muted-foreground/50 tabular-nums select-none">
            {stock ? i + 1 : ""}
          </span>
          <span className="text-[13px] text-foreground truncate pr-2">
            {stock?.companyName ?? <span className="text-muted-foreground/30">—</span>}
          </span>
          <span className={cn(
            "text-[13px] font-semibold font-mono text-right num",
            stock ? "text-foreground" : "text-muted-foreground/30"
          )}>
            {stock ? `${stock.weight.toFixed(2)}%` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN CLIENT COMPONENT ────────────────────────────────────────────────────

export function HighWeightageClient() {
  return (
    <div className="flex flex-col gap-5 p-5 overflow-auto">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">
            High Weightage Stocks
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sector-wise top stocks across {ALL_INDICES.length} indices · Top 5 by weight
          </p>
        </div>
        <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 border border-border rounded-lg px-3 py-1.5">
          <div className="flex items-center gap-1.5"><CalendarDays className="size-3.5 shrink-0" />
          <span>Last updated: <span className="font-medium text-foreground">{LAST_UPDATED}</span></span>
          </div>
          <span className="text-[10px]">Updates last date of every month</span>
        </div>
      </div>

      {/* ── Nifty Sector weights — full-width top card ── */}
      <div className="max-w-sm">
        <SectorWeightsTable />
      </div>

      {/* ── All index cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ALL_INDICES.map((index) => (
          <IndexCard key={index.slug} index={index} />
        ))}
      </div>

    </div>
  );
}