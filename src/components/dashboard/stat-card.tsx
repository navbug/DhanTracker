"use client";

import { useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  icon?: LucideIcon;
  color?: "default" | "profit" | "loss" | "primary";
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  subtext,
  trend,
  icon: Icon,
  color = "default",
  loading,
}: StatCardProps) {
  const valueRef = useRef<HTMLDivElement>(null);

  // Animate value change
  useEffect(() => {
    if (valueRef.current) {
      valueRef.current.classList.remove("animate-fade-in");
      void valueRef.current.offsetWidth;
      valueRef.current.classList.add("animate-fade-in");
    }
  }, [value]);

  const colorClasses = {
    default: "text-foreground",
    profit: "text-profit",
    loss: "text-loss",
    primary: "text-primary",
  };

  const iconBgClasses = {
    default: "bg-muted",
    profit: "bg-profit/10",
    loss: "bg-loss/10",
    primary: "bg-primary/10",
  };

  const iconColorClasses = {
    default: "text-muted-foreground",
    profit: "text-profit",
    loss: "text-loss",
    primary: "text-primary",
  };

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {label}
          </p>
          <div ref={valueRef} className="mt-1.5">
            {loading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded-md" />
            ) : (
              <p
                className={cn(
                  "text-2xl font-display font-bold num",
                  colorClasses[color]
                )}
              >
                {value}
              </p>
            )}
          </div>
          {subtext && (
            <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {Icon && (
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center",
                iconBgClasses[color]
              )}
            >
              <Icon className={cn("size-4", iconColorClasses[color])} />
            </div>
          )}
          {trend && (
            <div
              className={cn(
                "flex items-center gap-0.5 text-xs",
                trend === "up" ? "text-profit" : trend === "down" ? "text-loss" : "text-muted-foreground"
              )}
            >
              {trend === "up" && <TrendingUp className="size-3" />}
              {trend === "down" && <TrendingDown className="size-3" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
