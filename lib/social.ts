import { ensureSchema, hasDatabase, sql } from "./db";
import { SAMPLE_PEOPLE, SAMPLE_PIN_IDS } from "./samples";
import { PinError } from "./pins";
import type { Pin } from "./shared";
import type { Viewer } from "./viewer";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Adds like and follower counts (and the viewer's own likes/follows) to pins. */
export async function withSocial(pins: Pin[], viewer: Viewer | null): Promise<Pin[]> {
  if (!hasDatabase()) return pins;
  await ensureSchema();
  const db = sql();
  // One query at a time: serverless + Supabase's pooler use a single connection.
  const likeRows = await db<{ pin_id: string; n: number }[]>`select pin_id, count(*)::int as n from likes group by pin_id`;
  const followRows = await db<{ target: string; n: number }[]>`select target, count(*)::int as n from follows group by target`;
  const mine = viewer
    ? await db<{ kind: string; id: string }[]>`
        select 'like' as kind, pin_id as id from likes where uid = ${viewer.uid}
        union all
        select 'follow' as kind, target as id from follows where uid = ${viewer.uid}`
    : [];
  const myLikes = mine.filter((r) => r.kind === "like").map((r) => ({ pin_id: r.id }));
  const myFollows = mine.filter((r) => r.kind === "follow").map((r) => ({ target: r.id }));
  const likes = new Map(likeRows.map((r) => [r.pin_id, r.n]));
  const followers = new Map(followRows.map((r) => [r.target, r.n]));
  const liked = new Set(myLikes.map((r) => r.pin_id));
  const following = new Set(myFollows.map((r) => r.target));
  return pins.map((p) => ({
    ...p,
    likes: likes.get(p.id) ?? 0,
    liked: liked.has(p.id),
    followers: followers.get(p.author.key) ?? 0,
    following: following.has(p.author.key),
  }));
}

/** Likes or unlikes a pin; returns the new count. */
export async function setLike(viewer: Viewer, pinId: string, on: boolean) {
  await ensureSchema();
  const db = sql();
  if (!SAMPLE_PIN_IDS.has(pinId)) {
    if (!UUID.test(pinId)) throw new PinError("Pin not found.", 404);
    const [row] = await db`select 1 from pins where id = ${pinId}`;
    if (!row) throw new PinError("Pin not found.", 404);
  }
  if (on) await db`insert into likes (pin_id, uid) values (${pinId}, ${viewer.uid}) on conflict do nothing`;
  else await db`delete from likes where pin_id = ${pinId} and uid = ${viewer.uid}`;
  const [{ n }] = await db<{ n: number }[]>`select count(*)::int as n from likes where pin_id = ${pinId}`;
  return { likes: n, liked: on };
}

/** Follows or unfollows a member ("u:<hash>") or sample character ("s:<id>"). */
export async function setFollow(viewer: Viewer, target: string, on: boolean) {
  await ensureSchema();
  const db = sql();
  if (target === `u:${viewer.uid}`) throw new PinError("You can't follow yourself.", 400);
  if (target.startsWith("s:")) {
    if (!SAMPLE_PEOPLE.has(target.slice(2))) throw new PinError("Person not found.", 404);
  } else if (target.startsWith("u:") && /^[0-9a-f]{20}$/.test(target.slice(2))) {
    const [row] = await db`select 1 from pins where owner = ${target.slice(2)} limit 1`;
    if (!row) throw new PinError("Person not found.", 404);
  } else {
    throw new PinError("Person not found.", 404);
  }
  if (on) await db`insert into follows (target, uid) values (${target}, ${viewer.uid}) on conflict do nothing`;
  else await db`delete from follows where target = ${target} and uid = ${viewer.uid}`;
  const [{ n }] = await db<{ n: number }[]>`select count(*)::int as n from follows where target = ${target}`;
  return { followers: n, following: on };
}
