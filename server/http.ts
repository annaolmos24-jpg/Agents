import { PLATFORMS, type Platform } from "./types";

const MAX_QUERY_LENGTH = 100;

export function json(body: unknown, status = 200, cacheSeconds = 0): Response {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cacheSeconds > 0) {
    // Netlify's CDN caches per full URL (query string included), so repeat requests cost no credits.
    headers["netlify-cdn-cache-control"] = `public, s-maxage=${cacheSeconds}, stale-while-revalidate=60`;
    headers["cache-control"] = "public, max-age=0, must-revalidate";
  } else {
    headers["cache-control"] = "no-store";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export class BadRequest extends Error {}

export function parsePlatforms(raw: string | null): Platform[] {
  if (!raw) return [...PLATFORMS];
  const requested = [...new Set(raw.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean))];
  const invalid = requested.filter((p) => !(PLATFORMS as readonly string[]).includes(p));
  if (invalid.length > 0 || requested.length === 0) {
    throw new BadRequest(`platforms must be any of: ${PLATFORMS.join(", ")}`);
  }
  return requested as Platform[];
}

export function parseRegion(raw: string | null): string {
  const region = (raw ?? "US").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(region)) throw new BadRequest("region must be a 2-letter country code");
  return region;
}

/** "#booktok" → hashtag search for "booktok"; anything else is a keyword search. */
export function parseQuery(raw: string | null): { query: string; hashtag: boolean } {
  const trimmed = (raw ?? "").trim();
  const hashtag = trimmed.startsWith("#");
  const query = hashtag ? trimmed.slice(1).trim() : trimmed;
  if (!query) throw new BadRequest("q is required");
  if (query.length > MAX_QUERY_LENGTH) throw new BadRequest(`q must be at most ${MAX_QUERY_LENGTH} characters`);
  if (hashtag && !/^[\p{L}\p{N}_]+$/u.test(query)) {
    throw new BadRequest("hashtags can only contain letters, numbers and underscores");
  }
  return { query, hashtag };
}

export function parseCursor(raw: string | null, platforms: Platform[]): string | undefined {
  if (!raw) return undefined;
  if (platforms.length !== 1) throw new BadRequest("cursor requires exactly one platform");
  if (raw.length > 2000) throw new BadRequest("cursor is too long");
  return raw;
}

export function getApiKey(): string | undefined {
  return process.env.SCRAPECREATORS_API_KEY || undefined;
}

/** Full cache when every platform succeeded; a short cache for partial results so one flaky platform can't make every visit spend credits. */
export function cacheSecondsFor(results: { ok: boolean }[], full: number): number {
  const okCount = results.filter((r) => r.ok).length;
  if (okCount === results.length) return full;
  return okCount > 0 ? 60 : 0;
}
