"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SetupStage, TradeSetupPost, TradeSetupFormValues } from "@/types";

// ─── QUERY KEYS ───────────────────────────────────────────────────────────────

export const tradeSetupKeys = {
  all: ["trade-setups"] as const,
  list: (stage: SetupStage) => ["trade-setups", stage] as const,
};

// ─── ERROR TYPE ───────────────────────────────────────────────────────────────
// Thrown when the server 402s — lets the page render an upsell instead of a
// generic error toast.

export class PremiumRequiredError extends Error {
  premiumRequired = true as const;
}

// ─── READ: useTradeSetups ─────────────────────────────────────────────────────

export function useTradeSetups(stage: SetupStage) {
  return useQuery({
    queryKey: tradeSetupKeys.list(stage),
    queryFn: async () => {
      const res = await fetch(`/api/trade-setups?stage=${stage}`);
      const json = await res.json();

      if (res.status === 402) {
        throw new PremiumRequiredError(json.message ?? "Premium required");
      }
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to load trade setups");
      }
      return json.data as TradeSetupPost[];
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

// ─── CREATE (admin only — server re-checks regardless of client state) ──────

export function useCreateTradeSetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TradeSetupFormValues) => {
      const res = await fetch("/api/trade-setups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to publish trade setup");
      return json.data as TradeSetupPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tradeSetupKeys.all });
      toast.success("Trade setup published");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to publish trade setup");
    },
  });
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export function useUpdateTradeSetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<TradeSetupFormValues> }) => {
      const res = await fetch(`/api/trade-setups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to update trade setup");
      return json.data as TradeSetupPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tradeSetupKeys.all });
      toast.success("Trade setup updated");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update trade setup");
    },
  });
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export function useDeleteTradeSetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/trade-setups/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to delete trade setup");
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tradeSetupKeys.all });
      toast.success("Trade setup deleted");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete trade setup");
    },
  });
}
