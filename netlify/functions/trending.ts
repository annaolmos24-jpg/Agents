import type { Config } from "@netlify/functions";
import { BadRequest, cacheSecondsFor, getApiKey, json, parsePlatforms, parseRegion } from "../../server/http";
import { fetchTrending, settleAll } from "../../server/platforms";

const CACHE_SECONDS = 15 * 60;

export default async (req: Request) => {
  const apiKey = getApiKey();
  if (!apiKey) return json({ error: "Server is missing SCRAPECREATORS_API_KEY" }, 500);

  try {
    const params = new URL(req.url).searchParams;
    const platforms = parsePlatforms(params.get("platforms"));
    const region = parseRegion(params.get("region"));
    const results = await settleAll(platforms, (p) => fetchTrending(p, region, apiKey));
    return json({ results }, 200, cacheSecondsFor(results, CACHE_SECONDS));
  } catch (err) {
    if (err instanceof BadRequest) return json({ error: err.message }, 400);
    throw err;
  }
};

export const config: Config = {
  path: "/api/trending",
  method: "GET",
};
