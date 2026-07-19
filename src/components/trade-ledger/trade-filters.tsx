"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TRADE_SETUP_LABELS, type TradeSetup } from "@/types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface ActiveFilters {
  outcome: "all" | "open" | "won" | "lost";
  setup: TradeSetup | "all";
  search: string;
  from: string;
  to: string;
}

interface TradeFiltersProps {
  filters: ActiveFilters;
  onChange: (filters: ActiveFilters) => void;
  totalCount: number;
  filteredCount: number;
}

// ─── PILL FILTER ──────────────────────────────────────────────────────────────

function FilterPill<T extends string>({
  value,
  options,
  labels,
  onChange,
  colors,
}: {
  value: T;
  options: T[];
  labels: Record<T, string>;
  onChange: (v: T) => void;
  colors?: Partial<Record<T, string>>;
}) {
  return (
    <div className="flex items-center gap-1">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
            value === opt
              ? (colors?.[opt] ?? "bg-primary text-white border-primary")
              : "bg-white border-border text-muted-foreground hover:border-muted-foreground"
          )}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

const OUTCOME_OPTIONS: Array<"all" | "open" | "won" | "lost"> = ["all", "open", "won", "lost"];
const OUTCOME_LABELS: Record<"all" | "open" | "won" | "lost", string> = {
  all: "All",
  open: "Open",
  won: "Won",
  lost: "Lost",
};
const OUTCOME_ACTIVE_COLORS: Partial<Record<"all" | "open" | "won" | "lost", string>> = {
  open: "bg-blue-500 text-white border-blue-500",
  won: "bg-profit text-white border-profit",
  lost: "bg-loss text-white border-loss",
};

const ALL_SETUPS: Array<TradeSetup | "all"> = [
  "all", "QUICK_TRADE", "HIT", "DIT", "WIT", "MIT", "QIT", "HYIT", "YIT",
];
const SETUP_LABELS_WITH_ALL: Record<TradeSetup | "all", string> = {
  all: "All Setups",
  ...TRADE_SETUP_LABELS,
};

export function TradeFilters({ filters, onChange, totalCount, filteredCount }: TradeFiltersProps) {
  const hasActiveFilters =
    filters.outcome !== "all" ||
    filters.setup !== "all" ||
    filters.search.trim() !== "" ||
    filters.from !== "" ||
    filters.to !== "";

  const clearFilters = () =>
    onChange({ outcome: "all", setup: "all", search: "", from: "", to: "" });

  return (
    <div className="flex flex-col gap-2.5 px-4 py-3 border-b border-border bg-white">
      {/* Row 1: Outcome + Setup filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <FilterPill
          value={filters.outcome}
          options={OUTCOME_OPTIONS}
          labels={OUTCOME_LABELS}
          onChange={(v) => onChange({ ...filters, outcome: v })}
          colors={OUTCOME_ACTIVE_COLORS}
        />

        <div className="w-px h-5 bg-border" />

        <div className="overflow-x-auto">
          <FilterPill
            value={filters.setup}
            options={ALL_SETUPS}
            labels={SETUP_LABELS_WITH_ALL}
            onChange={(v) => onChange({ ...filters, setup: v })}
          />
        </div>
      </div>

      {/* Row 2: Search + Date range + count */}
      <div className="flex items-center gap-3">
        <Input
          leftIcon={<Search />}
          placeholder="Search by stock..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="h-8 max-w-[200px] text-xs"
        />

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>From</span>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => onChange({ ...filters, from: e.target.value })}
            className="border border-border rounded-md h-8 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span>to</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => onChange({ ...filters, to: e.target.value })}
            className="border border-border rounded-md h-8 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-3" />
              Clear filters
            </button>
          )}

          <span className="text-xs text-muted-foreground">
            {hasActiveFilters ? (
              <>
                <span className="font-medium text-foreground">{filteredCount}</span> of {totalCount} trades
              </>
            ) : (
              <>
                <span className="font-medium text-foreground">{totalCount}</span> trades
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
