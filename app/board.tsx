"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload, uploadPresigned } from "@vercel/blob/client";
import { ALLOWED_TYPES, CATEGORIES, LIMITS, MAX_BYTES, type Pin } from "@/lib/shared";

type User = { uid: string; name: string; image: string | null; admin: boolean };
type Props = {
  pins: Pin[];
  user: User | null;
  social: boolean;
  canPost: boolean;
  uploadMode: "token" | "presigned";
  signInAction: () => Promise<void>;
  signOutAction: () => Promise<void>;
};
type Count = { n: number; on: boolean };
type Social = {
  like: (pin: Pin) => Count;
  follow: (pin: Pin) => Count;
  toggleLike: (pin: Pin) => void;
  toggleFollow: (pin: Pin) => void;
};

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

async function apiError(res: Response) {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error || "Something went wrong. Try again.";
}

const SAVED_KEY = "photo-wall:saved";

function loadSaved(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export default function Board({ pins, user, social, canPost, uploadMode, signInAction, signOutAction }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Pin | null>(null);
  const [creating, setCreating] = useState(false);
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const likeMap = (list: Pin[]) => Object.fromEntries(list.map((p) => [p.id, { n: p.likes ?? 0, on: Boolean(p.liked) }]));
  const followMap = (list: Pin[]) => Object.fromEntries(list.map((p) => [p.author.key, { n: p.followers ?? 0, on: Boolean(p.following) }]));
  const [likes, setLikes] = useState<Record<string, Count>>(() => likeMap(pins));
  const [follows, setFollows] = useState<Record<string, Count>>(() => followMap(pins));

  useEffect(() => setSaved(loadSaved()), []);

  // Server counts are the starting point; refreshed whenever new pins arrive.
  useEffect(() => {
    setLikes(likeMap(pins));
    setFollows(followMap(pins));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  function gate(): boolean {
    if (!user) {
      void signInAction();
      return false;
    }
    if (!social) {
      setNotice("Likes and follows start working once the database is connected.");
      return false;
    }
    return true;
  }

  async function send(url: string, body: object, revert: () => void) {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    if (!res?.ok) {
      revert();
      setNotice(res ? await apiError(res) : "You're offline. Try again.");
    }
  }

  const soc: Social = {
    like: (p) => likes[p.id] ?? { n: 0, on: false },
    follow: (p) => follows[p.author.key] ?? { n: 0, on: false },
    toggleLike(p) {
      if (!gate()) return;
      const prev = likes[p.id] ?? { n: 0, on: false };
      const next = { n: Math.max(0, prev.n + (prev.on ? -1 : 1)), on: !prev.on };
      setLikes((s) => ({ ...s, [p.id]: next }));
      void send("/api/likes", { pinId: p.id, on: next.on }, () => setLikes((s) => ({ ...s, [p.id]: prev })));
    },
    toggleFollow(p) {
      if (!gate()) return;
      const k = p.author.key;
      const prev = follows[k] ?? { n: 0, on: false };
      const next = { n: Math.max(0, prev.n + (prev.on ? -1 : 1)), on: !prev.on };
      setFollows((s) => ({ ...s, [k]: next }));
      void send("/api/follows", { target: k, on: next.on }, () => setFollows((s) => ({ ...s, [k]: prev })));
    },
  };

  function toggleSave(id: string) {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify([...next]));
      } catch {
        /* storage blocked: saving still works for this visit */
      }
      return next;
    });
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pins.filter((p) => {
      if (filter === "Saved" && !saved.has(p.id)) return false;
      if (filter === "Mine" && !p.mine) return false;
      if (!["All", "Saved", "Mine"].includes(filter) && p.category !== filter) return false;
      if (!q) return true;
      return [p.title, p.description, p.category, p.author.name, p.author.bio].some((t) => t?.toLowerCase().includes(q));
    });
  }, [pins, query, filter, saved]);

  const chips = ["All", ...CATEGORIES, "Saved", ...(user ? ["Mine"] : [])];

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/wall" aria-label="Photo Wall">
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="2" y="2" width="12" height="17" rx="4" fill="var(--accent)" />
            <rect x="18" y="2" width="12" height="11" rx="4" fill="var(--ink)" />
            <rect x="2" y="23" width="12" height="7" rx="3.5" fill="var(--ink)" />
            <rect x="18" y="17" width="12" height="13" rx="4" fill="var(--accent-soft)" />
          </svg>
          <span>Photo Wall</span>
        </a>

        <label className="search">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2.4" />
            <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          <input
            id="search"
            type="search"
            placeholder="Search pins, people, topics"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className="actions">
          <a className="btn ghost json-link" href="/photos" title="See every photo with its JSON" aria-label="Photos JSON">
            <span className="icon" aria-hidden="true">{"{ }"}</span>
            <span className="label">Photos JSON</span>
          </a>
          {user ? (
            <>
              <button className="btn primary" type="button" onClick={() => setCreating(true)}>
                <span aria-hidden="true">+</span> Create
              </button>
              <div className="me">
                <button className="avatar-btn" type="button" aria-label="Account menu" onClick={() => setMenu((m) => !m)}>
                  {user.image ? (
                    <img src={user.image} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span>{user.name.slice(0, 1).toUpperCase()}</span>
                  )}
                </button>
                {menu && (
                  <div className="menu" role="menu">
                    <p className="menu-name">{user.name}{user.admin && <span className="badge admin">Admin</span>}</p>
                    <button type="button" role="menuitem" onClick={() => { setFilter("Mine"); setMenu(false); }}>
                      My pins
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setFilter("Saved"); setMenu(false); }}>
                      Saved pins
                    </button>
                    <form action={signOutAction}>
                      <button type="submit" role="menuitem">Sign out</button>
                    </form>
                  </div>
                )}
              </div>
            </>
          ) : (
            <form action={signInAction}>
              <button className="btn google" type="submit">
                <GoogleIcon /> Sign in with Google
              </button>
            </form>
          )}
        </div>
      </header>

      <nav className="chips" aria-label="Categories">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip${filter === c ? " on" : ""}`}
            aria-pressed={filter === c}
            onClick={() => setFilter(c)}
          >
            {c}
            {c === "Saved" && saved.size > 0 && <span className="count">{saved.size}</span>}
          </button>
        ))}
      </nav>

      <main className="board">
        {shown.length ? (
          <div className="masonry">
            {shown.map((p) => (
              <PinCard key={p.id} pin={p} soc={soc} saved={saved.has(p.id)} onSave={() => toggleSave(p.id)} onOpen={() => setOpen(p)} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <strong>{filter === "Saved" ? "No saved pins yet" : filter === "Mine" ? "You haven't posted yet" : "No pins found"}</strong>
            <p>
              {filter === "Saved"
                ? "Tap Save on any pin to keep it here."
                : filter === "Mine"
                  ? "Use Create to share your first photo."
                  : "Try a different word or category."}
            </p>
          </div>
        )}
      </main>

      {open && (
        <PinView
          key={open.id}
          pin={open}
          isAdmin={Boolean(user?.admin)}
          soc={soc}
          related={pins.filter((p) => p.category === open.category && p.id !== open.id).slice(0, 6)}
          saved={saved.has(open.id)}
          onSave={() => toggleSave(open.id)}
          onOpen={setOpen}
          onClose={() => setOpen(null)}
        />
      )}
      {creating && user && <CreatePin uid={user.uid} canPost={canPost} uploadMode={uploadMode} onClose={() => setCreating(false)} />}
      {notice && <div className="toast" role="status">{notice}</div>}
    </>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LikeButton({ pin, soc, big }: { pin: Pin; soc: Social; big?: boolean }) {
  const { n, on } = soc.like(pin);
  return (
    <button
      type="button"
      className={`like${on ? " on" : ""}${big ? " big" : ""}`}
      aria-pressed={on}
      aria-label={`${on ? "Unlike" : "Like"} ${pin.title}${n ? `, ${n} likes` : ""}`}
      onClick={() => soc.toggleLike(pin)}
    >
      <HeartIcon filled={on} />
      <span>{fmt(n)}</span>
    </button>
  );
}

function FollowButton({ pin, soc }: { pin: Pin; soc: Social }) {
  if (pin.mine) return null;
  const { on } = soc.follow(pin);
  return (
    <button
      type="button"
      className={`follow${on ? " on" : ""}`}
      aria-pressed={on}
      aria-label={`${on ? "Unfollow" : "Follow"} ${pin.author.name}`}
      onClick={() => soc.toggleFollow(pin)}
    >
      {on ? "Following" : "Follow"}
    </button>
  );
}

function PinCard({ pin, soc, saved, onSave, onOpen }: { pin: Pin; soc: Social; saved: boolean; onSave: () => void; onOpen: () => void }) {
  return (
    <article className="pin">
      <div className="pin-media">
        <button className="pin-open" type="button" onClick={onOpen} aria-label={`Open pin: ${pin.title}`}>
          <img src={pin.src} alt={pin.title} width={pin.width} height={pin.height} loading="lazy" />
        </button>
        <span className="pin-cat">{pin.category}</span>
        <button className={`save${saved ? " saved" : ""}`} type="button" onClick={onSave}>
          {saved ? "Saved" : "Save"}
        </button>
      </div>
      <div className="pin-meta">
        <p className="pin-title">{pin.title}</p>
        <div className="pin-author">
          <Avatar src={pin.author.avatar} name={pin.author.name} size={24} />
          <span className="who">{pin.author.name}</span>
          {pin.sample && <span className="badge">{pin.aiGenerated ? "AI" : pin.stock ? "Stock" : "Sample"}</span>}
        </div>
        <div className="pin-actions">
          <FollowButton pin={pin} soc={soc} />
          <LikeButton pin={pin} soc={soc} />
        </div>
      </div>
    </article>
  );
}

function PinView({
  pin, related, saved, isAdmin, soc, onSave, onOpen, onClose,
}: { pin: Pin; related: Pin[]; saved: boolean; isAdmin: boolean; soc: Social; onSave: () => void; onOpen: (p: Pin) => void; onClose: () => void }) {
  const router = useRouter();
  const [current, setCurrent] = useState(pin);
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ title: pin.title, description: pin.description ?? "", category: pin.category as string });
  useModal(onClose);

  async function remove() {
    if (!confirm) return setConfirm(true);
    setErr("");
    setBusy(true);
    const res = await fetch(`/api/pins/${current.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return setErr(await apiError(res));
    onClose();
    router.refresh();
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const res = await fetch(`/api/pins/${current.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) return setErr(await apiError(res));
    const { pin: updated } = (await res.json()) as { pin: Pin };
    setCurrent(updated);
    setEditing(false);
    router.refresh();
  }

  const adminRemoval = current.canDelete && !current.mine && isAdmin;

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={current.title}>
        <button className="close" type="button" onClick={onClose} aria-label="Close">×</button>
        <div className="sheet-img">
          <img src={current.src} alt={current.title} />
        </div>
        <div className="sheet-info">
          <div className="sheet-actions">
            <div className="row">
              <span className="chip static">{current.category}</span>
              <LikeButton pin={current} soc={soc} big />
            </div>
            <div className="row">
              {current.canEdit && !editing && (
                <button className="btn ghost" type="button" onClick={() => setEditing(true)}>Edit</button>
              )}
              {current.canDelete && (
                <button className={`btn ${confirm ? "danger" : "ghost"}`} type="button" onClick={remove} disabled={busy}>
                  {confirm ? "Confirm" : adminRemoval ? "Remove (admin)" : "Delete"}
                </button>
              )}
              <button className={`btn ${saved ? "dark" : "primary"}`} type="button" onClick={onSave}>
                {saved ? "Saved" : "Save"}
              </button>
            </div>
          </div>
          {err && <p className="error" role="alert">{err}</p>}
          {editing ? (
            <form className="edit" onSubmit={save}>
              <label htmlFor="edit-title">Title</label>
              <input id="edit-title" maxLength={LIMITS.title} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <label htmlFor="edit-desc">Description</label>
              <textarea id="edit-desc" rows={3} maxLength={LIMITS.description} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <label htmlFor="edit-cat">Category</label>
              <select id="edit-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <div className="row">
                <button className="btn primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
                <button className="btn ghost" type="button" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <h2>{current.title}</h2>
              {current.description && <p className="desc">{current.description}</p>}
            </>
          )}
          <div className="author">
            <Avatar src={current.author.avatar} name={current.author.name} size={48} />
            <div>
              <strong>{current.author.name}</strong>
              <span className="followers">{fmt(soc.follow(current).n)} {soc.follow(current).n === 1 ? "follower" : "followers"}</span>
              {current.author.bio && <span>{current.author.bio}</span>}
              {current.sample && <span className="badge">{current.aiGenerated ? "AI-generated sample" : current.stock ? "Stock photo sample" : "Sample"}</span>}
            </div>
            <FollowButton pin={current} soc={soc} />
          </div>
          {related.length > 0 && (
            <>
              <p className="more">More in {current.category}</p>
              <div className="related">
                {related.map((r) => (
                  <button key={r.id} type="button" onClick={() => onOpen(r)} aria-label={`Open pin: ${r.title}`}>
                    <img src={r.src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function readSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

function CreatePin({ uid, canPost, uploadMode, onClose }: { uid: string; canPost: boolean; uploadMode: "token" | "presigned"; onClose: () => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(canPost ? "" : "Posting is paused until the database and image storage are connected.");
  const [over, setOver] = useState(false);
  useModal(onClose);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(f: File | undefined) {
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) return setStatus("Pick a PNG, JPG, GIF or WebP image.");
    if (f.size > MAX_BYTES) return setStatus("That image is over 20 MB. Pick a smaller one.");
    setStatus("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, LIMITS.title));
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setStatus("Add an image first.");
    if (!title.trim()) return setStatus("Add a title.");
    setBusy(true);
    try {
      setStatus("Uploading image…");
      const size = await readSize(file);
      const ext = file.type.split("/")[1].replace("jpeg", "jpg");
      const send = uploadMode === "presigned" ? uploadPresigned : upload;
      const blob = await send(`photos/${uid}/pin.${ext}`, file, { access: "public", handleUploadUrl: "/api/upload" });
      setStatus("Saving pin…");
      const res = await fetch("/api/pins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: blob.url, pathname: blob.pathname, title, description, category, ...size }),
      });
      if (!res.ok) throw new Error(await apiError(res));
      router.refresh();
      onClose();
    } catch (err) {
      setStatus(`Couldn't publish: ${(err as Error).message}`);
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <form className="sheet create" role="dialog" aria-modal="true" aria-label="Create pin" onSubmit={publish}>
        <button className="close" type="button" onClick={onClose} aria-label="Close" disabled={busy}>×</button>
        <div
          className={`dropzone${over ? " over" : ""}${preview ? " has" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}
          onPaste={(e) => pick(e.clipboardData.files[0])}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Choose an image"
        >
          {preview ? (
            <img src={preview} alt="Preview of your pin" />
          ) : (
            <div>
              <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0l-5 5m5-5l5 5M5 20h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <strong>Choose an image or drag it here</strong>
              <span>PNG, JPG, GIF or WebP, up to 20 MB</span>
            </div>
          )}
          <input ref={input} id="pin-file" type="file" accept={ALLOWED_TYPES.join(",")} hidden onChange={(e) => pick(e.target.files?.[0])} />
        </div>
        <div className="create-fields">
          <h2>Create pin</h2>
          <label htmlFor="pin-title">Title</label>
          <input id="pin-title" type="text" maxLength={LIMITS.title} placeholder="Give your pin a title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label htmlFor="pin-desc">Description (optional)</label>
          <textarea id="pin-desc" rows={3} maxLength={LIMITS.description} placeholder="Tell people about it" value={description} onChange={(e) => setDescription(e.target.value)} />
          <label htmlFor="pin-category">Category</label>
          <select id="pin-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <p className="hint">Everyone who visits Photo Wall can see your pin. You can edit or delete it any time.</p>
          <button className="btn primary wide" type="submit" disabled={busy || !file || !canPost}>
            {busy ? "Publishing…" : "Publish"}
          </button>
          <p className="status" role="status">{status}</p>
        </div>
      </form>
    </div>
  );
}

function useModal(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
}

function Avatar({ src, name, size }: { src: string | null; name: string; size: number }) {
  return src ? (
    <img className="avatar" src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" />
  ) : (
    <span className="avatar initial" style={{ width: size, height: size }}>{(name || "?").slice(0, 1).toUpperCase()}</span>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
