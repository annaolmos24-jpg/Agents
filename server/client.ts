const BASE_URL = "https://api.scrapecreators.com";
const TIMEOUT_MS = 10_000;

/** An upstream failure with a message that is safe to show to users. */
export class ScrapeCreatorsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ScrapeCreatorsError";
  }
}

export type Params = Record<string, string | number | boolean | undefined>;

/** GET a Scrape Creators endpoint. The API key is only ever sent to api.scrapecreators.com. */
export async function scGet(path: string, params: Params, apiKey: string): Promise<unknown> {
  const url = new URL(path, BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "x-api-key": apiKey, accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    throw new ScrapeCreatorsError(timedOut ? "Timed out" : "Could not reach the data provider", 504);
  }

  if (!res.ok) throw new ScrapeCreatorsError(messageFor(res.status), res.status);

  try {
    return await res.json();
  } catch {
    throw new ScrapeCreatorsError("Unexpected response from the data provider", 502);
  }
}

function messageFor(status: number): string {
  switch (status) {
    case 401:
      return "API key was rejected";
    case 402:
      return "Out of Scrape Creators credits";
    case 403:
      return "This content is restricted";
    case 404:
      return "Nothing found";
    case 503:
      return "Not enough trending content available right now";
    default:
      return "Platform temporarily unavailable";
  }
}
