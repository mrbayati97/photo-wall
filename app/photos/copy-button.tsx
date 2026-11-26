"use client";

import { useState } from "react";

/** Copies text to the clipboard and briefly confirms. */
export default function CopyButton({ text, label, small }: { text: string; label: string; small?: boolean }) {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      // Fallback for browsers that block the Clipboard API (older browsers, embedded views).
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      setState(ok ? "done" : "fail");
    }
    setTimeout(() => setState("idle"), 1600);
  }
  return (
    <button type="button" className={small ? "btn ghost small" : "btn ghost"} onClick={copy} aria-live="polite">
      {state === "done" ? "Copied" : state === "fail" ? "Couldn't copy" : label}
    </button>
  );
}
