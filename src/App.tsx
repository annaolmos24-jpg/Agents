import { useEffect, useMemo, useState } from "react";
import { fetchHealth, type FeedRequest, type Health } from "./api";
import { PlatformToggles, REGIONS, SearchBar, SelectField } from "./components/Controls";
import { SkeletonCard, VideoCard } from "./components/VideoCard";
import { PLATFORM_META } from "./format";
import { SORTS, sortVideos, type SortKey } from "./sort";
import { PLATFORMS, type Platform } from "./types";
import { useFeed, type PlatformState } from "./useFeed";

type Region = (typeof REGIONS)[number];

function readQueryFromUrl(): string {
  return new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
}

export default function App() {
  const [query, setQuery] = useState(readQueryFromUrl);
  const [platforms, setPlatforms] = useState<Platform[]>([...PLATFORMS]);
  const [region, setRegion] = useState<Region>("US");
  const [sort, setSort] = useState<SortKey>("views");
  const [health, setHealth] = useState<Health | null | undefined>(undefined);

  const request = useMemo<FeedRequest>(
    () => (query ? { mode: "search", query, region } : { mode: "trending", region }),
    [query, region],
  );
  const { feed, loadMore } = useFeed(request, platforms);

  useEffect(() => {
    fetchHealth().then(setHealth);
  }, []);

  // Keep ?q= in the address bar so searches can be shared and the back button works.
  useEffect(() => {
    const onPop = () => setQuery(readQueryFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = (q: string) => {
    const url = q ? `?q=${encodeURIComponent(q)}` : window.location.pathname;
    window.history.pushState(null, "", url);
    setQuery(q);
  };

  const states = platforms.map((p) => [p, feed[p]] as const);
  const videos = useMemo(
    () => sortVideos(states.flatMap(([, s]) => ("videos" in s ? s.videos : [])), sort),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feed, platforms, sort],
  );
  const anyLoading = states.some(([, s]) => s.status === "loading");
  const allFailed = states.every(([, s]) => s.status === "error");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => navigate("")}
              className="shrink-0 text-left text-2xl font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              aria-label="Trend Finder, go to trending"
            >
              Trend<span className="text-[var(--accent)]">Finder</span>
            </button>
            <SearchBar key={query} initial={query} onSearch={navigate} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <PlatformToggles enabled={platforms} onChange={setPlatforms} />
            <div className="flex flex-wrap gap-3 sm:ml-auto">
              <SelectField label="Sort" value={sort} options={SORTS} onChange={setSort} />
              <SelectField label="Region" value={region} options={REGIONS} onChange={setRegion} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {health && !health.apiKeyConfigured && (
          <p role="alert" className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
            The server has no Scrape Creators API key yet. Add <code>SCRAPECREATORS_API_KEY</code> in
            Netlify → Site configuration → Environment variables, then redeploy.
          </p>
        )}

        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-semibold">
            {query ? (
              <>
                Results for <span className="text-[var(--accent)]">“{query}”</span>
              </>
            ) : (
              "Trending now"
            )}
          </h1>
          {query && (
            <button
              type="button"
              onClick={() => navigate("")}
              className="text-sm text-[var(--accent)] underline-offset-2 hover:underline"
            >
              ← Back to trending
            </button>
          )}
        </div>

        <PlatformStatusBar states={states} />

        {allFailed ? (
          <EmptyState
            title="Couldn't load any videos"
            body="Every platform returned an error. Try again in a minute, or check the messages above."
          />
        ) : videos.length === 0 && !anyLoading ? (
          <EmptyState
            title="No videos found"
            body={query ? "Try a different keyword, or turn on more platforms." : "Nothing is trending right now. Try again shortly."}
          />
        ) : (
          <ul
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5"
            aria-busy={anyLoading}
            aria-label="Videos"
          >
            {videos.map((v) => (
              <VideoCard key={`${v.platform}:${v.id}`} video={v} />
            ))}
            {anyLoading && Array.from({ length: videos.length ? 4 : 10 }, (_, i) => <SkeletonCard key={`s${i}`} />)}
          </ul>
        )}

        {request.mode === "search" && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {states.map(([p, s]) =>
              s.status === "ready" && s.nextCursor ? (
                <button
                  key={p}
                  type="button"
                  disabled={s.loadingMore}
                  onClick={() => loadMore(p)}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:border-[var(--accent)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  {s.loadingMore ? "Loading…" : `Load more from ${PLATFORM_META[p].label}`}
                </button>
              ) : null,
            )}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-xs text-[var(--muted)]">
        Data from public posts via Scrape Creators. Results refresh every 10–15 minutes.
      </footer>
    </div>
  );
}

function PlatformStatusBar({ states }: { states: (readonly [Platform, PlatformState])[] }) {
  return (
    <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-live="polite">
      {states.map(([p, s]) => (
        <li key={p} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${PLATFORM_META[p].dot}`} aria-hidden="true" />
          <span className="font-medium">{PLATFORM_META[p].label}:</span>
          {s.status === "loading" && <span className="text-[var(--muted)]">loading…</span>}
          {s.status === "ready" && (
            <span className="text-[var(--muted)]">
              {s.videos.length} video{s.videos.length === 1 ? "" : "s"}
            </span>
          )}
          {s.status === "error" && <span className="text-[var(--danger)]">{s.error}</span>}
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{body}</p>
    </div>
  );
}
