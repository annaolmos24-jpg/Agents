import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPlatform, requestKey, type FeedRequest } from "./api";
import type { Platform, Video } from "./types";

export type PlatformState =
  | { status: "idle" }
  | { status: "loading"; videos: Video[] }
  | { status: "ready"; videos: Video[]; nextCursor?: string; loadingMore?: boolean }
  | { status: "error"; error: string; videos: Video[] };

type Feed = Record<Platform, PlatformState>;

/**
 * Loads each enabled platform independently. A platform only refetches when the part of
 * the request it actually uses changes (e.g. region doesn't affect Instagram), and
 * toggling one platform never reloads the others. Responses that arrive after the request
 * changed are ignored.
 */
export function useFeed(request: FeedRequest, platforms: Platform[]) {
  const [feed, setFeed] = useState<Feed>({
    tiktok: { status: "idle" },
    instagram: { status: "idle" },
    youtube: { status: "idle" },
  });
  // The request key each platform is currently showing (or loading) results for.
  const loadedKey = useRef<Partial<Record<Platform, string>>>({});

  const keys = platforms.map((p) => `${p}|${requestKey(p, request)}`).join(",");

  useEffect(() => {
    for (const platform of platforms) {
      const key = requestKey(platform, request);
      if (loadedKey.current[platform] === key) continue;
      loadedKey.current[platform] = key;
      setFeed((prev) => ({ ...prev, [platform]: { status: "loading", videos: [] } }));
      fetchPlatform(platform, request).then((result) => {
        if (loadedKey.current[platform] !== key) return;
        setFeed((prev) => ({
          ...prev,
          [platform]: result.ok
            ? { status: "ready", videos: result.videos, nextCursor: result.nextCursor }
            : { status: "error", error: result.error, videos: [] },
        }));
      });
    }
    // `keys` captures everything in `request` and `platforms` that should trigger a fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys]);

  const loadMore = useCallback(
    (platform: Platform) => {
      const current = feed[platform];
      if (request.mode !== "search" || current.status !== "ready" || !current.nextCursor) return;
      if (current.loadingMore) return;
      const key = loadedKey.current[platform];
      setFeed((prev) => ({ ...prev, [platform]: { ...current, loadingMore: true } }));
      fetchPlatform(platform, { ...request, cursor: current.nextCursor }).then((result) => {
        if (loadedKey.current[platform] !== key) return;
        setFeed((prev) => {
          const before = prev[platform];
          const existing = before.status === "ready" ? before.videos : current.videos;
          if (!result.ok) {
            // Keep what we already have; just stop offering "load more" on failure.
            return { ...prev, [platform]: { status: "ready", videos: existing } };
          }
          const seen = new Set(existing.map((v) => v.id));
          return {
            ...prev,
            [platform]: {
              status: "ready",
              videos: [...existing, ...result.videos.filter((v) => !seen.has(v.id))],
              nextCursor: result.videos.length > 0 ? result.nextCursor : undefined,
            },
          };
        });
      });
    },
    [feed, request],
  );

  return { feed, loadMore };
}
