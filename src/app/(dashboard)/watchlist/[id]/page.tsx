import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WatchlistClient } from "@/components/watchlist/watchlist-client";
import { isPredefinedIndex, getIndexMeta } from "@/data/indices/index";
import { db } from "@/lib/db";

interface WatchlistPageProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: WatchlistPageProps): Promise<Metadata> {
  const {id} = await params;
  if (isPredefinedIndex(id)) {
    const meta = getIndexMeta(id);
    return { title: meta?.name ?? "Watchlist" };
  }
  try {
    const session = await auth();
    if (session?.user?.id) {
      const wl = await db.watchlist.findUnique({
        where: { id: id },
        select: { name: true },
      });
      if (wl) return { title: wl.name };
    }
  } catch {
    // ignore
  }
  return { title: "Watchlist" };
}

export default async function WatchlistPage({ params }: WatchlistPageProps) {
  const {id} = await params;
  const session = await auth();
  if (!session?.user) redirect("/");

  if (!isPredefinedIndex(id)) {
    const wl = await db.watchlist.findUnique({
      where: { id: id },
      select: { userId: true },
    });
    if (!wl || wl.userId !== session.user.id) {
      redirect("/dashboard");
    }
  }

  return (
    <div className="flex flex-col h-full">
      <WatchlistClient watchlistId={id} />
    </div>
  );
}
