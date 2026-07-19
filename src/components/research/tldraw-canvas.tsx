"use client";

import { useEffect, useRef, useCallback } from "react";
import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { useAutoSaveCanvas } from "@/hooks/use-research";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const AUTOSAVE_DEBOUNCE_MS = 2500; // 2.5 seconds after last change

// ─── THUMBNAIL CAPTURE ───────────────────────────────────────────────────────

async function captureThumbnail(editor: Editor): Promise<string | null> {
  try {
    const shapeIds = editor.getCurrentPageShapeIds();
    if (!shapeIds || shapeIds.size === 0) return null;

    // tldraw v3 API — use getSvgElement. Fall back gracefully if API differs.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorAny = editor as any;
    const getSvgFn =
      editorAny.getSvgElement ??
      editorAny.getSvg ??
      editorAny.exportSvg;

    if (typeof getSvgFn !== "function") return null;

    const svg = await getSvgFn.call(editor, [...shapeIds], {
      background: true,
      padding: 16,
      scale: 0.35,
    });

    if (!svg) return null;

    const svgStr = new XMLSerializer().serializeToString(svg);
    const encoded = btoa(unescape(encodeURIComponent(svgStr)));
    return `data:image/svg+xml;base64,${encoded}`;
  } catch {
    // Thumbnail capture is optional — never break auto-save
    return null;
  }
}

// ─── PROPS ───────────────────────────────────────────────────────────────────

interface TldrawCanvasProps {
  boardId: string;
  initialSnapshot?: unknown;
  onSaveStatusChange?: (status: "saved" | "saving" | "unsaved" | "error") => void;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function TldrawCanvas({
  boardId,
  initialSnapshot,
  onSaveStatusChange,
}: TldrawCanvasProps) {
  const autoSaveMutation = useAutoSaveCanvas(boardId);
  const editorRef = useRef<Editor | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);
  const lastSavedRef = useRef<string>("");

  // ── Auto-save with debounce ───────────────────────────────────────────────
  const scheduleAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    onSaveStatusChange?.("unsaved");
    isDirtyRef.current = true;

    saveTimerRef.current = setTimeout(async () => {
      const editor = editorRef.current;
      if (!editor) return;

      const snapshot = editor.store.getSnapshot();
      const snapshotStr = JSON.stringify(snapshot);

      if (snapshotStr === lastSavedRef.current) {
        onSaveStatusChange?.("saved");
        return;
      }

      onSaveStatusChange?.("saving");

      try {
        const thumbnail = await captureThumbnail(editor);
        await autoSaveMutation.mutateAsync({ canvas: snapshot, thumbnail });
        lastSavedRef.current = snapshotStr;
        isDirtyRef.current = false;
        onSaveStatusChange?.("saved");
      } catch {
        onSaveStatusChange?.("error");
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [autoSaveMutation, onSaveStatusChange]);

  // ── Save on page unload if dirty ─────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirtyRef.current && editorRef.current) {
        const snapshot = editorRef.current.store.getSnapshot();
        // Use sendBeacon for reliable unload saves
        const body = JSON.stringify({ canvas: snapshot });
        navigator.sendBeacon?.(`/api/research/${boardId}`, body);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [boardId]);

  // ── Editor mount ─────────────────────────────────────────────────────────
  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      // Restore saved canvas
      if (initialSnapshot) {
        try {
          editor.store.loadSnapshot(
            initialSnapshot as Parameters<typeof editor.store.loadSnapshot>[0]
          );
          // Fit to content after a short delay (canvas needs to settle)
          setTimeout(() => {
            try {
              editor.zoomToFit({ animation: { duration: 200 } });
            } catch {
              // zoomToFit may not have the animation option in all versions
              try { editor.zoomToFit(); } catch { /* ignore */ }
            }
          }, 100);
        } catch (e) {
          console.warn("[Tldraw] Could not restore snapshot:", e);
        }
      }

      lastSavedRef.current = JSON.stringify(editor.store.getSnapshot());
      onSaveStatusChange?.("saved");

      // Listen for document changes only (not camera/selection changes)
      const unlisten = editor.store.listen(
        () => { scheduleAutoSave(); },
        { scope: "document" }
      );

      return () => unlisten();
    },
    [initialSnapshot, scheduleAutoSave, onSaveStatusChange]
  );

  return (
    <div className="w-full h-full">
      <Tldraw onMount={handleMount} />
    </div>
  );
}
