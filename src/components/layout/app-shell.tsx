"use client";

import { useState } from "react";
import type { Session } from "next-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";

interface AppShellProps {
  user: Session["user"];
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          user={user}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
        {/* flex-1 + overflow-hidden lets child pages control their own scroll */}
        <main className="flex-1 overflow-hidden bg-[#F8F9FB]">
          <div className="h-full flex flex-col">{children}</div>
        </main>
      </div>
    </div>
  );
}