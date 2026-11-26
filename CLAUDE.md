# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Photo Wall: a Pinterest-style pin board. Next.js 15 (App Router, React 19), Auth.js v5 with Google sign-in, Vercel Blob for image files, Supabase Postgres for pin/like/follow data. Deployed on Vercel; pushing `main` to GitHub (`origin`) triggers a deploy. Setup for a fresh deployment is in README.md.

## Commands

```
npm run dev            # local dev server (the .claude/launch.json preview uses port 3130)
npm run build          # production build; also type-checks
npx tsc --noEmit       # type-check only
node scripts/make-character.mjs <id>                # generate a sample character (paid OpenAI call)
node scripts/make-character.mjs <id> --avatar x,y,s # crop that character's avatar
```

There are no tests and no linter configured.

Local env goes in `.env.local` (see `.env.example`). Without `AUTH_SECRET`, Auth.js logs `MissingSecret` errors locally; the page still renders samples.

## Architecture

**One server-rendered page.** `app/page.tsx` (force-dynamic) loads the viewer, DB pins, and the static sample pins, merges like/follow counts via `withSocial`, and passes everything to `app/board.tsx`, a single large client component holding the grid, search, category filters, pin sheet, create/edit forms, and like/follow buttons. Counts are rendered server-side on first paint, so don't move them to a client fetch.

**Public JSON feed.** `lib/feed.ts` (`getFeed`) builds the public photo list used by both `/photos.json` (`app/photos.json/route.ts`, raw JSON) and `/photos` (`app/photos/page.tsx`, each photo beside its JSON with copy buttons; linked from the `{ } Photos JSON` button in the top bar). It contains every photo (member pins, then samples) with absolute image URLs, author name/avatar/bio, `source` (`member` / `ai-generated` / `stock`) and like counts. It is the same for every visitor: no viewer-specific fields and no user hashes. Keep it in step with `Pin` when fields change.

**The site degrades gracefully when services are missing.** `hasDatabase()` (`lib/db.ts`) and `blobMode()` (`lib/blob-mode.ts`) gate features: with no DB, only sample pins show and social features are off; with no Blob store, posting is disabled. `/api/health` reports which services are configured (names and yes/no only, never values). Keep this property when adding features.

**Database (`lib/db.ts`).**
- Connection string is found from `DATABASE_URL`, `POSTGRES_URL`, or any env var ending in those names (the Supabase Vercel integration adds prefixes); query params are stripped.
- One shared client on `globalThis` with `max: 1`, `prepare: false` (required by Supabase's transaction pooler), and an 8s statement timeout. Run queries **sequentially**, not with `Promise.all`; parallel queries on the single connection caused signed-in page timeouts before.
- No migrations: `ensureSchema()` runs the `SCHEMA` string with `create table if not exists` on first use. `db/schema.sql` is a readable copy; **edit both together** when changing tables.

**Identity and permissions.**
- Users are identified by `userKey(email)` (`lib/photos.ts`): a truncated SHA-256 of the email. Emails never go in the DB or URLs. `lib/viewer.ts` builds the `Viewer`; admins come from the comma-separated `ADMIN_EMAILS` env var.
- Permission checks live in `lib/pins.ts` / `lib/social.ts`, which throw `PinError(message, status)`; API routes in `app/api/*` translate that into JSON errors. Owners edit/delete their pins; admins can delete any pin (row, likes, and the Blob file).

**Uploads are two-step.** The browser asks `/api/upload` for a token and uploads directly to Vercel Blob under `photos/<uid>/…`, then POSTs metadata to `/api/pins`. `createPin` rejects any image URL that isn't on `*.public.blob.vercel-storage.com` under the caller's own `photos/<uid>/` path. `/api/upload` supports both Blob auth styles: `BLOB_READ_WRITE_TOKEN` ("token") and `BLOB_STORE_ID` with OIDC ("presigned"); `board.tsx` picks the matching client upload function from `uploadMode`.

**Social keys.** Likes key on pin id, where sample pins use `sample/<file>`. Follows key on author: `u:<userKey>` for members, `s:<personId>` for sample characters. `setLike`/`setFollow` validate the target exists (sample sets from `lib/samples.ts`, or a DB lookup).

**Sample content.** `lib/samples.json` defines fictional people and their pins; images are in `public/pins/` (pins) and `public/avatars/` (160×160). Every sample pin must carry `aiGenerated: true` or `stock: true` so the UI labels it. Stock photos are licensed Adobe Stock (IDs listed in README.md). New AI characters are made from JSON specs in `characters/<id>.json` by `scripts/make-character.mjs`, which calls OpenAI's image API (`OPENAI_API_KEY`), writes a 900×1350 WebP pin, and upserts the person and pin into `samples.json`. Raw PNGs stay in `characters/out/` (git-ignored). Run character generations one at a time: each run rewrites `samples.json`.

**Shared types** (`Pin`, categories, upload limits) are in `lib/shared.ts`, which must stay free of Node-only imports because `board.tsx` imports it.

## Styling

All styles are in `app/globals.css` with CSS custom properties; dark mode is a `prefers-color-scheme` override of the same tokens. The visual language follows `DESIGN.md` (warm cream canvas, coral primary actions, serif display headings at regular weight via Source Serif 4, Inter body, 8px/12px radii, few shadows). Deliberate deviations from DESIGN.md: buttons use a deeper coral (`--accent: #b85c40`) so white text meets 4.5:1 contrast, and the site keeps its own four-square logo (no Anthropic marks). Fonts load from Google Fonts in `app/layout.tsx`.
