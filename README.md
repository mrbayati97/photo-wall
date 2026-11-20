# Shared Photo Wall

People sign in with Google and upload photos to a shared wall. The first page shows sample images.

Built with Next.js 15, Auth.js (Google sign-in) and Vercel Blob (image storage). No database needed.

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

### 5. Add environment variables in Vercel
Project → **Settings → Environment Variables**:

| Name | Value |
|---|---|
| `AUTH_SECRET` | a long random string (run `npx auth secret` to make one) |
| `AUTH_GOOGLE_ID` | Google client ID |
| `AUTH_GOOGLE_SECRET` | Google client secret |

Then **Deployments → ⋯ → Redeploy**. Done: open your URL and sign in.

## Run locally
```
copy .env.example .env.local   # fill in the values
npm install
npm run dev
```

## How it works
- `auth.ts`: Google sign-in via Auth.js.
- `app/api/upload`: gives signed-in users a short-lived token; the browser uploads straight to Vercel Blob (up to 20 MB, PNG/JPG/GIF/WebP).
- Photos are stored at `photos/<user-hash>/…`; the user hash is derived from the email so emails never appear in URLs.
- `app/api/photos` (DELETE): users can delete only their own photos.
- Note: uploaded image URLs are public, so anyone with a link can view a photo.
