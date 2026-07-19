"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import type { AutosaveStatus } from "@/modules/layout/presentation/use-document-autosave";

const AUTOSAVE_TOAST_ID = "document-autosave";

const AUTOSAVE_TOAST_OPTIONS = {
  id: AUTOSAVE_TOAST_ID,
  position: "bottom-right" as const,
};

/**
 * Mirrors autosave status into a single Sonner toast at bottom-right
 * (colored via richColors). No fullscreen overlay — that is reserved for
 * intentional actions like publish. Skips the initial "saved" state so load
 * doesn't flash a success toast.
 */
export function useAutosaveFeedback(
  status: AutosaveStatus,
  errorMessage: string | null,
): void {
  const armedRef = useRef(false);

  useEffect(() => {
    if (status === "pending" || status === "saving" || status === "error") {
      armedRef.current = true;
    }
    if (!armedRef.current) {
      return;
    }

    if (status === "pending") {
      toast("Unsaved changes", {
        ...AUTOSAVE_TOAST_OPTIONS,
        description: "Autosave will run shortly.",
      });
      return;
    }

    if (status === "saving") {
      toast.loading("Saving…", AUTOSAVE_TOAST_OPTIONS);
      return;
    }

    if (status === "error") {
      toast.error(errorMessage ?? "Save failed", AUTOSAVE_TOAST_OPTIONS);
      return;
    }

    toast.success("Saved", AUTOSAVE_TOAST_OPTIONS);
  }, [status, errorMessage]);
}
