import type { Config } from "@netlify/functions";
import {
  BadRequest,
  cacheSecondsFor,
  getApiKey,
  json,
  parseCursor,
  parsePlatforms,
  parseQuery,
  parseRegion,
} from "../../server/http";
import { searchPlatform, settleAll } from "../../server/platforms";

const CACHE_SECONDS = 10 * 60;

export default async (req: Request) => {
  const apiKey = getApiKey();
  if (!apiKey) return json({ error: "Server is missing SCRAPECREATORS_API_KEY" }, 500);

  try {
    const params = new URL(req.url).searchParams;
    const platforms = parsePlatforms(params.get("platforms"));
    const { query, hashtag } = parseQuery(params.get("q"));
    const region = parseRegion(params.get("region"));
    const cursor = parseCursor(params.get("cursor"), platforms);
    const results = await settleAll(platforms, (p) =>
      searchPlatform(p, { query, hashtag, cursor, region }, apiKey),
    );
    return json({ results }, 200, cacheSecondsFor(results, CACHE_SECONDS));
  } catch (err) {
    if (err instanceof BadRequest) return json({ error: err.message }, 400);
    throw err;
  }
};

export const config: Config = {
  path: "/api/search",
  method: "GET",
};
