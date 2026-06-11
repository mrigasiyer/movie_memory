# Movie Memory

Sign in with Google, save your favorite movie, and get a fun fact about it on a dashboard you can edit. Built for the take-home exercise.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · TailwindCSS · Postgres (Supabase) · Prisma 7 · NextAuth v5 (Auth.js) · OpenAI · Vitest.

I built the required base and then **Variant B (Frontend/API-focused)**.

## Setup

You'll need Node 20+, a Supabase (or any Postgres) database, a Google OAuth client, and an OpenAI API key.

```bash
npm install
cp .env.example .env        # then fill in the values (see below)
npx prisma migrate dev      # creates the tables and generates the client
npm run dev                 # http://localhost:3000
```

For the Google client, set the authorized redirect URI to exactly:

```
http://localhost:3000/api/auth/callback/google
```

### Environment variables

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Pooled Postgres connection used by the app at runtime (Supabase transaction pooler, port 6543). |
| `DIRECT_URL` | Direct connection used by Prisma for migrations (Supabase session/direct, port 5432). |
| `AUTH_SECRET` | Secret used to sign the session cookie. Generate with `openssl rand -base64 33`. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client credentials. |
| `AUTH_URL` | App base URL. `http://localhost:3000` for local dev. |
| `OPENAI_API_KEY` | OpenAI API key (server-side only). |

`.env` is gitignored; `.env.example` documents the full list.

### Database migrations

The schema lives in `prisma/schema.prisma`. Connection URLs are in `prisma.config.ts` (Prisma 7 no longer allows them in the schema).

- First run / new machine: `npx prisma migrate dev`
- Production / CI: `npx prisma migrate deploy`
- Inspect data: `npx prisma studio`

### Testing

```bash
npm test          # run once
npm run test:watch
```

## Architecture overview

### Auth and routing

NextAuth v5 handles Google OAuth with the Prisma adapter and **database sessions** (the session is a row in Postgres; the cookie just holds a token pointing at it). I chose database sessions over JWT because every authorization check then comes down to "look up the session, use its user id," which keeps the rules simple and revocable.

Routes are guarded directly in server components with `auth()` rather than middleware. Next 16 renamed `middleware.js` to `proxy.js`, and doing the check inline is both simpler and easier to reason about for an app this size.

The flow:

- `/` — unauthenticated shows the sign-in button; authenticated redirects to onboarding (no movie yet) or the dashboard.
- `/onboarding` — first-time only; a server action validates and stores the movie.
- `/dashboard` — profile, editable movie, and the fun fact. Logged out, it redirects to `/`.

### Data model

Four standard Auth.js tables (`User`, `Account`, `Session`, `VerificationToken`) plus:

- `User.favoriteMovie` — a nullable field on the user. `null` means onboarding isn't done, which is also the signal that routes them to `/onboarding`. One user has one current favorite, so a separate table would be overkill.
- `Fact` — one row per generated fact: `userId`, `content`, `createdAt`, and a snapshot of the `movie` it was about. Storing the movie on the fact means old facts stay correctly attributed after the user changes their favorite. Indexed on `(userId, createdAt)` for the "latest fact for this user" lookup.

Every query is scoped to the session's user id. The client never sends a user id, so one user can't read or write another's data.

### API layer (Variant B)

The contract is defined once in `lib/contracts.ts` with Zod, and the TypeScript types are inferred from those schemas, so the server and client can't drift.

- `GET /api/me` — profile + favorite movie
- `PUT /api/me/movie` — validates server-side, updates the movie
- `GET /api/fact` — generates, stores, and returns a fact

`lib/api.ts` is a typed client wrapper used by the UI. It sets JSON headers, parses every response against its schema, and turns anything that fails into a single `ApiError` carrying a status and message (including network errors as status `0`). The UI never touches `fetch`, `res.ok`, or JSON parsing directly.

### Client orchestration and caching

The dashboard's profile and logout are server-rendered. The movie editor and fact card are client components that talk to the API.

- **Optimistic edit:** saving a movie updates the title immediately and closes the editor. If the server rejects or fails, it reverts and reopens with an error and the typed text intact. The canonical movie only advances after the server confirms, so the fact refreshes for the correct movie.
- **Fact cache:** `useFact` keeps `{ fact, movie, timestamp }` in `localStorage`. It reuses the cached fact if it's for the same movie and under 30 seconds old; "New fact" forces a fresh one; changing the movie invalidates the cache because it's keyed by movie. I used a small custom hook instead of SWR/React Query because the rules are specific (a hard 30s window, explicit refresh, invalidate on movie change, persist across reloads) and a ~50-line hook expresses exactly that with no dependencies and nothing implicit.

### Failure handling

`GET /api/fact` wraps the OpenAI call in a 12-second timeout. If it fails, it falls back to the most recent stored fact for the current movie; if there's none, it returns a friendly 503. Missing Google photo or name degrade gracefully (initials avatar, "there" as a fallback greeting).

### Tests

Vitest with React Testing Library:

- `tests/api.test.ts` — the client wrapper normalizes 401/500, malformed bodies, network errors, and schema mismatches.
- `tests/MovieEditor.test.tsx` — optimistic save, revert on failure, whitespace rejection, cancel.
- `tests/useFact.test.ts` — cache reuse, invalidation on movie change, forced refresh, error surfacing.

## Key tradeoffs

- **Generate a fact per request, cache on the client.** The server stays simple and always offers a fresh fact; the 30s client cache keeps it from calling OpenAI on every render. The cost is that the server doesn't dedupe concurrent requests (that's Variant A's territory).
- **Database sessions over JWT.** A small read on each request in exchange for simpler, revocable auth.
- **Custom cache hook over a library.** Less machinery and fully explainable, at the cost of not getting features like background revalidation for free.
- **Inline `auth()` guards over middleware.** Clear and local, though it means repeating the guard in each protected route.

## What I'd do with two more hours

- Add the Variant A burst protection (a short idempotency window so quick refreshes or multiple tabs don't each trigger a generation).
- A couple of integration tests against the real route handlers, plus an authorization test proving one user can't read another's facts.
- Loading skeletons and a toast for save errors instead of inline text.
- Rate-limit `GET /api/fact` per user as a backstop on OpenAI spend.

## Note on AI usage

- Used an AI assistant to move faster on the unfamiliar parts of the stack. Next.js 16 and Prisma 7 both have breaking changes from what's widely documented, so I leaned on it to read the installed docs and confirm current conventions (async `params`/`cookies`, the Prisma 7 driver-adapter setup, `middleware` becoming `proxy`).
- Used it to scaffold boilerplate (route handlers, the test setup) and to sanity-check the optimistic-update and cache-invalidation logic.
- Designed the schema, caching strategy, and auth flow myself, and can walk through any of it.
