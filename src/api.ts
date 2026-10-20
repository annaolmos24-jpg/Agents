import type { FeedResponse, Platform, PlatformResult } from "./types";

const PASSWORD_KEY = "trendfinder:password";

// Storage can be unavailable (private windows, blocked site data), so every access is guarded.
export function getSavedPassword(): string {
  try {
    return localStorage.getItem(PASSWORD_KEY) ?? "";
  } catch {
    return "";
  }
}

export function savePassword(password: string | null) {
  try {
    if (password) localStorage.setItem(PASSWORD_KEY, password);
    else localStorage.removeItem(PASSWORD_KEY);
  } catch {
    // Not remembered; the user will be asked again next visit.
  }
}

function authHeaders(password = getSavedPassword()): HeadersInit {
  return password ? { "x-app-password": password } : {};
}

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
    const res = await fetch(`/api/${req.mode}?${params}`, { headers: authHeaders() });
    const body = (await res.json().catch(() => null)) as (FeedResponse & { error?: string }) | null;
    const result = body?.results?.[0];
    if (res.ok && result) return result;
    return { platform, ok: false, error: body?.error ?? `Request failed (${res.status})` };
  } catch {
    return { platform, ok: false, error: "Network error. Check your connection" };
  }
}

export type Health = {
  ok: boolean;
  apiKeyConfigured: boolean;
  passwordEnabled: boolean;
  authorized: boolean;
};

/** Free (no credits). Pass a password to check it before saving. */
export async function fetchHealth(password?: string): Promise<Health | null> {
  try {
    const res = await fetch("/api/health", { headers: authHeaders(password) });
    return res.ok ? ((await res.json()) as Health) : null;
  } catch {
    return null;
  }
}
