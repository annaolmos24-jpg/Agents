import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPlatform, type FeedRequest } from "./api";
import type { Platform, Video } from "./types";

export type PlatformState =
  | { status: "idle" }
  | { status: "loading"; videos: Video[] }
  | { status: "ready"; videos: Video[]; nextCursor?: string; loadingMore?: boolean }
  | { status: "error"; error: string; videos: Video[] };

type Feed = Record<Platform, PlatformState>;

const idle = (): Feed => ({
  tiktok: { status: "idle" },
  instagram: { status: "idle" },
  youtube: { status: "idle" },
});

/**
 * Loads each enabled platform independently. Every new request bumps a generation
 * counter so slow responses from an older search can never overwrite newer results.
 */
export function useFeed(request: FeedRequest, platforms: Platform[]) {
  const [feed, setFeed] = useState<Feed>(idle);
  const generation = useRef(0);
  const key = JSON.stringify(request);

  useEffect(() => {
    const gen = ++generation.current;
    const req = JSON.parse(key) as FeedRequest;
    setFeed(() => {
      const next = idle();
      for (const p of platforms) next[p] = { status: "loading", videos: [] };
      return next;
    });
    for (const platform of platforms) {
      fetchPlatform(platform, req).then((result) => {
        if (gen !== generation.current) return;
        setFeed((prev) => ({
          ...prev,
          [platform]: result.ok
            ? { status: "ready", videos: result.videos, nextCursor: result.nextCursor }
            : { status: "error", error: result.error, videos: [] },
        }));
      });
    }
    // Platforms are compared by value so toggling one doesn't refetch the others' identical data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, platforms.join(",")]);

  const loadMore = useCallback(
    (platform: Platform) => {
      const current = feed[platform];
      if (request.mode !== "search" || current.status !== "ready" || !current.nextCursor) return;
      if (current.loadingMore) return;
      const gen = generation.current;
      setFeed((prev) => ({ ...prev, [platform]: { ...current, loadingMore: true } }));
      fetchPlatform(platform, { ...request, cursor: current.nextCursor }).then((result) => {
        if (gen !== generation.current) return;
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
