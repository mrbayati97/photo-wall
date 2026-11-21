import postgres from "postgres";

/**
 * Postgres connection (Supabase). Accepts DATABASE_URL, or POSTGRES_URL as
 * set by the Supabase integration in Vercel. Query parameters are dropped
 * because Supabase adds ones the driver would forward to the server.
 */
function connectionString() {
  const raw = (process.env.DATABASE_URL || process.env.POSTGRES_URL || "").trim();
  return raw ? raw.split("?")[0] : "";
}

type Sql = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __sql?: Sql; __schema?: Promise<void> };

export function hasDatabase() {
  return Boolean(connectionString());
}

/** Shared client; `prepare: false` is required by Supabase's transaction pooler. */
export function sql(): Sql {
  if (!g.__sql) {
    const url = connectionString();
    if (!url) throw new Error("Database is not connected. Set DATABASE_URL.");
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    g.__sql = postgres(url, { prepare: false, ssl: local ? false : "require", max: local ? 1 : 3, idle_timeout: 20, onnotice: () => {} });
  }
  return g.__sql;
}

/** Creates the tables on first use, so there is no manual migration step. */
export function ensureSchema() {
  if (!g.__schema) {
    g.__schema = sql()
      .unsafe(SCHEMA)
      .then(() => undefined)
      .catch((e) => {
        g.__schema = undefined;
        throw e;
      });
  }
  return g.__schema;
}

// Keep in sync with db/schema.sql (that file is for reading or running by hand).
const SCHEMA = "-- Photo Wall database schema. The app also creates this automatically on first use.\ncreate table if not exists pins (\n  id           uuid primary key default gen_random_uuid(),\n  owner        text not null,               -- hashed user id (never the email)\n  author_name  text not null default '',\n  author_image text,\n  title        text not null,\n  description  text not null default '',\n  category     text not null,\n  image_url    text not null,\n  blob_path    text not null unique,\n  width        integer,\n  height       integer,\n  created_at   timestamptz not null default now(),\n  updated_at   timestamptz not null default now()\n);\ncreate index if not exists pins_created_at_idx on pins (created_at desc);\ncreate index if not exists pins_owner_idx on pins (owner);\n";
