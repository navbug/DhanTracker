"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Check, Upload, X, ImagePlus, Loader2 } from "lucide-react";
import { useCreateTradeSetup, useUpdateTradeSetup } from "@/hooks/use-trade-setups";
import { uploadScreenshot } from "@/hooks/use-trades";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/index";
import { Textarea } from "@/components/ui/form-fields";
import { cn } from "@/lib/utils";
import { SETUP_STAGE_LABELS, type SetupStage, type TradeSetupPost } from "@/types";

// ─── ZOD SCHEMA (text fields only — images are separate upload state) ───────

const formSchema = z.object({
  stockSymbol: z
    .string()
    .min(1, "Stock symbol is required")
    .max(30)
    .transform((s) => s.toUpperCase().trim()),
  companyName: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  stage: z.enum(["UPCOMING", "LIVE", "PAST"] as const),
});

type FormValues = z.infer<typeof formSchema>;

const STAGE_COLORS: Record<SetupStage, string> = {
  UPCOMING:
    "bg-amber-50 border-amber-200 text-amber-700 data-[active=true]:bg-amber-500 data-[active=true]:border-amber-500 data-[active=true]:text-white",
  LIVE: "bg-emerald-50 border-emerald-200 text-emerald-700 data-[active=true]:bg-emerald-500 data-[active=true]:border-emerald-500 data-[active=true]:text-white",
  PAST: "bg-slate-100 border-slate-300 text-slate-600 data-[active=true]:bg-slate-600 data-[active=true]:border-slate-600 data-[active=true]:text-white",
};

// ─── STOCK SEARCH INPUT ───────────────────────────────────────────────────────
// Delegates entirely to /api/stocks/search, which already does Nifty500-first
// then Yahoo-fallback matching — no need to duplicate that logic here.

function StockSearchInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (symbol: string, companyName: string) => void;
  error?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<{ symbol: string; companyName: string }[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userTypingRef = useRef(false);

  useEffect(() => {
    userTypingRef.current = false;
    setQuery(value);
    setOpen(false);
    setResults([]);
  }, [value]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!userTypingRef.current) return;

    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((json) => {
          const data = json.data ?? [];
          setResults(data);
          setOpen(data.length > 0);
        })
        .catch(() => {});
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const select = (symbol: string, companyName: string) => {
    userTypingRef.current = false;
    setQuery(symbol);
    onChange(symbol, companyName);
    setOpen(false);
    setResults([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            userTypingRef.current = true;
            setQuery(e.target.value.toUpperCase());
          }}
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
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-lg border border-border shadow-lg overflow-hidden max-h-56 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.symbol}
                type="button"
                onClick={() => select(r.symbol, r.companyName)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted transition-colors text-left gap-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {value === r.symbol && <Check className="size-3 text-primary shrink-0" />}
                  <span className="font-mono font-semibold text-xs text-foreground shrink-0">
                    {r.symbol}
                  </span>
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

// ─── STAGE SELECTOR ───────────────────────────────────────────────────────────

function StageSelector({ value, onChange }: { value: SetupStage; onChange: (v: SetupStage) => void }) {
  const options: SetupStage[] = ["UPCOMING", "LIVE", "PAST"];
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          data-active={value === opt}
          onClick={() => onChange(opt)}
          className={cn(
            "px-3 py-1.5 rounded-md border text-xs font-medium transition-all",
            STAGE_COLORS[opt]
          )}
        >
          {SETUP_STAGE_LABELS[opt]}
        </button>
      ))}
    </div>
  );
}

// ─── SINGLE IMAGE UPLOADER ────────────────────────────────────────────────────

function SingleImageUploader({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  error?: string;
}) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setIsUploading(true);
      const url = await uploadScreenshot(file);
      if (url) onChange(url);
      setIsUploading(false);
    },
    [onChange]
  );

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {value ? (
        <div className="relative w-full h-28 rounded-lg border border-border overflow-hidden group bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={label}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            title="Remove"
          >
            <X className="size-3.5" />
          </button>
          <label
            className="absolute bottom-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            title="Replace"
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Upload className="size-3.5" />
          </label>
        </div>
      ) : (
        <label
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-4 cursor-pointer h-28",
            "hover:border-primary/50 hover:bg-primary/5 transition-colors text-center",
            isUploading && "opacity-50 pointer-events-none",
            error ? "border-destructive" : "border-border"
          )}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {isUploading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus className="size-5 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {isUploading ? "Uploading..." : "Click to upload image"}
          </span>
        </label>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── MAIN FORM MODAL ──────────────────────────────────────────────────────────

interface TradeSetupFormModalProps {
  open: boolean;
  onClose: () => void;
  editPost?: TradeSetupPost | null;
}

export function TradeSetupFormModal({ open, onClose, editPost }: TradeSetupFormModalProps) {
  const createMutation = useCreateTradeSetup();
  const updateMutation = useUpdateTradeSetup();
  const isEdit = Boolean(editPost);

  const [chartImageUrl, setChartImageUrl] = useState("");
  const [resultChartImageUrl, setResultChartImageUrl] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stockSymbol: "",
      companyName: "",
      description: "",
      stage: "UPCOMING",
    },
  });

  const stage = watch("stage");
  const companyName = watch("companyName");

  useEffect(() => {
    if (open && editPost) {
      reset({
        stockSymbol: editPost.stockSymbol,
        companyName: editPost.companyName ?? "",
        description: editPost.description ?? "",
        stage: editPost.stage,
      });
      setChartImageUrl(editPost.chartImageUrl);
      setResultChartImageUrl(editPost.resultChartImageUrl ?? "");
      setImageError(null);
    } else if (open && !editPost) {
      reset({ stockSymbol: "", companyName: "", description: "", stage: "UPCOMING" });
      setChartImageUrl("");
      setResultChartImageUrl("");
      setImageError(null);
    }
  }, [open, editPost, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!chartImageUrl) {
      setImageError("Chart image is required");
      return;
    }
    if (values.stage === "PAST" && !resultChartImageUrl) {
      setImageError("Result chart image is required for Past setups");
      return;
    }
    setImageError(null);

    const payload = {
      ...values,
      chartImageUrl,
      resultChartImageUrl: values.stage === "PAST" ? resultChartImageUrl : undefined,
    };

    if (isEdit && editPost) {
      await updateMutation.mutateAsync({ id: editPost.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onClose();
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 sticky top-0 bg-white z-10 border-b border-border pb-4">
          <DialogTitle className="text-base font-semibold">
            {isEdit ? "Edit Trade Setup" : "Add Trade Setup"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-5 flex flex-col gap-5">
            {/* Stock Symbol */}
            <div className="flex flex-col gap-1.5">
              <Label>Stock Symbol *</Label>
              <Controller
                name="stockSymbol"
                control={control}
                render={({ field }) => (
                  <StockSearchInput
                    value={field.value}
                    onChange={(symbol, companyName) => {
                      field.onChange(symbol);
                      setValue("companyName", companyName);
                    }}
                    error={Boolean(errors.stockSymbol)}
                  />
                )}
              />
              {errors.stockSymbol && (
                <p className="text-xs text-destructive">{errors.stockSymbol.message}</p>
              )}
              {!errors.stockSymbol && companyName && (
                <p className="text-xs text-muted-foreground">{companyName}</p>
              )}
            </div>

            {/* Category / Stage */}
            <div className="flex flex-col gap-1.5">
              <Label>Category *</Label>
              <Controller
                name="stage"
                control={control}
                render={({ field }) => (
                  <StageSelector
                    value={field.value}
                    onChange={(v) => {
                      field.onChange(v);
                      // Only clear on a real user change — not during edit hydration
                      if (v !== "PAST") setResultChartImageUrl("");
                    }}
                  />
                )}
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Entry, stop loss, target, and thesis for this setup..."
                {...register("description")}
                className="min-h-[72px] text-sm"
              />
            </div>

            {/* Chart Image */}
            <SingleImageUploader
              label="Chart Image *"
              value={chartImageUrl}
              onChange={(url) => {
                setChartImageUrl(url);
                if (url) setImageError(null);
              }}
              error={!chartImageUrl ? imageError ?? undefined : undefined}
            />

            {/* Result Chart Image — only for Past */}
            {stage === "PAST" && (
              <SingleImageUploader
                label="Result Chart Image * (after SL / target / cost-to-cost)"
                value={resultChartImageUrl}
                onChange={(url) => {
                  setResultChartImageUrl(url);
                  if (url) setImageError(null);
                }}
                error={!resultChartImageUrl ? imageError ?? undefined : undefined}
              />
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-muted/30 gap-2">
            <Button variant="outline" type="button" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button type="submit" loading={isLoading} size="sm">
              {isEdit ? "Update Trade Setup" : "Add Trade Setup"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
