import { create } from "zustand";
import type { StockPrice } from "@/types";

interface PriceStore {
  prices: Record<string, StockPrice>; // keyed by UPPERCASE symbol
  isLoaded: boolean;

  // Set all prices at once (boot)
  setPrices: (prices: Record<string, StockPrice>) => void;

  // Merge incoming prices into existing store (15-min poll refresh)
  mergePrices: (prices: Record<string, StockPrice>) => void;
}

export const usePriceStore = create<PriceStore>((set) => ({
  prices: {},
  isLoaded: false,

  setPrices: (prices) => set({ prices, isLoaded: true }),

  mergePrices: (incoming) =>
    set((s) => ({ prices: { ...s.prices, ...incoming } })),
}));