"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Upload, X, ImageIcon, Loader2, Search, Check } from "lucide-react";
import { format } from "date-fns";
import { useCreateTrade, useUpdateTrade, uploadScreenshot } from "@/hooks/use-trades";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/index";
import { Textarea } from "@/components/ui/form-fields";
import { cn } from "@/lib/utils";
import { NIFTY500_STOCKS } from "@/data/indices/index";
import {
  TRADE_SETUP_LABELS,
  TRADE_SETUP_DESCRIPTIONS,
  TRADE_PRIORITY_LABELS,
  TRADE_OUTCOME_LABELS,
  type TradeSetup,
  type TradePriority,
  type TradeOutcome,
  type Trade,
} from "@/types";

// ─── ZOD SCHEMA ──────────────────────────────────────────────────────────────

const tradeFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  stock: z.string().min(1, "Stock symbol is required").max(30).transform((s) => s.toUpperCase().trim()),
  tradeSetup: z.enum(["QUICK_TRADE", "HIT", "DIT", "WIT", "MIT", "QIT", "HYIT", "YIT"] as const),
  priority: z.enum(["MUST_TRADE", "HIGH", "MEDIUM", "LOW"] as const),
  entry: z.coerce.number().positive("Must be positive"),
  sl: z.coerce.number().positive("Must be positive"),
  target: z.coerce.number().positive("Must be positive"),
  qty: z.coerce.number().int().positive("Must be positive integer"),
  outcome: z.enum(["OPEN", "TARGET_HIT", "SL_HIT", "PARTIAL_PROFIT"] as const).default("OPEN"),
  timeTaken: z.string().max(100).optional(),
  remark: z.string().max(5000).optional(),
});

type TradeFormValues = z.infer<typeof tradeFormSchema>;

// ─── SETUP / PRIORITY / OUTCOME COLORS ───────────────────────────────────────

const SETUP_COLORS: Record<TradeSetup, string> = {
  QUICK_TRADE: "bg-amber-50 border-amber-200 text-amber-700 data-[active=true]:bg-amber-500 data-[active=true]:border-amber-500 data-[active=true]:text-white",
  HIT:  "bg-blue-50 border-blue-200 text-blue-700 data-[active=true]:bg-blue-500 data-[active=true]:border-blue-500 data-[active=true]:text-white",
  DIT:  "bg-violet-50 border-violet-200 text-violet-700 data-[active=true]:bg-violet-500 data-[active=true]:border-violet-500 data-[active=true]:text-white",
  WIT:  "bg-cyan-50 border-cyan-200 text-cyan-700 data-[active=true]:bg-cyan-500 data-[active=true]:border-cyan-500 data-[active=true]:text-white",
  MIT:  "bg-emerald-50 border-emerald-200 text-emerald-700 data-[active=true]:bg-emerald-500 data-[active=true]:border-emerald-500 data-[active=true]:text-white",
  QIT:  "bg-pink-50 border-pink-200 text-pink-700 data-[active=true]:bg-pink-500 data-[active=true]:border-pink-500 data-[active=true]:text-white",
  HYIT: "bg-orange-50 border-orange-200 text-orange-700 data-[active=true]:bg-orange-500 data-[active=true]:border-orange-500 data-[active=true]:text-white",
  YIT:  "bg-rose-50 border-rose-200 text-rose-700 data-[active=true]:bg-rose-500 data-[active=true]:border-rose-500 data-[active=true]:text-white",
};

const PRIORITY_COLORS: Record<TradePriority, string> = {
  MUST_TRADE: "bg-red-50 border-red-200 text-red-700 data-[active=true]:bg-red-500 data-[active=true]:border-red-500 data-[active=true]:text-white",
  HIGH:   "bg-orange-50 border-orange-200 text-orange-700 data-[active=true]:bg-orange-500 data-[active=true]:border-orange-500 data-[active=true]:text-white",
  MEDIUM: "bg-yellow-50 border-yellow-200 text-yellow-700 data-[active=true]:bg-yellow-500 data-[active=true]:border-yellow-500 data-[active=true]:text-white",
  LOW:    "bg-gray-50 border-gray-200 text-gray-600 data-[active=true]:bg-gray-500 data-[active=true]:border-gray-500 data-[active=true]:text-white",
};

const OUTCOME_COLORS: Record<"OPEN" | "TARGET_HIT" | "SL_HIT" | "PARTIAL_PROFIT", string> = {
  OPEN:           "bg-blue-50 border-blue-200 text-blue-700 data-[active=true]:bg-blue-500 data-[active=true]:border-blue-500 data-[active=true]:text-white",
  TARGET_HIT:     "bg-emerald-50 border-emerald-200 text-emerald-700 data-[active=true]:bg-emerald-500 data-[active=true]:border-emerald-500 data-[active=true]:text-white",
  SL_HIT:         "bg-red-50 border-red-200 text-red-700 data-[active=true]:bg-red-500 data-[active=true]:border-red-500 data-[active=true]:text-white",
  PARTIAL_PROFIT: "bg-teal-50 border-teal-200 text-teal-700 data-[active=true]:bg-teal-500 data-[active=true]:border-teal-500 data-[active=true]:text-white",
};

// ─── PILL SELECTOR ────────────────────────────────────────────────────────────

function PillSelector<T extends string>({
  options, labels, colors, value, onChange, error,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  colors: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
  error?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            data-active={value === opt}
            onClick={() => onChange(opt)}
            className={cn("px-2.5 py-1 rounded-md border text-xs font-medium transition-all", colors[opt])}
          >
            {labels[opt]}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

// ─── STOCK SEARCH INPUT ───────────────────────────────────────────────────────

function StockSearchInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (symbol: string) => void;
  error?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<{ symbol: string; companyName: string }[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Track whether the user is actively typing vs programmatic value sync
  const userTypingRef = useRef(false);

  // Sync query when form resets — do NOT open dropdown
  useEffect(() => {
    userTypingRef.current = false;
    setQuery(value);
    setOpen(false);
    setResults([]);
  }, [value]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();

    // Only search if user is actively typing
    if (!userTypingRef.current) return;
    if (q.length < 1) { setResults([]); setOpen(false); return; }

    debounceRef.current = setTimeout(() => {
      const upper = q.toUpperCase();
      const lower = q.toLowerCase();
      const matches = NIFTY500_STOCKS.filter(
        (s) => s.symbol.startsWith(upper) || s.companyName.toLowerCase().includes(lower)
      ).slice(0, 12);

      if (matches.length === 0) {
        fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`)
          .then((r) => r.json())
          .then((json) => {
            setResults(json.data ?? []);
            setOpen((json.data ?? []).length > 0);
          })
          .catch(() => {});
      } else {
        setResults(matches);
        setOpen(true);
      }
    }, 200);
  }, [query]);

  const select = (symbol: string) => {
    userTypingRef.current = false;
    setQuery(symbol);
    onChange(symbol);
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => { userTypingRef.current = true; setQuery(e.target.value.toUpperCase()); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search symbol or company..."
          className={cn(
            "h-9 w-full rounded-md border bg-white pl-8 pr-3 text-sm font-mono uppercase",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
            "placeholder:normal-case placeholder:font-sans placeholder:text-muted-foreground",
            error ? "border-destructive" : "border-input"
          )}
          autoComplete="off"
        />
      </div>

      {open && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-lg border border-border shadow-lg overflow-hidden">
            {results.map((r) => (
              <button
                key={r.symbol}
                type="button"
                onClick={() => select(r.symbol)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted transition-colors text-left gap-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {value === r.symbol && <Check className="size-3 text-primary shrink-0" />}
                  <span className="font-mono font-semibold text-xs text-foreground shrink-0">{r.symbol}</span>
                  <span className="text-xs text-muted-foreground truncate">{r.companyName}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── PNL PREVIEW ─────────────────────────────────────────────────────────────

function PnLPreview({ entry, sl, target, qty, outcome }: {
  entry: number; sl: number; target: number; qty: number; outcome: TradeOutcome;
}) {
  let exit: number | null = null;
  if (outcome === "TARGET_HIT") exit = target;
  else if (outcome === "SL_HIT") exit = sl;

  if (!exit || outcome === "OPEN" || !qty || !entry) return null;

  const pnl = (exit - entry) * qty;
  const rr = sl && entry ? Math.abs((target - entry) / (entry - sl)) : null;
  const positive = pnl >= 0;

  return (
    <div className={cn(
      "rounded-lg px-3 py-2 text-xs border flex items-center justify-between",
      positive ? "bg-profit/5 border-profit/20 text-profit" : "bg-loss/5 border-loss/20 text-loss"
    )}>
      <span className="font-medium">
        Estimated P&L: {positive ? "+" : ""}
        ₹{Math.abs(pnl).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </span>
      {rr && <span className="text-muted-foreground">R:R = 1:{rr.toFixed(2)}</span>}
    </div>
  );
}

// ─── SCREENSHOT UPLOADER ──────────────────────────────────────────────────────

function ScreenshotUploader({ screenshots, onChange }: {
  screenshots: string[];
  onChange: (urls: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (screenshots.length + files.length > 10) { alert("Maximum 10 screenshots"); return; }
    setUploading(true);
    const results = await Promise.all(Array.from(files).map((f) => uploadScreenshot(f)));
    onChange([...screenshots, ...results.filter(Boolean) as string[]]);
    setUploading(false);
  }, [screenshots, onChange]);

  const remove = (url: string) => onChange(screenshots.filter((u) => u !== url));

  return (
    <div className="flex flex-col gap-2">
      <label className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border p-4 cursor-pointer",
        "hover:border-primary/50 hover:bg-primary/5 transition-colors text-center",
        uploading && "opacity-50 pointer-events-none"
      )}>
        <input type="file" multiple accept="image/*" className="hidden"
          onChange={(e) => handleFiles(e.target.files)} />
        {uploading ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : <Upload className="size-5 text-muted-foreground" />}
        <span className="text-xs text-muted-foreground">
          {uploading ? "Uploading..." : "Click to upload screenshots (max 10)"}
        </span>
      </label>
      {screenshots.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {screenshots.map((url, i) => (
            <div key={i} className="relative w-16 h-16 rounded-md border border-border overflow-hidden group">
              <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <ImageIcon className="size-5 text-muted-foreground" />
              </div>
              <button type="button" onClick={() => remove(url)}
                className="absolute top-0.5 right-0.5 w-4 h-4 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <X className="size-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN FORM ────────────────────────────────────────────────────────────────

interface TradeFormProps {
  open: boolean;
  onClose: () => void;
  editTrade?: Trade | null;
}

export function TradeForm({ open, onClose, editTrade }: TradeFormProps) {
  const createMutation = useCreateTrade();
  const updateMutation = useUpdateTrade();
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const isEdit = Boolean(editTrade);

  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors } } =
    useForm<TradeFormValues>({
      resolver: zodResolver(tradeFormSchema),
      defaultValues: {
        date: format(new Date(), "yyyy-MM-dd"),
        stock: "",
        tradeSetup: "HIT",
        priority: "HIGH",
        outcome: "OPEN",
        timeTaken: "",
        remark: "",
      },
    });

  // ── Populate form when editTrade changes or modal opens ──────────────────
  useEffect(() => {
    if (open && editTrade) {
      reset({
        date: format(new Date(editTrade.date), "yyyy-MM-dd"),
        stock: editTrade.stock,
        tradeSetup: editTrade.tradeSetup as TradeFormValues["tradeSetup"],
        priority: editTrade.priority as TradeFormValues["priority"],
        entry: editTrade.entry,
        sl: editTrade.sl,
        target: editTrade.target,
        qty: editTrade.qty,
        outcome: (editTrade.outcome === "BREAKEVEN" || editTrade.outcome === "MANUAL_EXIT"
          ? "OPEN" : editTrade.outcome) as TradeFormValues["outcome"],
        timeTaken: editTrade.timeTaken ?? "",
        remark: editTrade.remark ?? "",
      });
      setScreenshots(editTrade.screenshots ?? []);
    } else if (open && !editTrade) {
      reset({
        date: format(new Date(), "yyyy-MM-dd"),
        stock: "",
        tradeSetup: "HIT",
        priority: "HIGH",
        outcome: "OPEN",
        timeTaken: "",
        remark: "",
      });
      setScreenshots([]);
    }
  }, [open, editTrade, reset]);

  const watchedValues = watch(["entry", "sl", "target", "qty", "outcome"]);

  const onSubmit = async (values: TradeFormValues) => {
    const payload = { ...values, screenshots };
    if (isEdit && editTrade) {
      await updateMutation.mutateAsync({ id: editTrade.id, payload });
    } else {
      await createMutation.mutateAsync(payload as never);
    }
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 sticky top-0 bg-white z-10 border-b border-border pb-4">
          <DialogTitle className="text-base font-semibold">
            {isEdit ? "Edit Trade" : "Log New Trade"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-5 flex flex-col gap-5">

            {/* Date + Stock search */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="date">Date *</Label>
                <Input id="date" type="date" leftIcon={<CalendarIcon />}
                  {...register("date")} error={Boolean(errors.date)} className="h-9" />
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Stock Symbol *</Label>
                <Controller
                  name="stock"
                  control={control}
                  render={({ field }) => (
                    <StockSearchInput
                      value={field.value}
                      onChange={field.onChange}
                      error={Boolean(errors.stock)}
                    />
                  )}
                />
                {errors.stock && <p className="text-xs text-destructive">{errors.stock.message}</p>}
              </div>
            </div>

            {/* Trade Setup */}
            <div className="flex flex-col gap-1.5">
              <Label>Trade Setup *</Label>
              <Controller
                name="tradeSetup"
                control={control}
                render={({ field }) => (
                  <PillSelector
                    options={["QUICK_TRADE", "HIT", "DIT", "WIT", "MIT", "QIT", "HYIT", "YIT"] as const}
                    labels={TRADE_SETUP_LABELS}
                    colors={SETUP_COLORS}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.tradeSetup?.message}
                  />
                )}
              />
              <p className="text-[10px] text-muted-foreground">
                {TRADE_SETUP_DESCRIPTIONS[watch("tradeSetup")]}
              </p>
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <Label>Priority *</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <PillSelector
                    options={["MUST_TRADE", "HIGH", "MEDIUM", "LOW"] as const}
                    labels={TRADE_PRIORITY_LABELS}
                    colors={PRIORITY_COLORS}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.priority?.message}
                  />
                )}
              />
            </div>

            {/* Entry / SL / Target / Qty */}
            <div className="grid grid-cols-4 gap-3">
              {(["entry", "sl", "target", "qty"] as const).map((field) => (
                <div key={field} className="flex flex-col gap-1.5">
                  <Label htmlFor={field} className="capitalize">
                    {field === "sl" ? "Stop Loss" : field === "qty" ? "Quantity" : field} *
                  </Label>
                  <Input id={field} type="number"
                    step={field === "qty" ? "1" : "0.01"} min="0"
                    placeholder={field === "qty" ? "100" : "0.00"}
                    {...register(field)} error={Boolean(errors[field])} className="h-9 num" />
                  {errors[field] && <p className="text-xs text-destructive">{errors[field]?.message}</p>}
                </div>
              ))}
            </div>

            {/* Outcome */}
            <div className="flex flex-col gap-1.5">
              <Label>Outcome</Label>
              <Controller
                name="outcome"
                control={control}
                render={({ field }) => (
                  <PillSelector
                    options={["OPEN", "TARGET_HIT", "SL_HIT", "PARTIAL_PROFIT"] as const}
                    labels={TRADE_OUTCOME_LABELS}
                    colors={OUTCOME_COLORS}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.outcome?.message}
                  />
                )}
              />
            </div>

            {/* P&L Preview */}
            <PnLPreview
              entry={Number(watchedValues[0]) || 0}
              sl={Number(watchedValues[1]) || 0}
              target={Number(watchedValues[2]) || 0}
              qty={Number(watchedValues[3]) || 0}
              outcome={watchedValues[4] as TradeOutcome}
            />

            {/* Time Taken */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="timeTaken">Time Taken</Label>
              <Input id="timeTaken" placeholder="e.g. 2 days, 1 week"
                {...register("timeTaken")} className="h-9" />
            </div>

            {/* Remark */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="remark">Remarks / Trade Thesis</Label>
              <Textarea id="remark"
                placeholder="What was your thesis? Did you follow your rules? Any learnings..."
                {...register("remark")} className="min-h-[72px] text-sm" />
            </div>

            {/* Screenshots */}
            <div className="flex flex-col gap-1.5">
              <Label>Screenshots</Label>
              <ScreenshotUploader screenshots={screenshots} onChange={setScreenshots} />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-muted/30 gap-2">
            <Button variant="outline" type="button" onClick={handleClose} size="sm">Cancel</Button>
            <Button type="submit" loading={isLoading} size="sm">
              {isEdit ? "Update Trade" : "Log Trade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}