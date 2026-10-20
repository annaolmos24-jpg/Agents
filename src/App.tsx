import { useEffect, useState } from "react";

type Health = {
  ok: boolean;
  apiKeyConfigured: boolean;
  passwordEnabled: boolean;
  time: string;
};

type Status =
  | { state: "loading" }
  | { state: "ready"; health: Health }
  | { state: "error"; message: string };

export default function App() {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    fetch("/api/health")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        setStatus({ state: "ready", health: (await res.json()) as Health });
      })
      .catch((err: unknown) =>
        setStatus({
          state: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        }),
      );
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-16">
      <div className="mx-auto max-w-xl">
        <h1 className="text-4xl font-bold tracking-tight">
          Trend<span className="text-violet-400">Finder</span>
        </h1>
        <p className="mt-3 text-slate-400">
          Trending videos from TikTok, Instagram and YouTube, in one place.
          Coming soon.
        </p>

        <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            System status
          </h2>
          {status.state === "loading" && (
            <p className="mt-3 text-slate-300">Checking server…</p>
          )}
          {status.state === "error" && (
            <p className="mt-3 text-rose-400">
              Server unreachable: {status.message}
            </p>
          )}
          {status.state === "ready" && (
            <ul className="mt-3 space-y-2">
              <StatusRow label="Server function" ok={status.health.ok} />
              <StatusRow
                label="Scrape Creators API key"
                ok={status.health.apiKeyConfigured}
                hint="Set SCRAPECREATORS_API_KEY in Netlify"
              />
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function StatusRow({ label, ok, hint }: { label: string; ok: boolean; hint?: string }) {
  return (
    <li className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className={ok ? "text-emerald-400" : "text-amber-400"}>
        {ok ? "✓ Ready" : `✗ Missing${hint ? ` (${hint})` : ""}`}
      </span>
    </li>
  );
}
