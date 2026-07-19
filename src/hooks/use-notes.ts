"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useNotesStore } from "@/store/notes-store";

// ─── useSaveNote ──────────────────────────────────────────────────────────────
// Saves a note globally for a stock symbol — applies across all watchlists.
// Optimistic: updates Zustand immediately, persists in background.

export function useSaveNote() {
  const { setNote, removeNote } = useNotesStore();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async ({ symbol, note }: { symbol: string; note: string }) => {
      const trimmed = note.trim();

      // Optimistic update
      if (trimmed) {
        setNote(symbol, trimmed);
      } else {
        removeNote(symbol);
      }

      setIsPending(true);
      try {
        const res = await fetch("/api/stock-notes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol, note: trimmed || null }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      } catch {
        toast.error("Failed to save note");
      } finally {
        setIsPending(false);
      }
    },
    [setNote, removeNote]
  );

  return { mutateAsync, isPending };
}