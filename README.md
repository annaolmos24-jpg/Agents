# Trend Finder

Find trending short-form videos across TikTok, Instagram Reels and YouTube Shorts in one place. Powered by the [Scrape Creators API](https://docs.scrapecreators.com) and hosted on Netlify.

See [`docs/PRD.md`](docs/PRD.md) for the full product requirements.

## Tech stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS (`src/`)
- **Backend:** Netlify Functions (`netlify/functions/`), which call Scrape Creators server-side so the API key never reaches the browser

## Local development

```bash
npm install
npm run dev          # frontend only, at http://localhost:5173
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
   - `APP_PASSWORD`: optional; if set, the app asks for this password before calling the API
4. Deploy. Visit the site, and the **System status** box should show the API key as ✓ Ready.

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
