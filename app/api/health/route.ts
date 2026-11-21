import { NextResponse } from "next/server";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/health: which services are configured and whether the database answers.
// Reports only yes/no and counts, never secret values.
export async function GET() {
  const env = (k: string) => Boolean(process.env[k]?.trim());
  const status = {
    auth: env("AUTH_SECRET") && env("AUTH_GOOGLE_ID") && env("AUTH_GOOGLE_SECRET"),
    blob: env("BLOB_READ_WRITE_TOKEN"),
    admins: (process.env.ADMIN_EMAILS || "").split(",").filter((e) => e.trim()).length,
    database: "missing" as "missing" | "connected" | "error",
    pins: null as number | null,
    error: undefined as string | undefined,
    // Names only (never values), to spot settings saved under unexpected names.
    envNames: Object.keys(process.env).filter((k) => /POSTGRES|DATABASE|SUPABASE|BLOB|ADMIN|AUTH_/.test(k)).sort(),
  };
  if (hasDatabase()) {
    try {
      await ensureSchema();
      const [row] = await sql()<{ n: number }[]>`select count(*)::int as n from pins`;
      status.database = "connected";
      status.pins = row.n;
    } catch (e) {
      status.database = "error";
      status.error = (e as Error).message.replace(/postgres(ql)?:\/\/\S+/gi, "[connection string]").slice(0, 200);
    }
  }
  return NextResponse.json(status);
}
