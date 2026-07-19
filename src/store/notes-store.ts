import { create } from "zustand";

// ─── STORE ────────────────────────────────────────────────────────────────────
// notes is keyed by UPPERCASE symbol → note text.
// One note per stock per user, shared across all custom watchlists.

interface NotesStore {
  notes: Record<string, string>;
  isLoaded: boolean;

  // Boot
  setNotes: (notes: Record<string, string>) => void;

  // CRUD
  setNote: (symbol: string, note: string) => void;
  removeNote: (symbol: string) => void;
  getNote: (symbol: string) => string;
}

export const useNotesStore = create<NotesStore>((set, get) => ({
  notes: {},
  isLoaded: false,

  setNotes: (notes) => set({ notes, isLoaded: true }),

  setNote: (symbol, note) =>
    set((s) => ({ notes: { ...s.notes, [symbol.toUpperCase()]: note } })),

  removeNote: (symbol) =>
    set((s) => {
      const next = { ...s.notes };
      delete next[symbol.toUpperCase()];
      return { notes: next };
    }),

  getNote: (symbol) => get().notes[symbol.toUpperCase()] ?? "",
}));