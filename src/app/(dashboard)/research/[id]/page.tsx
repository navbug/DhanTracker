import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { BoardCanvasClient } from "@/components/research/board-canvas-client";

interface BoardPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: BoardPageProps): Promise<Metadata> {
  try {
    const board = await db.research.findUnique({
      where: { id: params.id },
      select: { title: true },
    });
    if (board) return { title: board.title };
  } catch {
    // ignore
  }
  return { title: "Research Board" };
}

export default async function BoardPage({ params }: BoardPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/");

  // Verify ownership server-side before rendering
  const board = await db.research.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });

  if (!board || board.userId !== session.user.id) {
    redirect("/research");
  }

  return (
    // Full-height layout — tldraw needs to fill the entire viewport
    <div className="flex flex-col h-full">
      <BoardCanvasClient boardId={params.id} />
    </div>
  );
}
