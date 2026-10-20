import type { Platform } from "./types";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function formatCount(n: number | undefined): string | null {
  return n === undefined ? null : compact.format(n);
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

export function formatAgo(iso: string | undefined, now = Date.now()): string | null {
  if (!iso) return null;
  const seconds = (new Date(iso).getTime() - now) / 1000;
  if (Number.isNaN(seconds)) return null;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export const PLATFORM_META: Record<Platform, { label: string; badge: string; dot: string }> = {
  tiktok: { label: "TikTok", badge: "bg-slate-950/80 text-white", dot: "bg-cyan-400" },
  instagram: { label: "Instagram", badge: "bg-pink-700 text-white", dot: "bg-pink-500" },
  youtube: { label: "YouTube", badge: "bg-red-700 text-white", dot: "bg-red-500" },
};
