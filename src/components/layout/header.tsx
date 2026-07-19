"use client";

import { useEffect, useState } from "react";
import type { Session } from "next-auth";
import { Menu, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMarketStatus } from "@/lib/utils";
import { ContactModal } from "@/components/layout/contact-modal";
import type { MarketStatus } from "@/types";

interface HeaderProps {
  user: Session["user"];
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

function MarketStatusIndicator() {
  const [status, setStatus] = useState<MarketStatus>("unknown");
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const update = () => {
      setStatus(getMarketStatus());
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    };
    update();
    const interval = setInterval(update, 30_000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const config = {
    open: { label: "Market Live", dot: "bg-profit animate-pulse", text: "text-profit" },
    closed: { label: "Market Closed", dot: "bg-muted-foreground/50", text: "text-muted-foreground" },
    "pre-open": { label: "Pre-Open", dot: "bg-amber-400 animate-pulse", text: "text-amber-600" },
    unknown: { label: "—", dot: "bg-muted-foreground/30", text: "text-muted-foreground" },
  };

  const { label, dot, text } = config[status];

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-1.5 h-1.5 rounded-full", dot)} />
      <span className={cn("text-xs font-medium", text)}>{label}</span>
      {time && (
        <span className="text-xs text-muted-foreground/70 flex items-center gap-0.5">
          <Clock className="size-2.5" />
          {time} IST
        </span>
      )}
    </div>
  );
}

export function Header({ user, sidebarOpen, onToggleSidebar }: HeaderProps) {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <header className="h-14 border-b border-border bg-white flex items-center px-4 gap-3 shrink-0">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors lg:hidden"
        >
          <Menu className="size-4" />
        </button>

        {/* Market status */}
        <div className="flex-1 flex items-center">
          <MarketStatusIndicator />
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setContactOpen(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Contact Us
          </button>
        </div>
      </header>

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} user={user} />
    </>
  );
}