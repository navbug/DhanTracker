import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  );
}

// Stock row skeleton — matches the exact column widths of the real row
export function StockRowSkeleton({ index }: { index: number }) {
  return (
    <div
      className="grid items-center border-b border-border/40 px-3 py-0"
      style={{
        gridTemplateColumns: "32px 32px 1fr 90px 80px 120px 110px 40px",
        height: "44px",
        opacity: 1 - index * 0.06,
      }}
    >
      {/* S.No */}
      <Skeleton className="h-3 w-5" />
      {/* Notes */}
      <Skeleton className="h-5 w-5 rounded" />
      {/* Stock name */}
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      {/* LTP */}
      <Skeleton className="h-3 w-14 ml-auto" />
      {/* %Change */}
      <Skeleton className="h-5 w-14 rounded-md ml-auto" />
      {/* Sector */}
      <Skeleton className="h-3 w-20" />
      {/* MCap */}
      <Skeleton className="h-3 w-16 ml-auto" />
      {/* Delete */}
      <div />
    </div>
  );
}

export function WatchlistLoadingSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <StockRowSkeleton key={i} index={i} />
      ))}
    </div>
  );
}
