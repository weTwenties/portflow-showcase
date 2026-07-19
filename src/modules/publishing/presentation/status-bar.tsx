"use client";

import { useState } from "react";
import { toast } from "sonner";

import { FullscreenLoading } from "@/components/fullscreen-loading";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import type { PublishResponse } from "@/lib/api/contracts";
import type { CurrentPointer } from "@/modules/publishing/domain/release";
import {
  selectHasUnsavedChanges,
  useAdminUiStore,
} from "@/stores/admin-ui-store";

export function StatusBar({
  currentRelease,
  publicUrl,
  onPublished,
}: {
  currentRelease: CurrentPointer | null;
  publicUrl: string;
  onPublished: () => void;
}) {
  const hasUnsavedChanges = useAdminUiStore(selectHasUnsavedChanges);
  const [isPublishing, setIsPublishing] = useState(false);

  async function handlePublish() {
    setIsPublishing(true);
    try {
      const result = await apiFetch<PublishResponse>("/api/admin/publish", {
        method: "POST",
      });
      toast.success(
        `Published release ${result.releaseId} (${result.projectCount} projects).`,
      );
      onPublished();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `${error.message}. The previous release is still live.`
          : "Publish failed. The previous release is still live.",
      );
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border p-4">
      <FullscreenLoading show={isPublishing} label="Publishing…" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          {currentRelease ? (
            <p>
              Live release{" "}
              <span className="font-mono text-xs">
                {currentRelease.releaseId}
              </span>{" "}
              <span className="text-muted-foreground">
                ({new Date(currentRelease.publishedAt).toLocaleString()})
              </span>
            </p>
          ) : (
            <p className="text-muted-foreground">
              Nothing published yet — the public site is empty until the first
              publish.
            </p>
          )}
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary underline-offset-4 hover:underline"
          >
            {publicUrl}
          </a>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges ? (
            <span className="text-xs text-amber-600 dark:text-amber-500">
              Unsaved changes — publish uses the last saved drafts
            </span>
          ) : null}
          <Button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
          >
            Publish
          </Button>
        </div>
      </div>
    </section>
  );
}
