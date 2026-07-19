"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useTradeStore } from "@/store/trade-store";
import type { Trade, TradeSetup } from "@/types";

export type { TradeAnalytics } from "@/store/trade-store";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface TradeFilters {
  outcome?: "all" | "open" | "won" | "lost";
  setup?: TradeSetup | "all";
  search?: string;
}

export interface CreateTradePayload {
  date: string;
  stock: string;
  tradeSetup: TradeSetup;
  priority: "MUST_TRADE" | "HIGH" | "MEDIUM" | "LOW";
  entry: number;
  sl: number;
  target: number;
  qty: number;
  outcome?: Trade["outcome"];
  timeTaken?: string;
  remark?: string;
  screenshots?: string[];
  exitPrice?: number;
}

export type UpdateTradePayload = Partial<CreateTradePayload>;

// ─── READ: useTrades — reads Zustand, filters client-side ────────────────────

export function useTrades(filters: TradeFilters = {}) {
  const { trades, isLoaded } = useTradeStore();

  const data = useMemo(() => {
    let list = [...trades];

    if (filters.outcome && filters.outcome !== "all") {
      if (filters.outcome === "open") {
        list = list.filter((t) => t.outcome === "OPEN");
      } else if (filters.outcome === "won") {
        list = list.filter(
          (t) =>
            ["TARGET_HIT", "PARTIAL_PROFIT", "BREAKEVEN", "MANUAL_EXIT"].includes(t.outcome) &&
            (t.pnl ?? 0) > 0
        );
      } else if (filters.outcome === "lost") {
        list = list.filter((t) => t.outcome === "SL_HIT" || (t.pnl ?? 0) < 0);
      }
    }

    if (filters.setup && filters.setup !== "all") {
      list = list.filter((t) => t.tradeSetup === filters.setup);
    }

    if (filters.search?.trim()) {
      const q = filters.search.trim().toUpperCase();
      list = list.filter((t) => t.stock.includes(q));
    }

    return list;
  }, [trades, filters.outcome, filters.setup, filters.search]);

  return { data, isLoading: !isLoaded, error: null };
}

// ─── READ: useAnalytics — pure computation, zero API call ────────────────────

export function useAnalytics() {
  const { getAnalytics, isLoaded, trades } = useTradeStore();
  const data = useMemo(() => getAnalytics(), [getAnalytics, trades]);
  return { data, isLoading: !isLoaded };
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export function useCreateTrade() {
  const { addTrade, replaceTrade, removeTrade } = useTradeStore();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (payload: CreateTradePayload) => {
      setIsPending(true);
      const tempId = `temp_${Date.now()}`;

      // Optimistic add
      const tempTrade: Trade = {
        id: tempId,
        userId: "",
        date: payload.date,
        stock: payload.stock.toUpperCase(),
        tradeSetup: payload.tradeSetup,
        priority: payload.priority,
        entry: payload.entry,
        sl: payload.sl,
        target: payload.target,
        qty: payload.qty,
        outcome: payload.outcome ?? "OPEN",
        timeTaken: payload.timeTaken ?? null,
        remark: payload.remark ?? null,
        screenshots: payload.screenshots ?? [],
        exitPrice: payload.exitPrice ?? null,
        pnl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addTrade(tempTrade);

      try {
        const res = await fetch("/api/trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
        replaceTrade(tempId, json.data);
        toast.success("Trade logged successfully!");
        return json.data as Trade;
      } catch (err) {
        removeTrade(tempId);
        toast.error(err instanceof Error ? err.message : "Failed to log trade");
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [addTrade, replaceTrade, removeTrade]
  );

  return { mutateAsync, isPending };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export function useUpdateTrade() {
  const { updateTrade, trades } = useTradeStore();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async ({ id, payload }: { id: string; payload: UpdateTradePayload }) => {
      const rollback = trades.find((t) => t.id === id);

      // Instant update
      updateTrade(id, payload as Partial<Trade>);

      setIsPending(true);
      try {
        const res = await fetch(`/api/trades/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
        // Apply server response (has recalculated PnL)
        updateTrade(id, json.data);
        return json.data as Trade;
      } catch (err) {
        if (rollback) updateTrade(id, rollback);
        toast.error("Failed to update trade");
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [updateTrade, trades]
  );

  return { mutateAsync, isPending };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export function useDeleteTrade() {
  const { removeTrade, addTrade, trades } = useTradeStore();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (id: string) => {
      const rollback = trades.find((t) => t.id === id);
      removeTrade(id);

      setIsPending(true);
      try {
        const res = await fetch(`/api/trades/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
        toast.success("Trade deleted");
      } catch (err) {
        if (rollback) addTrade(rollback);
        toast.error("Failed to delete trade");
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [removeTrade, addTrade, trades]
  );

  return { mutateAsync, isPending };
}

// ─── SCREENSHOT UPLOAD — pure utility, no state ──────────────────────────────

export async function uploadScreenshot(file: File): Promise<string | null> {
  try {
    const res = await fetch("/api/upload", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    const { uploadUrl, publicUrl, note } = json.data;
    if (!uploadUrl) { console.warn("[Upload]", note); return publicUrl; }
    await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
    return publicUrl;
  } catch (e) {
    console.error("[Upload] Failed:", e);
    return null;
  }
}