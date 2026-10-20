import { useState, type FormEvent } from "react";
import { fetchHealth, savePassword } from "../api";

export function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "wrong" | "error">("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!value) return;
    setState("checking");
    const health = await fetchHealth(value);
    if (!health) return setState("error");
    if (!health.authorized) return setState("wrong");
    savePassword(value);
    onUnlock();
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <h1 className="text-2xl font-bold tracking-tight">
          Trend<span className="text-[var(--accent)]">Finder</span>
        </h1>
        <div className="space-y-1">
          <label htmlFor="pw" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="pw"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (state !== "checking") setState("idle");
            }}
            aria-invalid={state === "wrong"}
            aria-describedby="pw-msg"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          />
          <p id="pw-msg" role="status" className="min-h-5 text-sm text-[var(--danger)]">
            {state === "wrong" && "That password isn't right."}
            {state === "error" && "Couldn't reach the server. Try again."}
          </p>
        </div>
        <button
          type="submit"
          disabled={state === "checking" || !value}
          className="w-full rounded-lg bg-[var(--accent-solid)] px-4 py-2 font-semibold text-white hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
        >
          {state === "checking" ? "Checking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}
