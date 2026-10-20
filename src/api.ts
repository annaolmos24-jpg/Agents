import type { FeedResponse, Platform, PlatformResult } from "./types";

export type FeedRequest =
  | { mode: "trending"; region: string }
  | { mode: "search"; query: string; region: string; cursor?: string };

/** Fetches one platform at a time so each can render as soon as it arrives. */
export async function fetchPlatform(platform: Platform, req: FeedRequest): Promise<PlatformResult> {
  const params = new URLSearchParams({ platforms: platform, region: req.region });
  if (req.mode === "search") {
    params.set("q", req.query);
    if (req.cursor) params.set("cursor", req.cursor);
  }
  try {
    const res = await fetch(`/api/${req.mode}?${params}`);
    const body = (await res.json().catch(() => null)) as (FeedResponse & { error?: string }) | null;
    const result = body?.results?.[0];
    if (res.ok && result) return result;
    return { platform, ok: false, error: body?.error ?? `Request failed (${res.status})` };
  } catch {
    return { platform, ok: false, error: "Network error. Check your connection" };
  }
}

export type Health = { ok: boolean; apiKeyConfigured: boolean; passwordEnabled: boolean };

export async function fetchHealth(): Promise<Health | null> {
  try {
    const res = await fetch("/api/health");
    return res.ok ? ((await res.json()) as Health) : null;
  } catch {
    return null;
  }
}
