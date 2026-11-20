"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Photo } from "@/lib/photos";

export default function Gallery({ photos, myUid }: { photos: Photo[]; myUid: string | null }) {
  const router = useRouter();
  const [armed, setArmed] = useState<string | null>(null);
  const [gone, setGone] = useState<Set<string>>(new Set());

  async function remove(url: string) {
    if (armed !== url) return setArmed(url);
    setArmed(null);
    const res = await fetch("/api/photos", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (res.ok) {
      setGone((g) => new Set(g).add(url));
      router.refresh();
    }
  }

  const shown = photos.filter((p) => !gone.has(p.url));
  if (!shown.length) return <p className="empty">No uploads yet. Sign in and add the first photo.</p>;

  return (
    <div className="grid">
      {shown.map((p) => {
        const name = p.profile?.name || "Someone";
        return (
          <figure key={p.url}>
            <img src={p.url} alt={`Photo shared by ${name}`} loading="lazy" />
            <figcaption>
              {p.profile?.image && <img src={p.profile.image} alt="" referrerPolicy="no-referrer" />}
              <span className="name">{name}</span>
              {myUid === p.owner && (
                <button className="del" type="button" onClick={() => remove(p.url)}>
                  {armed === p.url ? "Confirm delete" : "Delete"}
                </button>
              )}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
