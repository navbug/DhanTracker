import Link from "next/link";
import { SearchX, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
        <SearchX className="size-6 text-primary/60" />
      </div>
      <div>
        <h1 className="text-base font-semibold text-foreground">Page not found</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          This page doesn&apos;t exist, or a link you followed may be out of date.
        </p>
      </div>
      <Button asChild size="sm" className="mt-2 gap-1.5">
        <Link href="/dashboard">
          <ArrowLeft className="size-3.5" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}