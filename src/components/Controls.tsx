import { useState, type FormEvent } from "react";
import { PLATFORM_META } from "../format";
import { PLATFORMS, type Platform } from "../types";

export const REGIONS = ["US", "GB", "CA", "AU", "IN", "DE", "FR", "ES", "MX", "BR", "JP"] as const;

export function SearchBar({
  initial,
  onSearch,
}: {
  initial: string;
  onSearch: (query: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (q) onSearch(q.slice(0, 101));
  };
  return (
    <form role="search" onSubmit={submit} className="flex w-full gap-2">
      <label htmlFor="q" className="sr-only">
        Search keyword or #hashtag
      </label>
      <input
        id="q"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={101}
        placeholder="Search a keyword or #hashtag"
        className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
      />
      <button
        type="submit"
        className="rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
      >
        Search
      </button>
    </form>
  );
}

export function PlatformToggles({
  enabled,
  onChange,
}: {
  enabled: Platform[];
  onChange: (next: Platform[]) => void;
}) {
  const toggle = (p: Platform) => {
    const next = enabled.includes(p) ? enabled.filter((x) => x !== p) : [...enabled, p];
    // Keep the original platform order, and never allow zero platforms.
    if (next.length > 0) onChange(PLATFORMS.filter((x) => next.includes(x)));
  };
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">Platforms</legend>
      {PLATFORMS.map((p) => {
        const on = enabled.includes(p);
        return (
          <button
            key={p}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(p)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              on
                ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text)]"
                : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${on ? PLATFORM_META[p].dot : "bg-[var(--border)]"}`} />
            {PLATFORM_META[p].label}
          </button>
        );
      })}
    </fieldset>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[] | Record<T, string>;
  onChange: (value: T) => void;
}) {
  const entries: [T, string][] = Array.isArray(options)
    ? options.map((o) => [o, o])
    : (Object.entries(options) as [T, string][]);
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
      >
        {entries.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

