import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import health from "../../netlify/functions/health";
import search from "../../netlify/functions/search";
import trending from "../../netlify/functions/trending";
import ytTrending from "../__fixtures__/youtube-trending.json";

const PASSWORD = "correct horse";
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.SCRAPECREATORS_API_KEY = "test-key";
  process.env.APP_PASSWORD = PASSWORD;
  fetchMock = vi.fn(async () => new Response(JSON.stringify(ytTrending)));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.SCRAPECREATORS_API_KEY;
  delete process.env.APP_PASSWORD;
});

const get = (path: string, password?: string) =>
  new Request(`https://site.test${path}`, {
    headers: password === undefined ? {} : { "x-app-password": password },
  });

describe("password gate", () => {
  it.each([undefined, "", "wrong", "Correct horse"])(
    "blocks credit-spending routes without the right password (%j)",
    async (pw) => {
      for (const handler of [trending, search]) {
        const res = await handler(get("/api/x?platforms=youtube&q=dogs", pw));
        expect(res.status).toBe(401);
        expect(res.headers.get("cache-control")).toBe("no-store");
      }
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("allows the right password and varies the CDN cache on it", async () => {
    const res = await trending(get("/api/trending?platforms=youtube", PASSWORD));
    expect(res.status).toBe(200);
    expect(res.headers.get("netlify-vary")).toBe("header=x-app-password");
    expect(res.headers.get("netlify-cdn-cache-control")).toContain("durable");
  });

  it("does not add the vary header when no password is configured", async () => {
    delete process.env.APP_PASSWORD;
    const res = await trending(get("/api/trending?platforms=youtube"));
    expect(res.status).toBe(200);
    expect(res.headers.get("netlify-vary")).toBeNull();
  });

  it("lets health check a password for free and never echoes it", async () => {
    const bad = await health(get("/api/health", "nope"));
    const good = await health(get("/api/health", PASSWORD));
    const goodText = await good.text();
    expect((await bad.json()).authorized).toBe(false);
    expect(JSON.parse(goodText)).toMatchObject({ passwordEnabled: true, authorized: true });
    expect(goodText).not.toContain(PASSWORD);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
