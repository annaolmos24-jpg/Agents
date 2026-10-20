# Trend Finder

Find trending short-form videos across TikTok, Instagram Reels and YouTube Shorts in one place. Powered by the [Scrape Creators API](https://docs.scrapecreators.com) and hosted on Netlify.

See [`docs/PRD.md`](docs/PRD.md) for the full product requirements.

## Features

- **Trending now:** trending videos from TikTok, Instagram Reels and YouTube Shorts in one grid
- **Search:** any keyword, or a `#hashtag`
- **Filter and sort:** turn platforms on/off; sort by views, likes, comments or newest; pick a region
- **Resilient:** each platform loads on its own; if one fails, the others still show
- **Credit-friendly:** results are cached on Netlify's CDN (trending 15 min, search 10 min), so repeat visits cost no credits
- **Optional password:** set `APP_PASSWORD` to keep strangers from spending your credits

## Tech stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS (`src/`)
- **Backend:** Netlify Functions (`netlify/functions/`), which call Scrape Creators server-side so the API key never reaches the browser
- **Shared server code:** `server/`, which holds the API client, per-platform normalizers, validation and password check

| Route | What it does | Credits |
|---|---|---|
| `GET /api/health` | Is the key configured? Is a password required/valid? | 0 |
| `GET /api/trending?platforms=tiktok,instagram,youtube&region=US` | Trending videos per platform | 1 per platform (cached 15 min) |
| `GET /api/search?q=dogs` or `q=%23booktok` | Keyword or hashtag search; `cursor=` for the next page (one platform at a time) | 1 per platform (cached 10 min) |

## Local development

```bash
npm install
npm run dev          # frontend only, at http://localhost:5173
npm test             # offline tests; never calls the live API or spends credits
npm run typecheck
```

To run the frontend and functions together, use the Netlify CLI:

```bash
cp .env.example .env # then add your SCRAPECREATORS_API_KEY
npx netlify dev
```

## Deploying to Netlify (one-time setup)

1. In Netlify: **Add new site → Import an existing project → GitHub**, and pick this repo.
2. Production branch: `main`. Build command `npm run build` and publish directory `dist` are read from `netlify.toml`.
3. **Site configuration → Environment variables**, then add:
   - `SCRAPECREATORS_API_KEY`: your Scrape Creators API key (required)
   - `APP_PASSWORD`: optional; if set, visitors must enter it before the app calls the API. The server enforces it (not just the page), and it's remembered on each device.
4. Deploy (or **Deploys → Trigger deploy** if you added the variables after the first deploy). Visit the site: you should see trending videos. If you see a yellow "no API key" banner, the variable isn't set yet.

Every merge to `main` deploys automatically after that.

> Never commit your API key. `.env` is gitignored. Only `.env.example` (names, no values) is tracked.

## Expert agents

Specialist Claude Code subagents live in `.claude/agents/`:

| Agent | Role |
|---|---|
| `scrape-creators-api-specialist` | Endpoints, credit costs, API client and response normalizers |
| `frontend-ui-engineer` | React UI, responsive layout, accessibility |
| `netlify-devops-engineer` | Netlify config, functions, caching, CI, deploys |
| `security-cost-guardian` | Read-only review for key exposure, input safety and credit waste |
| `qa-testing-engineer` | Offline fixture-based tests and deployed-site smoke tests |
