import Link from "next/link";
import { TrendingUp, ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const session = await auth();
  const homeHref = session?.user ? "/dashboard" : "/";
  const homeLabel = session?.user ? "Back to Dashboard" : "Back to Home";

  return (
    <div className="landing-gradient min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {/* ── Logo ── */}
      <Link href={homeHref} className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <TrendingUp className="size-4 text-white" />
        </div>
        <span className="font-display font-bold text-lg tracking-tight text-foreground">
          DhanTracker
        </span>
      </Link>

      {/* ── 404 ── */}
      <p className="font-display text-[6rem] sm:text-[8rem] leading-none font-bold text-primary/15 select-none">
        404
      </p>
      <h1 className="mt-2 text-2xl font-display font-bold text-foreground">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist, may have been moved, or the link is broken.
      </p>

      <Button asChild className="mt-8 gap-2">
        <Link href={homeHref}>
          <ArrowLeft className="size-4" />
          {homeLabel}
        </Link>
      </Button>
    </div>
  );
}