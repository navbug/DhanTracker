"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useResearchStore } from "@/store/research-store";
import type { ResearchCategory } from "@/types";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface ResearchBoard {
  id: string;
  title: string;
  category: ResearchCategory;
  description?: string | null;
  thumbnail?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchBoardWithCanvas extends ResearchBoard {
  canvas?: unknown;
}

export interface CreateBoardPayload {
  title: string;
  category: ResearchCategory;
  description?: string | null;
}

export interface UpdateBoardPayload {
  title?: string;
  category?: ResearchCategory;
  description?: string | null;
  canvas?: unknown;
  thumbnail?: string | null;
}

// ─── READ: useResearchBoards — reads Zustand, filters client-side ────────────

export function useResearchBoards(category?: string, search?: string) {
  const { boards, isLoaded } = useResearchStore();

  const data = boards.filter((b) => {
    if (category && category !== "all" && b.category !== category) return false;
    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      return b.title.toLowerCase().includes(q) || (b.description ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  return { data, isLoading: !isLoaded, error: null };
}

// ─── READ: useResearchBoard — single board with canvas (still API fetched) ───
// Canvas is excluded from the boot list fetch (too large). Fetched on demand.

import { useQuery } from "@tanstack/react-query";

export function useResearchBoard(id: string) {
  return useQuery({
    queryKey: ["research", "canvas", id],
    queryFn: async () => {
      const res = await fetch(`/api/research/${id}`);
      if (!res.ok) throw new Error("Board not found");
      const json = await res.json();
      return json.data as ResearchBoardWithCanvas;
    },
    staleTime: Infinity,
    enabled: Boolean(id),
  });
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export function useCreateBoard() {
  const { addBoard } = useResearchStore();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (payload: CreateBoardPayload) => {
      setIsPending(true);
      try {
        const res = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
        addBoard(json.data);
        toast.success(`"${json.data.title}" created`);
        return json.data as ResearchBoard;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create board");
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [addBoard]
  );

  return { mutateAsync, isPending };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export function useUpdateBoard() {
  const { updateBoard } = useResearchStore();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async ({ id, payload }: { id: string; payload: UpdateBoardPayload }) => {
      // Instant update for non-canvas fields
      if (payload.title || payload.category || payload.description !== undefined) {
        updateBoard(id, payload as Partial<ResearchBoard>);
      }

      setIsPending(true);
      try {
        const res = await fetch(`/api/research/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
        updateBoard(id, json.data);
        return json.data as ResearchBoard;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update board");
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [updateBoard]
  );

  return { mutateAsync, isPending };
}

// ─── AUTO-SAVE CANVAS — silent, no toast, updates thumbnail in store ──────────

export function useAutoSaveCanvas(boardId: string) {
  const { updateBoard } = useResearchStore();

  const mutateAsync = useCallback(
    async ({ canvas, thumbnail }: { canvas: unknown; thumbnail?: string | null }) => {
      const res = await fetch(`/api/research/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvas, thumbnail }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Save failed");
      // Update thumbnail in the boards list so card previews refresh
      if (thumbnail) updateBoard(boardId, { thumbnail });
      return json.data as ResearchBoard;
    },
    [boardId, updateBoard]
  );

  return { mutateAsync };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export function useDeleteBoard() {
  const { removeBoard } = useResearchStore();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (id: string) => {
      removeBoard(id); // instant

      setIsPending(true);
      try {
        const res = await fetch(`/api/research/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
        toast.success("Board deleted");
      } catch (err) {
        toast.error("Failed to delete board");
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [removeBoard]
  );

  return { mutateAsync, isPending };
}

// ─── QUERY KEY (for canvas queries) ──────────────────────────────────────────

export const researchKeys = {
  canvas: (id: string) => ["research", "canvas", id] as const,
};
