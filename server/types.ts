export const PLATFORMS = ["tiktok", "instagram", "youtube"] as const;
export type Platform = (typeof PLATFORMS)[number];

/** One video, in the same shape regardless of which platform it came from. */
export type Video = {
  id: string;
  platform: Platform;
  url: string;
  thumbnail: string | null;
  caption: string;
  author: { handle: string; name?: string; avatar?: string };
  stats: { views?: number; likes?: number; comments?: number; shares?: number };
  /** ISO 8601 */
  postedAt?: string;
};

/** Result for a single platform. One platform failing never hides the others. */
export type PlatformResult =
  | { platform: Platform; ok: true; videos: Video[]; nextCursor?: string }
  | { platform: Platform; ok: false; error: string };

export type FeedResponse = { results: PlatformResult[] };
