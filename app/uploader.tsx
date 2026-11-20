"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

const TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const MAX = 20 * 1024 * 1024;

export default function Uploader({ uid }: { uid: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  async function send(files: FileList | File[]) {
    const list = [...files].filter((f) => TYPES.includes(f.type));
    if (!list.length) return setStatus("Pick PNG, JPG, GIF or WebP images.");
    setBusy(true);
    let done = 0;
    for (const f of list) {
      if (f.size > MAX) { setStatus(`"${f.name}" is over 20 MB.`); continue; }
      setStatus(`Uploading ${done + 1} of ${list.length}…`);
      try {
        const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "photo";
        await upload(`photos/${uid}/${safe}`, f, { access: "public", handleUploadUrl: "/api/upload" });
        done++;
      } catch (e) {
        setStatus(`"${f.name}" couldn't be uploaded: ${(e as Error).message}`);
      }
    }
    setBusy(false);
    if (done) setStatus(done === 1 ? "Uploaded 1 photo." : `Uploaded ${done} photos.`);
    router.refresh();
  }

  return (
    <section>
      <div
        className={`drop${over ? " over" : ""}`}
        tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); send(e.dataTransfer.files); }}
        onPaste={(e) => send(e.clipboardData.files)}
      >
        <div>
          <strong>Add photos</strong>
          <p>Drop images here or pick files. PNG, JPG, GIF or WebP, up to 20 MB each.</p>
        </div>
        <button className="btn primary" type="button" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "Uploading…" : "Choose images"}
        </button>
        <input
          ref={input}
          id="file"
          type="file"
          accept={TYPES.join(",")}
          multiple
          hidden
          onChange={(e) => { if (e.target.files) send(e.target.files); e.target.value = ""; }}
        />
      </div>
      <p className="status" role="status">{status}</p>
    </section>
  );
}
