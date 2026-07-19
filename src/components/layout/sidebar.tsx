"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Eye,
  FlaskConical,
  ChevronRight,
  Plus,
  User,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PREDEFINED_WATCHLISTS } from "@/types";
import { useWatchlistStore } from "@/store/watchlist-store";
import { useCreateWatchlist } from "@/hooks/use-watchlist";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  user: Session["user"];
  isOpen: boolean;
  onToggle: () => void;
}

// ─── NAV ITEMS ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard",      label: "Dashboard",              icon: LayoutDashboard },
  { href: "/trade-ledger",   label: "Trade Ledger",           icon: BookOpen        },
  { href: "/high-weightage", label: "High Weightage Stocks",  icon: TrendingUp      },
  { href: "/research",       label: "Research Boards",        icon: FlaskConical    },
];

// ─── CREATE WATCHLIST MODAL ───────────────────────────────────────────────────

function CreateWatchlistModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const { mutateAsync, isPending } = useCreateWatchlist();

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Watchlist name is required"); return; }
    if (trimmed.length < 2) { setError("Name must be at least 2 characters"); return; }

    try {
      await mutateAsync(trimmed);
      setName("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create new watchlist</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <Input
            placeholder="Watchlist name..."
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending} size="sm">
            Cancel
          </Button>
          <Button onClick={handleCreate} loading={isPending} size="sm">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── PROFILE MODAL ────────────────────────────────────────────────────────────

function ProfileModal({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: Session["user"];
}) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden">
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt={user.name || "User"} className="w-full h-full object-cover" />
            ) : (
              <User className="size-7 text-primary/60" />
            )}
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleSignOut}
            loading={isSigningOut}
            className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────

export function Sidebar({ user, isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [createWatchlistOpen, setCreateWatchlistOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [watchlistsExpanded, setWatchlistsExpanded] = useState(true);

  // Reads directly from Zustand — zero API call
  const { customWatchlists } = useWatchlistStore();

  const isActiveRoute = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <aside
        className={cn(
          "relative flex flex-col h-full bg-white border-r border-border transition-all duration-300 ease-in-out shrink-0",
          isOpen ? "w-56" : "w-14"
        )}
      >
        {/* ── Logo + toggle ── */}
        <div className="flex items-center h-14 px-3 border-b border-border gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <TrendingUp className="size-3.5 text-white" />
          </div>
          {isOpen && (
            <span className="font-display font-bold text-base tracking-tight text-foreground truncate">
              DhanTracker
            </span>
          )}
          <button
            onClick={onToggle}
            className={cn(
              "p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors",
              isOpen ? "ml-auto" : "mx-auto"
            )}
          >
            {isOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "sidebar-item",
                isActiveRoute(href) && "active",
                !isOpen && "justify-center px-0"
              )}
              title={!isOpen ? label : undefined}
            >
              <Icon className="size-4 shrink-0" />
              {isOpen && <span className="truncate">{label}</span>}
            </Link>
          ))}

          {/* ── Watchlists section ── */}
          <div className="mt-3">
            {isOpen && (
              <button
                onClick={() => setWatchlistsExpanded((v) => !v)}
                className="flex items-center justify-between w-full px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Watchlists</span>
                <ChevronRight
                  className={cn(
                    "size-3 transition-transform duration-200",
                    watchlistsExpanded && "rotate-90"
                  )}
                />
              </button>
            )}

            {(isOpen ? watchlistsExpanded : true) && (
              <div className={cn("flex flex-col gap-0.5 mt-1", !isOpen && "px-0")}>
                {/* Predefined */}
                {PREDEFINED_WATCHLISTS.map((wl) => (
                  <Link
                    key={wl.id}
                    href={`/watchlist/${wl.id}`}
                    className={cn(
                      "sidebar-item",
                      isActiveRoute(`/watchlist/${wl.id}`) && "active",
                      isOpen ? "pl-5" : "justify-center px-0"
                    )}
                    title={!isOpen ? wl.name : undefined}
                  >
                    <Eye className="size-3.5 shrink-0" />
                    {isOpen && <span className="truncate text-xs">{wl.name}</span>}
                  </Link>
                ))}

                {/* Custom — reads from Zustand, no API call */}
                {customWatchlists.map((wl) => (
                  <Link
                    key={wl.id}
                    href={`/watchlist/${wl.id}`}
                    className={cn(
                      "sidebar-item",
                      isActiveRoute(`/watchlist/${wl.id}`) && "active",
                      isOpen ? "pl-5" : "justify-center px-0"
                    )}
                    title={!isOpen ? wl.name : undefined}
                  >
                    <Eye className="size-3.5 shrink-0 text-muted-foreground/60" />
                    {isOpen && <span className="truncate text-xs">{wl.name}</span>}
                  </Link>
                ))}

                {/* Create button */}
                <button
                  onClick={() => setCreateWatchlistOpen(true)}
                  className={cn(
                    "sidebar-item text-primary hover:text-primary hover:bg-primary/5",
                    isOpen ? "pl-5" : "justify-center px-0"
                  )}
                  title={!isOpen ? "Create watchlist" : undefined}
                >
                  <Plus className="size-3.5 shrink-0" />
                  {isOpen && <span className="text-xs">Create Watchlist</span>}
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* ── User profile ── */}
        <div className="border-t border-border p-2">
          <button
            onClick={() => setProfileOpen(true)}
            className={cn(
              "flex items-center gap-2.5 w-full rounded-lg p-2 hover:bg-accent transition-colors group",
              !isOpen && "justify-center"
            )}
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt={user.name || "User"} className="w-full h-full object-cover" />
              ) : (
                <User className="size-3.5 text-primary/60" />
              )}
            </div>
            {isOpen && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            )}
          </button>
        </div>
      </aside>

      <CreateWatchlistModal
        open={createWatchlistOpen}
        onClose={() => setCreateWatchlistOpen(false)}
      />
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
      />
    </>
  );
}
