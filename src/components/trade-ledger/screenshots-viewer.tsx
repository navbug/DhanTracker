"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Download } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ScreenshotsViewerProps {
  open: boolean;
  urls: string[];
  onClose: () => void;
}

export function ScreenshotsViewer({ open, urls, onClose }: ScreenshotsViewerProps) {
  const [current, setCurrent] = useState(0);

  if (!urls.length) return null;

  const prev = () => setCurrent((i) => (i - 1 + urls.length) % urls.length);
  const next = () => setCurrent((i) => (i + 1) % urls.length);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-xs text-white/60">
            {current + 1} / {urls.length}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={urls[current]}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors"
            >
              <Download className="size-3.5" />
              Download
            </a>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="relative flex items-center justify-center min-h-[60vh]">
          <img
            src={urls[current]}
            alt={`Screenshot ${current + 1}`}
            className="max-h-[70vh] max-w-full object-contain"
          />

          {/* Nav buttons */}
          {urls.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {urls.length > 1 && (
          <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10 overflow-x-auto">
            {urls.map((url, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  "shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all",
                  i === current ? "border-primary" : "border-transparent opacity-50 hover:opacity-80"
                )}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
