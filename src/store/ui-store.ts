import { create } from "zustand";
import type { MarketStatus } from "@/types";

// ─── UI STORE ────────────────────────────────────────────────────────────────
// Only pure UI state lives here — NO server data (that's TanStack Query's job)

interface UIStore {
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Active watchlist (for sidebar highlight)
  activeWatchlistId: string | null;
  setActiveWatchlistId: (id: string | null) => void;

  // Market status
  marketStatus: MarketStatus;
  setMarketStatus: (status: MarketStatus) => void;

  // Modals
  openModals: Set<string>;
  openModal: (id: string) => void;
  closeModal: (id: string) => void;
  isModalOpen: (id: string) => boolean;

  // Trade Ledger filters
  ledgerFilter: "all" | "open" | "won" | "lost";
  setLedgerFilter: (filter: "all" | "open" | "won" | "lost") => void;
  ledgerSetupFilter: string | null;
  setLedgerSetupFilter: (setup: string | null) => void;
  ledgerSearch: string;
  setLedgerSearch: (q: string) => void;

  // Research filters
  researchCategory: string;
  setResearchCategory: (cat: string) => void;
  researchSearch: string;
  setResearchSearch: (q: string) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Active watchlist
  activeWatchlistId: null,
  setActiveWatchlistId: (id) => set({ activeWatchlistId: id }),

  // Market status
  marketStatus: "unknown",
  setMarketStatus: (status) => set({ marketStatus: status }),

  // Modals
  openModals: new Set(),
  openModal: (id) =>
    set((s) => ({ openModals: new Set([...s.openModals, id]) })),
  closeModal: (id) =>
    set((s) => {
      const next = new Set(s.openModals);
      next.delete(id);
      return { openModals: next };
    }),
  isModalOpen: (id) => get().openModals.has(id),

  // Trade Ledger filters
  ledgerFilter: "all",
  setLedgerFilter: (filter) => set({ ledgerFilter: filter }),
  ledgerSetupFilter: null,
  setLedgerSetupFilter: (setup) => set({ ledgerSetupFilter: setup }),
  ledgerSearch: "",
  setLedgerSearch: (q) => set({ ledgerSearch: q }),

  // Research filters
  researchCategory: "all",
  setResearchCategory: (cat) => set({ researchCategory: cat }),
  researchSearch: "",
  setResearchSearch: (q) => set({ researchSearch: q }),
}));

// ─── WATCHLIST STORE ─────────────────────────────────────────────────────────
// UI-only state for watchlist page

interface WatchlistUIStore {
  search: string;
  setSearch: (q: string) => void;
  sortField: "symbol" | "pChange" | "marketCap" | null;
  sortDir: "asc" | "desc";
  setSort: (field: "symbol" | "pChange" | "marketCap") => void;
  addStockOpen: boolean;
  setAddStockOpen: (open: boolean) => void;
  notesStockSymbol: string | null;
  setNotesStock: (symbol: string | null) => void;
}

export const useWatchlistUIStore = create<WatchlistUIStore>((set, get) => ({
  search: "",
  setSearch: (q) => set({ search: q }),
  sortField: null,
  sortDir: "asc",
  setSort: (field) =>
    set((s) => ({
      sortField: field,
      sortDir: s.sortField === field && s.sortDir === "asc" ? "desc" : "asc",
    })),
  addStockOpen: false,
  setAddStockOpen: (open) => set({ addStockOpen: open }),
  notesStockSymbol: null,
  setNotesStock: (symbol) => set({ notesStockSymbol: symbol }),
}));
