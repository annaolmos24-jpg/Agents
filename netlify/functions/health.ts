import type { Config } from "@netlify/functions";
import { isAuthorized, passwordEnabled } from "../../server/auth";

// Reports whether the server is configured. Never returns the key or password.
// Also used by the password screen to check a password without spending API credits.
export default async (req: Request) => {
  return Response.json(
    {
      ok: true,
      apiKeyConfigured: Boolean(process.env.SCRAPECREATORS_API_KEY),
      passwordEnabled: passwordEnabled(),
      authorized: isAuthorized(req),
      time: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
};

export const config: Config = {
  path: "/api/health",
};
