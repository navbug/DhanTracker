"use client";

import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { useSaveNote } from "@/hooks/use-notes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-fields";

interface NotesModalProps {
  open: boolean;
  onClose: () => void;
  symbol: string;
  initialNote?: string;
}

export function NotesModal({
  open,
  onClose,
  symbol,
  initialNote = "",
}: NotesModalProps) {
  const [note, setNote] = useState(initialNote);
  const saveMutation = useSaveNote();

  // Sync note when modal opens for a different stock
  useEffect(() => {
    if (open) setNote(initialNote);
  }, [open, initialNote]);

  const handleSave = async () => {
    await saveMutation.mutateAsync({ symbol, note });
    onClose();
  };

  const hasChanges = note.trim() !== (initialNote ?? "").trim();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            Notes for{" "}
            <span className="font-mono text-primary">{symbol}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-1">
          <Textarea
            placeholder={`Add your research notes, price targets, or observations for ${symbol}...`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[140px] text-sm"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-1.5 text-right">
            {note.length} / 2000
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} size="sm">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={saveMutation.isPending}
            disabled={!hasChanges}
            size="sm"
          >
            Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}