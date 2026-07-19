import { create } from "zustand";
import type { ResearchBoard } from "@/hooks/use-research";

// ─── STORE ────────────────────────────────────────────────────────────────────

interface ResearchStore {
  boards: ResearchBoard[];
  isLoaded: boolean;

  // Boot
  setBoards: (boards: ResearchBoard[]) => void;

  // CRUD
  addBoard: (board: ResearchBoard) => void;
  updateBoard: (id: string, updates: Partial<ResearchBoard>) => void;
  removeBoard: (id: string) => void;
}

export const useResearchStore = create<ResearchStore>((set) => ({
  boards: [],
  isLoaded: false,

  setBoards: (boards) => set({ boards, isLoaded: true }),

  addBoard: (board) =>
    set((s) => ({ boards: [board, ...s.boards] })),

  updateBoard: (id, updates) =>
    set((s) => ({
      boards: s.boards.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

  removeBoard: (id) =>
    set((s) => ({ boards: s.boards.filter((b) => b.id !== id) })),
}));
