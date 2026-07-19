"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus, Check, Loader2 } from "lucide-react";
import { useAddStock } from "@/hooks/use-watchlist";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchResult {
  symbol: string;
  companyName: string;
  sector?: string;
}

interface AddStockModalProps {
  open: boolean;
  onClose: () => void;
  watchlistId: string;
  existingSymbols: string[];
}

export function AddStockModal({
  open,
  onClose,
  watchlistId,
  existingSymbols,
}: AddStockModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedSymbols, setAddedSymbols] = useState<Set<string>>(new Set());
  const [loadingSymbol, setLoadingSymbol] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addMutation = useAddStock(watchlistId);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(query.trim())}`,
        );
        const json = await res.json();
        if (json.success) setResults(json.data);
      } catch {
        // ignore search errors
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setAddedSymbols(new Set());
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const handleAdd = async (symbol: string) => {
    if (addedSymbols.has(symbol) || existingSymbols.includes(symbol)) return;

    setLoadingSymbol(symbol);
    try {
      await addMutation.mutateAsync(symbol);
      setAddedSymbols((prev) => new Set([...prev, symbol]));
      // Don't close — let user add multiple stocks (matches sketch behavior)
    } finally {
      setLoadingSymbol(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle>Select stocks to add</DialogTitle>
          <DialogDescription className="text-xs">
            Type at least 2 characters to search
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="px-5 py-3 border-b border-border">
          <Input
            ref={inputRef}
            leftIcon={
              isSearching ? <Loader2 className="animate-spin" /> : <Search />
            }
            placeholder="Search by symbol or company name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10"
          />
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto">
          {results.length === 0 && query.length >= 2 && !isSearching && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No stocks found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Try the exact NSE symbol (e.g. RELIANCE, INFY)
              </p>
            </div>
          )}

          {query.length < 2 && (
            <div className="flex flex-col items-center justify-center py-8">
              <Search className="size-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">
                Search NSE stocks by symbol or company name
              </p>
            </div>
          )}

          {results.map((result) => {
            const isInWatchlist = existingSymbols.includes(result.symbol);
            const justAdded = addedSymbols.has(result.symbol);
            const isLoading = loadingSymbol === result.symbol;

            return (
              <div
                key={result.symbol}
                className={cn(
                  "flex items-center justify-between px-5 py-2.5 hover:bg-accent/50 transition-colors",
                  (isInWatchlist || justAdded) && "opacity-60",
                )}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {result.symbol}
                    </span>
                    {result.sector && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {result.sector}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground truncate">
                    {result.companyName}
                  </span>
                </div>

                <button
                  disabled={isInWatchlist || justAdded || isLoading}
                  onClick={() => handleAdd(result.symbol)}
                  className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-md border transition-all shrink-0 ml-3",
                    isInWatchlist || justAdded
                      ? "bg-profit/10 border-profit/20 text-profit cursor-default"
                      : "border-border hover:bg-primary hover:border-primary hover:text-white cursor-pointer",
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : isInWatchlist || justAdded ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Plus className="size-3.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {addedSymbols.size > 0 ? (
              <span className="text-profit font-medium">
                ✓ {addedSymbols.size} stock{addedSymbols.size !== 1 ? "s" : ""}{" "}
                added
              </span>
            ) : (
              "Click + to add stocks without closing this window"
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
