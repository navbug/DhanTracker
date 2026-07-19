"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateBoard, useUpdateBoard, type ResearchBoard } from "@/hooks/use-research";
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
import { RESEARCH_CATEGORY_LABELS, type ResearchCategory } from "@/types";

// ─── SCHEMA ───────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200).trim(),
  category: z.enum(["MARKET", "SECTOR", "STOCK", "PERSONAL"] as const),
  description: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── CATEGORY ICONS ───────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  ResearchCategory,
  { emoji: string; color: string; desc: string }
> = {
  MARKET: {
    emoji: "📈",
    color:
      "bg-blue-50 border-blue-200 text-blue-700 data-[active=true]:bg-blue-500 data-[active=true]:border-blue-500 data-[active=true]:text-white",
    desc: "Macro view, indices, broad market analysis",
  },
  SECTOR: {
    emoji: "🏭",
    color:
      "bg-violet-50 border-violet-200 text-violet-700 data-[active=true]:bg-violet-500 data-[active=true]:border-violet-500 data-[active=true]:text-white",
    desc: "Sector rotation, thematic plays",
  },
  STOCK: {
    emoji: "🎯",
    color:
      "bg-emerald-50 border-emerald-200 text-emerald-700 data-[active=true]:bg-emerald-500 data-[active=true]:border-emerald-500 data-[active=true]:text-white",
    desc: "Individual stock analysis & thesis",
  },
  PERSONAL: {
    emoji: "📓",
    color:
      "bg-amber-50 border-amber-200 text-amber-700 data-[active=true]:bg-amber-500 data-[active=true]:border-amber-500 data-[active=true]:text-white",
    desc: "Learnings, rules, personal notes",
  },
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────

interface BoardFormProps {
  open: boolean;
  onClose: () => void;
  editBoard?: ResearchBoard | null;
  /** Called after successful creation with the new board id */
  onCreated?: (id: string) => void;
}

export function BoardForm({ open, onClose, editBoard, onCreated }: BoardFormProps) {
  const createMutation = useCreateBoard();
  const updateMutation = useUpdateBoard();
  const isEdit = Boolean(editBoard);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: editBoard?.title ?? "",
      category: editBoard?.category ?? "MARKET",
      description: editBoard?.description ?? "",
    },
  });

  // Sync when editBoard changes
  useEffect(() => {
    if (open) {
      reset({
        title: editBoard?.title ?? "",
        category: editBoard?.category ?? "MARKET",
        description: editBoard?.description ?? "",
      });
    }
  }, [open, editBoard, reset]);

  const category = watch("category");

  const onSubmit = async (values: FormValues) => {
    if (isEdit && editBoard) {
      await updateMutation.mutateAsync({
        id: editBoard.id,
        payload: {
          title: values.title,
          category: values.category,
          description: values.description || null,
        },
      });
      onClose();
    } else {
      const board = await createMutation.mutateAsync({
        title: values.title,
        category: values.category,
        description: values.description || null,
      });
      reset();
      onClose();
      onCreated?.(board.id);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit board" : "New research board"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 py-2">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g. Nifty50 Weekly Analysis, HDFC Bank Breakout"
              {...register("title")}
              error={Boolean(errors.title)}
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <Label>Category *</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["MARKET", "SECTOR", "STOCK", "PERSONAL"] as ResearchCategory[]).map(
                (cat) => {
                  const cfg = CATEGORY_CONFIG[cat];
                  return (
                    <button
                      key={cat}
                      type="button"
                      data-active={category === cat}
                      onClick={() => setValue("category", cat)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all",
                        cfg.color
                      )}
                    >
                      <span className="text-base">{cfg.emoji}</span>
                      <div className="flex flex-col gap-0">
                        <span className="text-xs font-semibold">
                          {RESEARCH_CATEGORY_LABELS[cat]}
                        </span>
                        <span className="text-[10px] opacity-70 leading-tight">{cfg.desc}</span>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What is this board about? (optional)"
              {...register("description")}
              className="min-h-[72px] text-sm"
            />
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button variant="outline" type="button" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button type="submit" loading={isLoading} size="sm">
              {isEdit ? "Save changes" : "Create board →"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
