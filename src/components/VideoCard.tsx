import { useState } from "react";
import { formatAgo, formatCount, PLATFORM_META } from "../format";
import type { Video } from "../types";

export function VideoCard({ video }: { video: Video }) {
  const [imageFailed, setImageFailed] = useState(false);
  const meta = PLATFORM_META[video.platform];
  const views = formatCount(video.stats.views);
  const likes = formatCount(video.stats.likes);
  const comments = formatCount(video.stats.comments);
  const ago = formatAgo(video.postedAt);
  const caption = video.caption.trim() || "Untitled video";
  const handle = video.author.handle;

  return (
    <li className="group">
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-xl bg-[var(--surface)] ring-1 ring-[var(--border)] transition hover:-translate-y-0.5 hover:ring-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        aria-label={`${caption.slice(0, 80)}, by ${handle || "unknown creator"} on ${meta.label}. Opens in a new tab.`}
      >
        <div className="relative aspect-[9/14] bg-[var(--surface-2)]">
          {video.thumbnail && !imageFailed ? (
            <img
              src={video.thumbnail}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
              No preview
            </div>
          )}
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold ${meta.badge}`}
          >
            {meta.label}
          </span>
          {views && (
            <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
              ▶ {views} views
            </span>
          )}
        </div>
        <div className="space-y-1.5 p-3">
          <p className="line-clamp-2 text-sm leading-snug text-[var(--text)]">{caption}</p>
          <p className="truncate text-xs text-[var(--muted)]">
            {handle ? `@${handle}` : "Unknown creator"}
            {ago && ` · ${ago}`}
          </p>
          {(likes || comments) && (
            <p className="flex gap-3 text-xs text-[var(--muted)]">
              {likes && <span>♥ {likes}</span>}
              {comments && <span>💬 {comments}</span>}
            </p>
          )}
        </div>
      </a>
    </li>
  );
}

export function SkeletonCard() {
  return (
    <li aria-hidden="true" className="overflow-hidden rounded-xl ring-1 ring-[var(--border)]">
      <div className="aspect-[9/14] animate-pulse bg-[var(--surface-2)]" />
      <div className="space-y-2 p-3">
        <div className="h-3 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--surface-2)]" />
      </div>
    </li>
  );
}
