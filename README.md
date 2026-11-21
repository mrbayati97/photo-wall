# Shared Photo Wall

A pin board for photos: browse a masonry grid, search, filter by category, save pins, and sign in with Google to post your own.

Built with Next.js 15, Auth.js (Google sign-in), Vercel Blob (image files) and Supabase Postgres (pin data).

## Go live on Vercel

### 1. Push this folder to GitHub
Create an empty repo on github.com (no README), then:

```
git remote add origin https://github.com/<you>/photo-wall.git
git push -u origin main
```

### 2. Import into Vercel
vercel.com → **Add New → Project** → pick the `photo-wall` repo → **Deploy**.
The first deploy works but sign-in fails until steps 3–5 are done. Note your URL, e.g. `https://photo-wall-xyz.vercel.app`.

### 3. Add image storage
In the Vercel project: **Storage → Create → Blob** → connect it to this project.
This adds `BLOB_READ_WRITE_TOKEN` automatically.

### 4. Create the Google sign-in keys
1. https://console.cloud.google.com → create (or pick) a project.
2. **APIs & Services → OAuth consent screen** → External → fill app name and your email → publish the app (so anyone can sign in, not only test users).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → *Web application*.
4. **Authorized redirect URIs**, add:
   - `https://<your-vercel-url>/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for local testing)
5. Copy the **Client ID** and **Client secret**.

### 5. Connect the database (Supabase)
**Easiest:** in Vercel open **Storage → Create → Supabase** (or **Integrations → Supabase**), create a free project and connect it to this Vercel project. That adds `POSTGRES_URL` automatically.

**Or by hand:** create a free project at supabase.com → **Connect** → copy the **Transaction pooler** URI (port 6543), put your database password in it, and add it in Vercel as `DATABASE_URL`.

The `pins` table is created automatically the first time the site loads (schema in `db/schema.sql`).

### 6. Add environment variables in Vercel
Project → **Settings → Environment Variables**:

| Name | Value |
|---|---|
| `AUTH_SECRET` | a long random string (run `npx auth secret` to make one) |
| `AUTH_GOOGLE_ID` | Google client ID |
| `AUTH_GOOGLE_SECRET` | Google client secret |
| `ADMIN_EMAILS` | your Google email (comma-separate several) — these accounts can remove any pin |

Then **Deployments → ⋯ → Redeploy**. Done: open your URL and sign in.

## Run locally
```
copy .env.example .env.local   # fill in the values
npm install
npm run dev
```

## How it works
- `auth.ts`: Google sign-in via Auth.js. `lib/viewer.ts` works out who is signed in and whether they're an admin (`ADMIN_EMAILS`).
- `app/api/upload`: gives signed-in users a short-lived token; the browser uploads the image straight to Vercel Blob (up to 20 MB, PNG/JPG/GIF/WebP).
- `app/api/pins`: `GET` lists pins, `POST` saves a pin (title, description, category, size) after its image is uploaded.
- `app/api/pins/[id]`: `PATCH` lets the owner edit a pin; `DELETE` lets the owner or an admin remove it (row and image).
- `lib/pins.ts`: validation and permissions; `lib/db.ts`: Postgres connection and automatic table setup.
- Users are stored as a hash of their email, so emails never appear in the database or URLs.
- Sample pins: 18 illustrated SVG pins of fictional people, plus 5 AI-generated portrait photos, all labelled as samples.
- Saved pins are kept in the visitor's browser.
- Uploaded image URLs are public, so anyone with a link can view a photo.
