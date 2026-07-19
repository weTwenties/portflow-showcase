"use client";

import { Label } from "@/components/ui/label";
import type {
  ProfileBlock,
  ProjectGridBlock,
} from "@/modules/layout/domain/blocks";

/**
 * Config cards for the site-only system blocks. The blocks render with real
 * data in Preview mode; while editing, the admin sees these settings panels
 * in place of the block.
 */

function ConfigCheckbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-1.5 text-xs">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

export function ProfileBlockEditor({
  block,
  onChange,
}: {
  block: ProfileBlock;
  onChange: (block: ProfileBlock) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-sm font-medium">Profile</p>
      <p className="text-xs text-muted-foreground">
        Shows your title, bio, avatar and social links from Site settings.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={`${block.id}-align`} className="text-xs">
            Align
          </Label>
          <select
            id={`${block.id}-align`}
            value={block.align}
            onChange={(event) =>
              onChange({ ...block, align: event.target.value as ProfileBlock["align"] })
            }
            className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs outline-none dark:bg-input/30"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
          </select>
        </div>
        <ConfigCheckbox
          id={`${block.id}-avatar`}
          label="Avatar"
          checked={block.showAvatar}
          onChange={(showAvatar) => onChange({ ...block, showAvatar })}
        />
        <ConfigCheckbox
          id={`${block.id}-bio`}
          label="Bio"
          checked={block.showBio}
          onChange={(showBio) => onChange({ ...block, showBio })}
        />
        <ConfigCheckbox
          id={`${block.id}-social`}
          label="Social links"
          checked={block.showSocialLinks}
          onChange={(showSocialLinks) => onChange({ ...block, showSocialLinks })}
        />
      </div>
    </div>
  );
}

export function ProjectGridBlockEditor({
  block,
  onChange,
}: {
  block: ProjectGridBlock;
  onChange: (block: ProjectGridBlock) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-sm font-medium">Project grid</p>
      <p className="text-xs text-muted-foreground">
        Shows published projects using the order and visibility from the
        portfolio organizer.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={`${block.id}-columns`} className="text-xs">
            Columns
          </Label>
          <select
            id={`${block.id}-columns`}
            value={block.columns}
            onChange={(event) =>
              onChange({
                ...block,
                columns: Number(event.target.value) as ProjectGridBlock["columns"],
              })
            }
            className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs outline-none dark:bg-input/30"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <Label htmlFor={`${block.id}-gap`} className="text-xs">
            Gap
          </Label>
          <select
            id={`${block.id}-gap`}
            value={block.gap}
            onChange={(event) =>
              onChange({ ...block, gap: event.target.value as ProjectGridBlock["gap"] })
            }
            className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs outline-none dark:bg-input/30"
          >
            <option value="compact">Compact</option>
            <option value="normal">Normal</option>
            <option value="relaxed">Relaxed</option>
          </select>
        </div>
        <ConfigCheckbox
          id={`${block.id}-cover`}
          label="Cover"
          checked={block.showCover}
          onChange={(showCover) => onChange({ ...block, showCover })}
        />
        <ConfigCheckbox
          id={`${block.id}-title`}
          label="Title"
          checked={block.showTitle}
          onChange={(showTitle) => onChange({ ...block, showTitle })}
        />
        <ConfigCheckbox
          id={`${block.id}-summary`}
          label="Summary"
          checked={block.showSummary}
          onChange={(showSummary) => onChange({ ...block, showSummary })}
        />
      </div>
    </div>
  );
}
