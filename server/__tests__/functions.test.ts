import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import search from "../../netlify/functions/search";
import trending from "../../netlify/functions/trending";
import igTrending from "../__fixtures__/instagram-trending.json";
import ttKeyword from "../__fixtures__/tiktok-keyword.json";
import ttTrending from "../__fixtures__/tiktok-trending.json";
import ytSearch from "../__fixtures__/youtube-search.json";
import ytTrending from "../__fixtures__/youtube-trending.json";

const KEY = "test-key-do-not-leak";

type Route = { status?: number; body?: unknown; throws?: Error };
let routes: Record<string, Route>;
let calls: URL[];

beforeEach(() => {
  process.env.SCRAPECREATORS_API_KEY = KEY;
  calls = [];
  routes = {};
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL, init: RequestInit) => {
      const url = new URL(input);
      calls.push(url);
      expect(url.origin).toBe("https://api.scrapecreators.com");
      expect((init.headers as Record<string, string>)["x-api-key"]).toBe(KEY);
      const route = routes[url.pathname];
      if (!route) throw new Error(`unexpected call ${url.pathname}`);
      if (route.throws) throw route.throws;
      return new Response(JSON.stringify(route.body ?? {}), { status: route.status ?? 200 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.SCRAPECREATORS_API_KEY;
});

const get = (path: string) => new Request(`https://site.test${path}`);

async function read(res: Response) {
  const text = await res.text();
  expect(text).not.toContain(KEY);
  return JSON.parse(text);
}

describe("/api/trending", () => {
  it("returns all platforms and caches for 15 minutes", async () => {
    routes["/v1/tiktok/get-trending-feed"] = { body: ttTrending };
    routes["/v1/instagram/reels/trending"] = { body: igTrending };
    routes["/v1/youtube/shorts/trending"] = { body: ytTrending };

    const res = await trending(get("/api/trending"));
    const body = await read(res);

    expect(res.status).toBe(200);
    expect(body.results.map((r: { platform: string; ok: boolean }) => [r.platform, r.ok])).toEqual([
      ["tiktok", true],
      ["instagram", true],
      ["youtube", true],
    ]);
    expect(res.headers.get("netlify-cdn-cache-control")).toContain("s-maxage=900");
    expect(calls.find((u) => u.pathname.includes("tiktok"))?.searchParams.get("region")).toBe("US");
  });

  it("keeps other platforms when one fails, with a safe message and a short cache", async () => {
    routes["/v1/tiktok/get-trending-feed"] = { body: ttTrending };
    routes["/v1/instagram/reels/trending"] = { status: 503, body: { secret: "upstream detail" } };
    routes["/v1/youtube/shorts/trending"] = { throws: new Error("socket hang up") };

    const res = await trending(get("/api/trending"));
    const text = await res.clone().text();
    const body = await read(res);

    expect(body.results[0]).toMatchObject({ platform: "tiktok", ok: true });
    expect(body.results[1]).toEqual({
      platform: "instagram",
      ok: false,
      error: "Not enough trending content available right now",
    });
    expect(body.results[2]).toEqual({
      platform: "youtube",
      ok: false,
      error: "Could not reach the data provider",
    });
    expect(text).not.toContain("upstream detail");
    expect(res.headers.get("netlify-cdn-cache-control")).toContain("s-maxage=60");
  });

  it("does not cache when everything failed", async () => {
    routes["/v1/tiktok/get-trending-feed"] = { status: 402 };
    const res = await trending(get("/api/trending?platforms=tiktok"));
    expect((await read(res)).results[0].error).toBe("Out of Scrape Creators credits");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("only calls the requested platforms", async () => {
    routes["/v1/youtube/shorts/trending"] = { body: ytTrending };
    await trending(get("/api/trending?platforms=youtube"));
    expect(calls.map((u) => u.pathname)).toEqual(["/v1/youtube/shorts/trending"]);
  });

  it.each(["platforms=facebook", "platforms=,", "region=USA", "region=u1"])(
    "rejects bad input (%s) without spending credits",
    async (qs) => {
      const res = await trending(get(`/api/trending?${qs}`));
      expect(res.status).toBe(400);
      expect(calls).toHaveLength(0);
    },
  );

  it("fails clearly when the API key is not configured", async () => {
    delete process.env.SCRAPECREATORS_API_KEY;
    const res = await trending(get("/api/trending"));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/SCRAPECREATORS_API_KEY/);
    expect(calls).toHaveLength(0);
  });
});

describe("/api/search", () => {
  it("runs a keyword search on each platform and returns cursors", async () => {
    routes["/v1/tiktok/search/keyword"] = { body: ttKeyword };
    routes["/v2/instagram/reels/search"] = { body: igTrending };
    routes["/v1/youtube/search"] = { body: ytSearch };

    const res = await search(get("/api/search?q=super%20bowl"));
    const body = await read(res);

    expect(res.status).toBe(200);
    expect(body.results.map((r: { nextCursor?: string }) => r.nextCursor)).toEqual([
      "12",
      "2",
      "EooDEg...",
    ]);
    expect(calls.find((u) => u.pathname === "/v1/tiktok/search/keyword")?.searchParams.get("query")).toBe(
      "super bowl",
    );
    expect(calls.find((u) => u.pathname === "/v1/youtube/search")?.searchParams.get("type")).toBe("shorts");
    expect(res.headers.get("netlify-cdn-cache-control")).toContain("s-maxage=600");
  });

  it("treats #tags as hashtag searches", async () => {
    routes["/v1/tiktok/search/hashtag"] = { body: { aweme_list: [], has_more: 0, cursor: 0 } };
    routes["/v1/youtube/search/hashtag"] = { body: ytSearch };

    const body = await read(await search(get("/api/search?q=%23booktok&platforms=tiktok,youtube")));

    expect(calls.map((u) => [u.pathname, u.searchParams.get("hashtag")])).toEqual([
      ["/v1/tiktok/search/hashtag", "booktok"],
      ["/v1/youtube/search/hashtag", "booktok"],
    ]);
    expect(body.results[0].nextCursor).toBeUndefined(); // has_more: 0
  });

  it("passes a cursor through for a single platform", async () => {
    routes["/v2/instagram/reels/search"] = { body: igTrending };
    await search(get("/api/search?q=dogs&platforms=instagram&cursor=3"));
    expect(calls[0].searchParams.get("page")).toBe("3");
  });

  it.each([
    "",
    "q=",
    "q=%20%20",
    `q=${"a".repeat(101)}`,
    "q=%23bad%20tag",
    "q=dogs&cursor=abc",
    "q=dogs&platforms=tiktok,nope",
  ])("rejects bad input (%s) without spending credits", async (qs) => {
    const res = await search(get(`/api/search?${qs}`));
    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });
});
