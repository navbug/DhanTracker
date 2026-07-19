"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState } from "react";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      },
    },
  });
}

// ─── PROVIDERS ────────────────────────────────────────────────────────────────
// Thin shell — only QueryClient + Toaster live here so they're available
// on ALL pages (including landing). AppBootstrap lives in the dashboard layout
// so boot fetches only fire after authentication.

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{ style: { fontFamily: "var(--font-dm-sans)" } }}
      />
    </QueryClientProvider>
  );
}