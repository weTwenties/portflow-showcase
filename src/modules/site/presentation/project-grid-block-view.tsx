import Link from "next/link";

import type { ProjectGridBlock } from "@/modules/layout/domain/blocks";
import type { ReleaseProjectCard } from "@/modules/publishing/domain/release";

const GAP_CLASS: Record<ProjectGridBlock["gap"], string> = {
  compact: "gap-4",
  normal: "gap-8",
  relaxed: "gap-12",
};

function gridColumnsClass(columns: ProjectGridBlock["columns"]): string {
  if (columns === 1) return "grid-cols-1";
  if (columns === 2) return "grid-cols-1 sm:grid-cols-2";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
}

/**
 * Renders the published project cards in portfolio order. Which projects
 * appear (and their order) comes from the portfolio organizer via the
 * release manifest — the block only controls presentation.
 */
export function ProjectGridBlockView({
  block,
  projects,
}: {
  block: ProjectGridBlock;
  projects: ReleaseProjectCard[];
}) {
  if (projects.length === 0) {
    return <p className="text-sm opacity-60">No published projects yet.</p>;
  }

  return (
    <section
      aria-label="Projects"
      className={`grid ${gridColumnsClass(block.columns)} ${GAP_CLASS[block.gap]}`}
    >
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/${project.slug}`}
          className="group flex flex-col gap-3"
        >
          {block.showCover ? (
            project.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- R2-hosted asset, no crop (ARD §10)
              <img
                src={project.coverUrl}
                alt=""
                width={project.coverWidth}
                height={project.coverHeight}
                loading="lazy"
                className="h-auto w-full rounded-lg"
              />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-current/10 text-sm opacity-50">
                {project.title}
              </div>
            )
          ) : null}
          <div>
            {block.showTitle ? (
              <h2 className="text-base font-medium group-hover:underline group-hover:underline-offset-4">
                {project.title}
              </h2>
            ) : null}
            {block.showSummary && project.summary ? (
              <p className="mt-1 text-sm opacity-70">{project.summary}</p>
            ) : null}
          </div>
        </Link>
      ))}
    </section>
  );
}
