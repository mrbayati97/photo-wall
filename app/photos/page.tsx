import type { Metadata } from "next";
import { headers } from "next/headers";
import { getFeed } from "@/lib/feed";
import CopyButton from "./copy-button";
import JsonView from "./json-view";

export const dynamic = "force-dynamic";
export const maxDuration = 20;
export const metadata: Metadata = { title: "Photos as JSON · Photo Wall" };

const LABEL = { member: "Member", "ai-generated": "AI", stock: "Stock" } as const;

// /photos: every photo on the wall shown next to its JSON record from /photos.json.
export default async function PhotosJsonPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const feed = await getFeed(`${proto}://${host}`);
  const all = JSON.stringify(feed, null, 2);

  return (
    <main className="json-page">
      <header className="json-head">
        <a className="back" href="/">← Back to the wall</a>
        <h1>Photos as JSON</h1>
        <p className="json-lead">
          {feed.count} photos, each with its record from <a href="/photos.json">/photos.json</a>. Use the feed in your own
          apps: it&apos;s public and the same for everyone.
        </p>
        <div className="row">
          <a className="btn primary" href="/photos.json" target="_blank" rel="noopener">Open photos.json</a>
          <CopyButton text={all} label="Copy all JSON" />
        </div>
        {!feed.database && <p className="hint">Member photos aren&apos;t available right now, so only sample photos are listed.</p>}
      </header>

      <ol className="json-list">
        {feed.photos.map((p) => (
          <li key={p.id} className="json-item">
            <figure>
              <img src={p.image} alt={p.title} width={p.width ?? undefined} height={p.height ?? undefined} loading="lazy" />
              <figcaption>
                <strong>{p.title}</strong>
                <span>{p.author.name} · {p.category} · <span className="badge">{LABEL[p.source]}</span></span>
              </figcaption>
            </figure>
            <div className="json-code">
              <div className="json-bar">
                <code>{p.id}</code>
                <CopyButton text={JSON.stringify(p, null, 2)} label="Copy" small />
              </div>
              <JsonView value={p} />
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
