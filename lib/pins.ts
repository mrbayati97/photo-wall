import { del } from "@vercel/blob";
import { ensureSchema, hasDatabase, sql } from "./db";
import { CATEGORIES, LIMITS, type Category, type Pin } from "./shared";
import type { Viewer } from "./viewer";

type Row = {
  id: string;
  owner: string;
  author_name: string;
  author_image: string | null;
  title: string;
  description: string;
  category: string;
  image_url: string;
  blob_path: string;
  width: number | null;
  height: number | null;
  created_at: Date;
};


export class PinError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const asCategory = (c: string): Category => ((CATEGORIES as readonly string[]).includes(c) ? (c as Category) : "Other");

function toPin(r: Row, viewer: Viewer | null): Pin {
  const mine = viewer?.uid === r.owner;
  return {
    id: r.id,
    src: r.image_url,
    title: r.title,
    description: r.description || undefined,
    category: asCategory(r.category),
    author: { name: r.author_name || "Someone", avatar: r.author_image },
    sample: false,
    mine,
    canEdit: mine,
    canDelete: mine || Boolean(viewer?.admin),
    width: r.width ?? undefined,
    height: r.height ?? undefined,
    createdAt: r.created_at.toISOString(),
  };
}

/** Validates and normalises user-supplied pin fields. */
export function cleanFields(input: { title?: unknown; description?: unknown; category?: unknown }) {
  const title = String(input.title ?? "").trim();
  const description = String(input.description ?? "").trim();
  const category = String(input.category ?? "");
  if (!title) throw new PinError("Add a title.", 400);
  if (title.length > LIMITS.title) throw new PinError(`Keep the title under ${LIMITS.title} characters.`, 400);
  if (description.length > LIMITS.description) throw new PinError(`Keep the description under ${LIMITS.description} characters.`, 400);
  if (!(CATEGORIES as readonly string[]).includes(category)) throw new PinError("Pick a category from the list.", 400);
  return { title, description, category };
}

/** All pins, newest first. Returns [] when no database is connected. */
export async function listPins(viewer: Viewer | null): Promise<Pin[]> {
  if (!hasDatabase()) return [];
  await ensureSchema();
  const rows = await sql()<Row[]>`select * from pins order by created_at desc limit 500`;
  return rows.map((r) => toPin(r, viewer));
}

export async function createPin(
  viewer: Viewer,
  input: { url?: unknown; pathname?: unknown; width?: unknown; height?: unknown; title?: unknown; description?: unknown; category?: unknown },
) {
  const fields = cleanFields(input);
  const url = String(input.url ?? "");
  const pathname = String(input.pathname ?? "");
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    /* handled below */
  }
  // The image must be one this user just uploaded to our Blob store.
  if (!host.endsWith(".public.blob.vercel-storage.com") || !pathname.startsWith(`photos/${viewer.uid}/`) || !new URL(url).pathname.endsWith(pathname)) {
    throw new PinError("That image wasn't uploaded by you.", 403);
  }
  const dim = (v: unknown) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n > 0 && n < 20000 ? n : null;
  };
  await ensureSchema();
  const [row] = await sql()<Row[]>`
    insert into pins (owner, author_name, author_image, title, description, category, image_url, blob_path, width, height)
    values (${viewer.uid}, ${viewer.name}, ${viewer.image}, ${fields.title}, ${fields.description}, ${fields.category},
            ${url}, ${pathname}, ${dim(input.width)}, ${dim(input.height)})
    returning *`;
  return toPin(row, viewer);
}

async function getRow(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new PinError("Pin not found.", 404);
  await ensureSchema();
  const [row] = await sql()<Row[]>`select * from pins where id = ${id}`;
  if (!row) throw new PinError("Pin not found.", 404);
  return row;
}

/** Owners can edit their own pins. */
export async function updatePin(viewer: Viewer, id: string, input: { title?: unknown; description?: unknown; category?: unknown }) {
  const row = await getRow(id);
  if (row.owner !== viewer.uid) throw new PinError("You can only edit your own pins.", 403);
  const f = cleanFields(input);
  const [updated] = await sql()<Row[]>`
    update pins set title = ${f.title}, description = ${f.description}, category = ${f.category}, updated_at = now()
    where id = ${id} returning *`;
  return toPin(updated, viewer);
}

/** Owners can delete their own pins; admins can delete any pin. */
export async function deletePin(viewer: Viewer, id: string) {
  const row = await getRow(id);
  if (row.owner !== viewer.uid && !viewer.admin) throw new PinError("You can only delete your own pins.", 403);
  await sql()`delete from pins where id = ${id}`;
  try {
    await del(row.image_url);
  } catch {
    /* the row is gone; a leftover file is harmless */
  }
  return { deleted: true, by: row.owner === viewer.uid ? "owner" : "admin" };
}
