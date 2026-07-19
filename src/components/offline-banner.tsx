"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const [status, setStatus] = useState<"online" | "offline" | "restored">("online");

  useEffect(() => {
    // Sync with real browser state on mount
    if (!navigator.onLine) setStatus("offline");

    const handleOffline = () => setStatus("offline");

    const handleOnline = () => {
      setStatus("restored");
      // Fade out the "back online" message after 3s
      setTimeout(() => setStatus("online"), 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (status === "online") return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998]",
        "flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-lg border text-sm font-medium",
        "transition-all duration-300 animate-in fade-in slide-in-from-bottom-2",
        status === "offline"
          ? "bg-destructive text-white border-destructive/80"
          : "bg-profit text-white border-profit/80"
      )}
    >
      {status === "offline" ? (
        <>
          <WifiOff className="size-4 shrink-0" />
          No internet connection
        </>
      ) : (
        <>
          <Wifi className="size-4 shrink-0" />
          Back online
        </>
      )}
    </div>
  );
}