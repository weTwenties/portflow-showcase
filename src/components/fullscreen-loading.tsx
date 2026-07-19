"use client";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * Full-screen busy overlay so long-running admin actions (save, publish,
 * delete) are obvious. Sits under Sonner toasts so status messages stay visible.
 */
export function FullscreenLoading({
  show,
  label = "Working…",
  className,
}: {
  show: boolean;
  label?: string;
  className?: string;
}) {
  if (!show) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-[2px]",
        className,
      )}
    >
      <Spinner className="size-8 text-foreground" />
      <p className="text-sm font-medium text-foreground">{label}</p>
    </div>
  );
}
