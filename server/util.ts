// Small helpers for reading untrusted JSON from upstream APIs.
// Every field is treated as optional; nothing here throws on bad input.

export type Json = Record<string, unknown>;

export function obj(value: unknown): Json {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : {};
}

export function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function str(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return undefined;
}

export function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** First URL from TikTok-style `{ url_list: [...] }` image objects. */
export function firstUrl(value: unknown): string | undefined {
  return str(arr(obj(value).url_list)[0]);
}

/** Accepts ISO strings or unix seconds; returns ISO 8601 or undefined. */
export function toIso(value: unknown): string | undefined {
  const seconds = num(value);
  const date =
    typeof value === "string" && seconds === undefined
      ? new Date(value)
      : seconds !== undefined
        ? new Date(seconds * 1000)
        : undefined;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
}

/** Drops undefined stats so the client can tell "unknown" from zero. */
export function compactStats(stats: Record<string, number | undefined>) {
  return Object.fromEntries(
    Object.entries(stats).filter(([, v]) => v !== undefined),
  ) as Record<string, number>;
}

export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}
