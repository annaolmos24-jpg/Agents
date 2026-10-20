import type { Video } from "./types";

export const SORTS = {
  views: "Most views",
  likes: "Most likes",
  comments: "Most comments",
  newest: "Newest",
} as const;
export type SortKey = keyof typeof SORTS;

/** Sorts a copy. Videos missing the sorted field go last rather than being treated as zero. */
export function sortVideos(videos: Video[], key: SortKey): Video[] {
  const value = (v: Video): number | undefined =>
    key === "newest" ? (v.postedAt ? Date.parse(v.postedAt) : undefined) : v.stats[key];
  return [...videos].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av === undefined && bv === undefined) return 0;
    if (av === undefined) return 1;
    if (bv === undefined) return -1;
    return bv - av;
  });
}
