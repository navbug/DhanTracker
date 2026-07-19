import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

// ─── TAILWIND ────────────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── FORMATTING ──────────────────────────────────────────────────────────────

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_00_00_000) {
      return `₹${(value / 1_00_00_000).toFixed(2)}Cr`;
    }
    if (Math.abs(value) >= 1_00_000) {
      return `₹${(value / 1_00_000).toFixed(2)}L`;
    }
    if (Math.abs(value) >= 1_000) {
      return `₹${(value / 1_000).toFixed(1)}K`;
    }
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formats a market cap value that is already in Crores (Cr.)
 * e.g. 187397 Cr → "₹1.87L Cr" , 5000 Cr → "₹5,000 Cr"
 */
export function formatMarketCap(valueCr: number): string {
  if (valueCr >= 1_00_000) {
    // Lakh crores
    return `₹${(valueCr / 1_00_000).toFixed(2)}L Cr`;
  }
  if (valueCr >= 1_000) {
    return `₹${Math.round(valueCr).toLocaleString("en-IN")} Cr`;
  }
  return `₹${valueCr.toFixed(0)} Cr`;
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercentage(value: number, showSign = true): string {
  const formatted = `${Math.abs(value).toFixed(2)}%`;
  if (showSign) {
    return value >= 0 ? `+${formatted}` : `-${formatted}`;
  }
  return formatted;
}

export function formatPnL(value: number): string {
  const abs = Math.abs(value);
  let formatted: string;
  if (abs >= 1_00_00_000) {
    formatted = `₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  } else if (abs >= 1_00_000) {
    formatted = `₹${(abs / 1_00_000).toFixed(2)}L`;
  } else {
    formatted = formatCurrency(abs);
  }
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy, h:mm a");
}

export function formatRelativeDate(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

// ─── STOCK HELPERS ───────────────────────────────────────────────────────────

export function calculateMarketCap(lastPrice: number, issuedSize: number): number {
  return lastPrice * issuedSize;
}

export function getPnLColor(value: number): string {
  if (value > 0) return "text-profit";
  if (value < 0) return "text-loss";
  return "text-muted-foreground";
}

export function getChangeColor(value: number): string {
  if (value > 0) return "text-profit";
  if (value < 0) return "text-loss";
  return "text-foreground";
}

// ─── MARKET HOURS ────────────────────────────────────────────────────────────

export function isMarketOpen(): boolean {
  const now = new Date();
  const istOffset = 5.5 * 60; // IST is UTC+5:30
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + istOffset * 60000);

  const day = ist.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) return false; // Weekend

  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Market: 9:15 AM to 3:30 PM IST
  return totalMinutes >= 9 * 60 + 15 && totalMinutes <= 15 * 60 + 30;
}

export function getMarketStatus(): "open" | "closed" | "pre-open" {
  const now = new Date();
  const istOffset = 5.5 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + istOffset * 60000);

  const day = ist.getDay();
  if (day === 0 || day === 6) return "closed";

  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  if (totalMinutes >= 9 * 60 + 0 && totalMinutes < 9 * 60 + 15) return "pre-open";
  if (totalMinutes >= 9 * 60 + 15 && totalMinutes <= 15 * 60 + 30) return "open";
  return "closed";
}

// ─── VALIDATION HELPERS ───────────────────────────────────────────────────────

export function isValidNSESymbol(symbol: string): boolean {
  return /^[A-Z&-]{1,20}$/.test(symbol.toUpperCase());
}

// ─── ARRAY HELPERS ───────────────────────────────────────────────────────────

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}