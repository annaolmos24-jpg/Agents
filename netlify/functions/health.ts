import type { Config } from "@netlify/functions";

// Reports whether the server is configured. Never returns the key itself.
export default async () => {
  return Response.json({
    ok: true,
    apiKeyConfigured: Boolean(process.env.SCRAPECREATORS_API_KEY),
    passwordEnabled: Boolean(process.env.APP_PASSWORD),
    time: new Date().toISOString(),
  });
};

export const config: Config = {
  path: "/api/health",
};
