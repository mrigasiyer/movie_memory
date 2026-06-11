# Movie Memory

Sign in with Google, save your favorite movie, and see a fun fact about it on a dashboard you can edit. Built for the take-home exercise.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · TailwindCSS · Postgres (Supabase) · Prisma 7 · NextAuth v5 (Auth.js) · OpenAI · Vitest.

I built the required base, then chose **Variant B (Frontend/API-focused)**.

## Setup

You'll need Node 20+, a Supabase (or any Postgres) database, a Google OAuth client, and an OpenAI API key.

```bash
npm install
cp .env.example .env        # then fill in the values (see below)
npx prisma migrate dev      # creates the tables and generates the client
npm run dev                 # http://localhost:3000
```

In the Google Cloud console, set the authorized redirect URI to exactly:

```
http://localhost:3000/api/auth/callback/google
```

### Environment variables

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Postgres connection the app uses while running (Supabase pooled connection, port 6543). |
| `DIRECT_URL` | Postgres connection Prisma uses for migrations (Supabase direct connection, port 5432). |
| `AUTH_SECRET` | Secret used to sign the login cookie. Generate with `openssl rand -base64 33`. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client credentials. |
| `AUTH_URL` | App base URL. `http://localhost:3000` for local dev. |
| `OPENAI_API_KEY` | OpenAI API key (used on the server only). |

`.env` is gitignored; `.env.example` lists everything you need.

### Database migrations

The database tables are described in `prisma/schema.prisma`. (Connection URLs live in `prisma.config.ts` because Prisma 7 no longer keeps them in the schema file.)

- First run / new machine: `npx prisma migrate dev`
- Production / CI: `npx prisma migrate deploy`
- Browse the data: `npx prisma studio`

### Testing

```bash
npm test          # run once
npm run test:watch
```

## Architecture overview

### Login and page protection

Login uses Google sign-in through NextAuth (a popular auth library). When you log in, your session is saved as a row in the database, and the browser gets a cookie pointing at it. I chose **database sessions** (over storing everything in the cookie) because it keeps the rule simple: on each request, look up the session and use its user id. It's also easy to log someone out by deleting that row.

Protected pages check `auth()` at the top and redirect if you're not logged in — for example, visiting `/dashboard` logged out sends you back to the landing page. I kept this check inside the pages rather than using middleware; for an app this small it's simpler and easier to follow.

The page flow:

- `/` — logged out shows the sign-in button; logged in sends you to onboarding (if you haven't picked a movie) or the dashboard.
- `/onboarding` — first-time only; saves your favorite movie after validating it.
- `/dashboard` — your profile, your editable movie, and the fun fact.

### Database design

There are four standard NextAuth tables (`User`, `Account`, `Session`, `VerificationToken`) plus two things I added:

- **`favoriteMovie` on the user** — a single optional field. If it's empty, the user hasn't onboarded yet, which is also what sends them to the onboarding page. A user only has one current favorite, so a separate table wasn't needed.
- **`Fact` table** — one row per generated fact, storing the user, the fact text, when it was made, and *which movie it was about*. Saving the movie name on each fact means old facts still make sense after someone changes their favorite.

Every database read or write uses the logged-in user's id from their session. The browser never sends a user id, so you can't request or change someone else's data.

### The API (Variant B)

Variant B is about a clean, typed API that the frontend drives. There are three endpoints:

- `GET /api/me` — your profile and favorite movie
- `PUT /api/me/movie` — validates and updates your movie
- `GET /api/fact` — generates, saves, and returns a fact

I describe the shape of each request and response once (in `lib/contracts.ts`) and reuse it on both sides, so the frontend and backend stay in sync. The frontend never calls `fetch` directly — it goes through one small client (`lib/api.ts`) that sends requests the same way every time and turns any failure (a 401, a 500, a dropped connection) into one consistent error type. That keeps error handling in the UI simple and predictable.

### How the dashboard works on the client

The profile and logout button are rendered on the server. The movie editor and the fact card run in the browser and talk to the API.

- **Editing the movie (optimistic UI):** when you save, the new title shows instantly and the editor closes, without waiting for the server. If the save fails, it puts the old title back, reopens, and shows an error (keeping what you typed so you can retry). This is the "feels instant, but stays correct" pattern.
- **Caching the fact:** the last fact is saved in the browser (`localStorage`) along with its movie and a timestamp. If you reload within 30 seconds and the movie hasn't changed, it reuses that fact instead of calling OpenAI again. "New fact" forces a fresh one, and changing the movie throws the cached fact away. I wrote this as a small custom hook instead of pulling in a caching library, because the rules here are specific and a short, dependency-free hook is easy to read and explain.

### When things fail

The fact endpoint gives OpenAI 12 seconds; if it errors or times out, it falls back to the most recent saved fact for that movie, and if there isn't one, it returns a friendly message instead of crashing. A missing Google photo shows the user's initials, and a missing name falls back to a generic greeting.

### Tests

Vitest with React Testing Library, focused on the parts most likely to break:

- `tests/api.test.ts` — the API client turns 401s, 500s, bad responses, and network errors into one consistent error.
- `tests/MovieEditor.test.tsx` — saving works, a failed save reverts, blank input is rejected, cancel does nothing.
- `tests/useFact.test.ts` — the cache reuses, invalidates when the movie changes, and refreshes on demand.

## Key tradeoffs

- **Generate a fact per request, cache in the browser.** The server stays simple and always offers a fresh fact, and the 30-second cache stops it from calling OpenAI on every load. The downside: the server doesn't coordinate two requests that arrive at once (that's what Variant A focuses on).
- **Database sessions instead of cookie-only sessions.** A small database lookup per request, in exchange for simpler and revocable logins.
- **A custom cache hook instead of a library.** Less to explain and full control, but I don't get extras like automatic background refreshing for free.
- **Auth checks inside pages instead of middleware.** Clear and local, but it means repeating the check on each protected page.

## What I'd do with two more hours

- Add Variant A's burst protection so quick refreshes or multiple tabs don't each trigger a new generation.
- Add a test proving one user can't read another user's facts, plus a couple of tests hitting the real API routes.
- Loading skeletons and a small toast for save errors instead of inline text.
- A per-user rate limit on the fact endpoint to cap OpenAI usage.

## Note on AI usage

- I used an AI assistant to move faster on the unfamiliar parts. Next.js 16 and Prisma 7 both changed from what most tutorials show, so I had it read the installed docs and confirm the current way of doing things (async `params`/`cookies`, the new Prisma setup, `middleware` renamed to `proxy`).
- I used it to scaffold repetitive boilerplate (the API routes, the test setup) and to double-check the optimistic-update and cache logic.
- I designed the database, the caching approach, and the login flow myself, and can walk through any part of it.
