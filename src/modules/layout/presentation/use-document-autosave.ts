"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { withResourceLock } from "@/lib/api/client";
import { useAdminUiStore } from "@/stores/admin-ui-store";

export type AutosaveStatus = "saved" | "pending" | "saving" | "error";

/**
 * Debounced document autosave shared by the project and homepage canvases.
 * Domain-agnostic: the caller serializes nothing and owns the actual save
 * call (revision bookkeeping included); the hook owns debounce, no-op
 * detection via snapshot comparison, dirty-state wiring, Web Locks, and
 * error surfacing.
 */
export function useDocumentAutosave<TState>({
  resourceId,
  save,
  mapError,
  delayMs = 1_200,
}: {
  resourceId: string;
  save: (state: TState) => Promise<void>;
  mapError?: (error: unknown) => string;
  delayMs?: number;
}): {
  status: AutosaveStatus;
  errorMessage: string | null;
  /** Call with the full next state after every edit. */
  schedule: (next: TState) => void;
  /** Marks the given state as persisted (call after the initial load). */
  markBaseline: (state: TState) => void;
} {
  const [status, setStatus] = useState<AutosaveStatus>("saved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const setDirty = useAdminUiStore((state) => state.setDirty);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRef = useRef<string | null>(null);
  const saveRef = useRef(save);
  const mapErrorRef = useRef(mapError);

  // Keep the latest callbacks without retriggering scheduled saves.
  useEffect(() => {
    saveRef.current = save;
    mapErrorRef.current = mapError;
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setDirty(resourceId, false);
    };
  }, [resourceId, setDirty]);

  const markBaseline = useCallback(
    (state: TState) => {
      snapshotRef.current = JSON.stringify(state);
      setStatus("saved");
      setErrorMessage(null);
      setDirty(resourceId, false);
    },
    [resourceId, setDirty],
  );

  const runSave = useCallback(
    async (next: TState) => {
      const snapshot = JSON.stringify(next);
      if (snapshot === snapshotRef.current) {
        setStatus("saved");
        setDirty(resourceId, false);
        return;
      }

      setStatus("saving");
      setErrorMessage(null);
      try {
        await withResourceLock(resourceId, () => saveRef.current(next));
        snapshotRef.current = snapshot;
        setStatus("saved");
        setDirty(resourceId, false);
      } catch (error) {
        setStatus("error");
        setErrorMessage(
          mapErrorRef.current?.(error) ??
            (error instanceof Error ? error.message : "Autosave failed"),
        );
      }
    },
    [resourceId, setDirty],
  );

  const schedule = useCallback(
    (next: TState) => {
      setDirty(resourceId, true);
      setStatus("pending");
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        void runSave(next);
      }, delayMs);
    },
    [resourceId, delayMs, runSave, setDirty],
  );

  return { status, errorMessage, schedule, markBaseline };
}
