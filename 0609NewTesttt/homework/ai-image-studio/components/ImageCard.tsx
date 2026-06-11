"use client";

import { useState } from "react";
import type { Generation } from "@/lib/types";

async function downloadImage(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  } catch {
    // Fallback if CORS blocks the blob fetch.
    window.open(url, "_blank");
  }
}

const ASPECT_CLASS: Record<string, string> = {
  "1:1": "aspect-square",
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
};

export default function ImageCard({ gen }: { gen: Generation }) {
  const [busy, setBusy] = useState(false);
  if (!gen.image_url) return null;

  const aspect = ASPECT_CLASS[gen.aspect_ratio] ?? "aspect-square";

  async function onDownload() {
    setBusy(true);
    await downloadImage(gen.image_url!, `ai-image-${gen.id.slice(0, 8)}.jpg`);
    setBusy(false);
  }

  return (
    <figure className="group relative overflow-hidden rounded-xl border border-white/5 bg-ink-850 animate-floatUp">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={gen.image_url}
        alt={gen.prompt}
        className={`w-full object-cover ${aspect}`}
        loading="lazy"
      />
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/90 to-transparent p-3 transition-transform duration-300 group-hover:translate-y-0">
        <p className="line-clamp-2 text-xs text-zinc-200">{gen.prompt}</p>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-400">
          <span className="rounded bg-white/10 px-1.5 py-0.5">{gen.style}</span>
          <span className="rounded bg-white/10 px-1.5 py-0.5">{gen.aspect_ratio}</span>
        </div>
      </figcaption>
      <button
        onClick={onDownload}
        disabled={busy}
        title="Download"
        className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 backdrop-blur transition hover:bg-black/70 group-hover:opacity-100 disabled:opacity-50"
      >
        {busy ? "…" : "↓"}
      </button>
    </figure>
  );
}
