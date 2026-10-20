# PRD: Trend Finder

**Status:** Draft v1 · **Owner:** annaolmos24-jpg · **Last updated:** 2026-10-20

## 1. Summary

Trend Finder is a web app for finding trending and popular short-form videos across social platforms in one place. Users can browse what is trending right now, or search by keyword or hashtag, across TikTok, Instagram Reels and YouTube Shorts. Data comes from the [Scrape Creators API](https://docs.scrapecreators.com). The app is hosted on Netlify and deploys automatically from the `main` branch on GitHub.

## 2. Problem

Content creators, marketers and curious users who want to know "what's blowing up right now" have to check each app separately. Each app's own trending view depends on your personal feed, can't be sorted by numbers, and can't be compared side by side. Trend Finder puts the trends from all three platforms in one sortable view.

## 3. Goals and non-goals

**Goals (v1)**
- G1: Show trending videos from TikTok, Instagram and YouTube in a single grid.
- G2: Search those platforms by keyword or `#hashtag`.
- G3: Show engagement numbers (views, likes, comments) so videos can be compared and sorted.
- G4: Keep the Scrape Creators API key secret and keep credit spend predictable.
- G5: Deploy to Netlify automatically when code merges to `main`.

**Non-goals (v1)**
- User accounts, saved searches or favorites stored on a server.
- Posting, downloading or re-hosting videos.
- Transcripts, comments, creator analytics (candidates for v2; see §11).
- Platforms beyond TikTok, Instagram and YouTube.

## 4. Users

| Persona | Need |
|---|---|
| **Creator** | Find trending formats, sounds and topics to make content about. |
| **Marketer / brand** | Check what's trending around a keyword or niche before planning a campaign. |
| **Owner (you)** | A simple tool that doesn't waste API credits. |

## 5. User stories

1. As a user, when I open the app I see a grid of currently trending videos from all three platforms.
2. As a user, I can type a keyword (e.g. `skincare`) or hashtag (e.g. `#booktok`) and see matching videos.
3. As a user, I can turn platforms on or off (TikTok / Instagram / YouTube).
4. As a user, I can sort results by views, likes or most recent.
5. As a user, I can click a video card to open the original post in a new tab.
6. As a user, I see a clear message when a platform fails or returns nothing, and the other platforms still show results.
7. As the owner, I can make the app require a password so strangers can't spend my credits.

## 6. Functional requirements

### 6.1 Trending view (default page)
- FR-1: On load, fetch trending content from each enabled platform in parallel.
- FR-2: Merge the results into one grid. Default sort is views, highest first.
- FR-3: Region selector for TikTok trending (default `US`).

### 6.2 Search
- FR-4: A single search box. Input starting with `#` is a hashtag search; anything else is a keyword search.
- FR-5: Platform toggles apply to search and to the trending view.
- FR-6: Optional "date posted" filter where the platform supports it (TikTok, Instagram).
- FR-7: A "Load more" button where the platform supports pagination (cursor/page).

### 6.3 Video card
- FR-8: Shows the thumbnail, platform badge, caption (truncated), creator handle, views, likes, comments and post date, when the platform provides each field.
- FR-9: Numbers are shown in compact form (e.g. `1.2M`).
- FR-10: Clicking the card opens the original video URL in a new tab.

### 6.4 Sorting and filtering
- FR-11: Sort by views, likes, comments or newest. Sorting happens in the browser and costs no credits.

### 6.5 Access control
- FR-12: If the `APP_PASSWORD` environment variable is set, the app asks for the password before it calls any API. If it isn't set, the app is open.

## 7. Data source: Scrape Creators endpoints

Base URL: `https://api.scrapecreators.com`. Authentication: `x-api-key` header. Most of these endpoints cost **1 credit per request**.

| Use | Endpoint | Key params |
|---|---|---|
| TikTok trending | `GET /v1/tiktok/get-trending-feed` | `region` (required), `trim` |
| TikTok keyword search | `GET /v1/tiktok/search/keyword` | `query`, `date_posted`, `sort_by`, `region`, `cursor`, `trim` |
| TikTok hashtag search | `GET /v1/tiktok/search/hashtag` | `hashtag`, `region`, `cursor`, `trim` |
| Instagram trending | `GET /v1/instagram/reels/trending` | none (returns an uncharged 503 if too few reels are available) |
| Instagram reel search | `GET /v2/instagram/reels/search` | `query`, `date_posted` (`last-week`/`last-month`/`last-year`), `page` |
| YouTube trending | `GET /v1/youtube/shorts/trending` | none (~48 shorts, new ones each call) |
| YouTube search | `GET /v1/youtube/search` | `query`, `type` (`shorts`…), `uploadDate`, `sortBy`, `region`, `continuationToken` |
| YouTube hashtag search | `GET /v1/youtube/search/hashtag` | `hashtag`, `type` (`all`/`shorts`), `continuationToken` |

Parameters and response shapes above are confirmed against the documentation examples (2026-10-20). Instagram has no paginated hashtag reel search, so `#tag` searches on Instagram use reel search with the tag as the keyword.

Each platform returns a different response shape. The backend **normalizes** every result into one `Video` shape:

```ts
type Video = {
  id: string;
  platform: "tiktok" | "instagram" | "youtube";
  url: string;            // link to the original post
  thumbnail: string | null;
  caption: string;
  author: { handle: string; name?: string; avatar?: string };
  stats: { views?: number; likes?: number; comments?: number; shares?: number };
  postedAt?: string;      // ISO 8601
};
```

## 8. Architecture

```
Browser (React + Vite, static on Netlify CDN)
   │  fetch /api/trending?platforms=…   /api/search?q=…&platforms=…
   ▼
Netlify Functions (Node/TypeScript)
   │  • adds x-api-key from env var SCRAPECREATORS_API_KEY
   │  • calls platforms in parallel; one failure doesn't block the others
   │  • normalizes responses into Video[]
   │  • caches responses (see §9)
   ▼
Scrape Creators API
```

- **Frontend:** React + TypeScript + Vite, Tailwind CSS. Mobile-first and responsive.
- **Backend:** Netlify Functions in `netlify/functions/`. `/api/*` routes are mapped to the functions in `netlify.toml`.
- **Secrets:** `SCRAPECREATORS_API_KEY` and optional `APP_PASSWORD` are set in **Netlify → Site settings → Environment variables**. They are never committed to the repo or sent to the browser. A `.env.example` file lists the variable names with no values.
- **Repo layout:**
  ```
  /src                 React app
  /netlify/functions   health.ts, trending.ts, search.ts (thin route handlers)
  /server              API client, normalizers, validation, tests and fixtures
  /docs                PRD and notes
  netlify.toml
  ```

## 9. Non-functional requirements

| Area | Requirement |
|---|---|
| **Security** | API key exists only on the server. Function inputs are validated (length limits, allowed platform values). |
| **Cost control** | Trending responses are cached for 15 minutes and search responses for 10 minutes, using Netlify CDN cache headers (`Netlify-CDN-Cache-Control`). Repeat visits within that window cost 0 credits. |
| **Performance** | First results appear in under 4 seconds (p75). Platforms load independently, each showing skeleton cards while it loads. |
| **Resilience** | Each platform call times out after 10s. Partial results are shown, with a per-platform error notice. |
| **Accessibility** | WCAG 2.1 AA: keyboard navigable, alt text on thumbnails, sufficient color contrast. |
| **Compatibility** | Latest Chrome, Safari, Firefox and Edge; works at phone width (≥ 360px). |

## 10. Release plan

1. **M1 (Scaffold):** Vite + React app, Netlify config, function stub, CI build. Deploys a "hello" page.
2. **M2 (Data layer):** Scrape Creators client, normalizers for all three platforms, unit tests using recorded sample responses.
3. **M3 (UI):** Trending grid, search, toggles, sorting, video cards, loading and error states.
4. **M4 (Hardening):** Caching, optional password gate, accessibility pass, README with Netlify setup steps.
5. **Launch:** Merge to `main`. Netlify auto-deploys. Smoke-test the live site with the real key.

**Netlify setup (one-time, by the owner):** connect the GitHub repo in Netlify, set the build command to `npm run build` and the publish directory to `dist`, and add the `SCRAPECREATORS_API_KEY` environment variable.

## 11. Future ideas (v2+)

- More platforms: Facebook video search, Reddit, X, Threads.
- Video detail drawer with a transcript (`/v1/tiktok/video/transcript`, etc.) and top comments.
- "Trending sounds" view (TikTok song endpoints).
- Saved searches and favorites (local first, then a database such as Supabase).
- Credit balance indicator using `/v1/account/credit-balance`.

## 12. Success metrics

- The trending page loads with results from at least 2 of 3 platforms in more than 95% of visits.
- Average credits per visit stay at or below 3 thanks to caching.
- Zero API key exposure (key never appears in client bundles or repo history).

## 13. Open questions / assumptions

- **Assumed:** v1 platforms are TikTok, Instagram and YouTube (owner can change).
- **Assumed:** caching is on (15 min trending / 10 min search).
- **Assumed:** the app is open by default, with an optional password via `APP_PASSWORD`.
- **To verify with a live call:** response shapes were built from documentation examples. Confirm them against real responses once a live call is possible.
