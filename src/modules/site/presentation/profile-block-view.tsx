import type { ProfileBlock } from "@/modules/layout/domain/blocks";

export type ProfileData = {
  title: string;
  bio: string;
  avatarUrl?: string | null | undefined;
  socialLinks: Array<{ label: string; url: string }>;
};

/**
 * Renders the site's profile data (title, bio, avatar, social links). The
 * block only controls placement and visibility flags — the data itself
 * lives on the site document, so metadata never depends on this block.
 */
export function ProfileBlockView({
  block,
  profile,
}: {
  block: ProfileBlock;
  profile: ProfileData;
}) {
  const alignment =
    block.align === "center" ? "items-center text-center" : "items-start text-left";

  return (
    <header className={`flex flex-col gap-4 ${alignment}`}>
      {block.showAvatar && profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- R2-hosted asset, served as-is
        <img
          src={profile.avatarUrl}
          alt=""
          className="size-16 rounded-full object-cover"
        />
      ) : null}
      <h1 className="text-3xl font-semibold tracking-tight">{profile.title}</h1>
      {block.showBio && profile.bio ? (
        <p className="max-w-2xl text-base leading-7 whitespace-pre-line opacity-80">
          {profile.bio}
        </p>
      ) : null}
      {block.showSocialLinks && profile.socialLinks.length > 0 ? (
        <ul
          className={`flex flex-wrap gap-4 ${block.align === "center" ? "justify-center" : ""}`}
        >
          {profile.socialLinks.map((link) => (
            <li key={link.url}>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline underline-offset-4 opacity-80 hover:opacity-100"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}
