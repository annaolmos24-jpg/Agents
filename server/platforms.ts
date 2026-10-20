import { scGet, ScrapeCreatorsError } from "./client";
import { normalizeInstagram } from "./normalize/instagram";
import { normalizeTikTok } from "./normalize/tiktok";
import { normalizeYouTube } from "./normalize/youtube";
import type { Platform, PlatformResult, Video } from "./types";
import { obj, str } from "./util";

type Page = { videos: Video[]; nextCursor?: string };

export type SearchOptions = { query: string; hashtag: boolean; cursor?: string; region: string };

export async function fetchTrending(
  platform: Platform,
  region: string,
  apiKey: string,
): Promise<Page> {
  switch (platform) {
    case "tiktok":
      return {
        videos: normalizeTikTok(
          await scGet("/v1/tiktok/get-trending-feed", { region, trim: true }, apiKey),
        ),
      };
    case "instagram":
      return { videos: normalizeInstagram(await scGet("/v1/instagram/reels/trending", {}, apiKey)) };
    case "youtube":
      return { videos: normalizeYouTube(await scGet("/v1/youtube/shorts/trending", {}, apiKey)) };
  }
}

export async function searchPlatform(
  platform: Platform,
  { query, hashtag, cursor, region }: SearchOptions,
  apiKey: string,
): Promise<Page> {
  switch (platform) {
    case "tiktok": {
      const body = hashtag
        ? await scGet("/v1/tiktok/search/hashtag", { hashtag: query, cursor, region, trim: true }, apiKey)
        : await scGet("/v1/tiktok/search/keyword", { query, cursor, region, trim: true }, apiKey);
      const b = obj(body);
      // Keyword search omits has_more; hashtag search sends has_more: 0 at the end.
      const more = b.has_more === undefined ? true : Boolean(b.has_more);
      return { videos: normalizeTikTok(body), nextCursor: more ? str(b.cursor) : undefined };
    }
    case "instagram": {
      // Instagram has no hashtag reel search with pagination, so hashtags are searched as keywords.
      const page = cursor ? Number(cursor) : 1;
      const body = await scGet("/v2/instagram/reels/search", { query: hashtag ? `#${query}` : query, page }, apiKey);
      const videos = normalizeInstagram(body);
      return { videos, nextCursor: videos.length > 0 ? String(page + 1) : undefined };
    }
    case "youtube": {
      const body = hashtag
        ? await scGet("/v1/youtube/search/hashtag", { hashtag: query, type: "shorts", continuationToken: cursor }, apiKey)
        : await scGet("/v1/youtube/search", { query, type: "shorts", region, continuationToken: cursor }, apiKey);
      return { videos: normalizeYouTube(body), nextCursor: str(obj(body).continuationToken) };
    }
  }
}

/** Runs one call per platform in parallel. A failure becomes that platform's error, never the whole response's. */
export async function settleAll(
  platforms: Platform[],
  load: (platform: Platform) => Promise<Page>,
): Promise<PlatformResult[]> {
  const settled = await Promise.allSettled(platforms.map(load));
  return settled.map((outcome, i): PlatformResult => {
    const platform = platforms[i];
    if (outcome.status === "fulfilled") return { platform, ok: true, ...outcome.value };
    const reason = outcome.reason;
    if (!(reason instanceof ScrapeCreatorsError)) console.error(`[${platform}]`, reason);
    return {
      platform,
      ok: false,
      error: reason instanceof ScrapeCreatorsError ? reason.message : "Something went wrong",
    };
  });
}
