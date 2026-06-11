"use client";

import type { Generation, GenerationStatus } from "@/lib/types";
import ImageCard from "./ImageCard";

interface Props {
  status: GenerationStatus | null; // current in-flight job status
  result: Generation | null; // latest completed image
  history: Generation[]; // recent completed images (excludes the featured one)
  error: string | null;
  aspectRatio: string;
}

const ASPECT_CLASS: Record<string, string> = {
  "1:1": "aspect-square",
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
};

function LoadingCanvas({ aspectRatio }: { aspectRatio: string }) {
  const aspect = ASPECT_CLASS[aspectRatio] ?? "aspect-square";
  return (
    <div
      className={`relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/5 bg-ink-850 ${aspect}`}
    >
      {/* shimmer sweep */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-full bg-brand-400 animate-pulseGlow"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <p className="text-sm text-zinc-400">Conjuring your image…</p>
      </div>
    </div>
  );
}

export default function ResultPanel({ status, result, history, error, aspectRatio }: Props) {
  const isLoading = status === "pending" || status === "processing";

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      {/* Featured area */}
      <div className="flex min-h-[60%] flex-1 items-center justify-center">
        {error ? (
          <div className="max-w-md rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="text-sm font-medium text-red-300">Generation failed</p>
            <p className="mt-1 text-xs text-red-300/70">{error}</p>
          </div>
        ) : isLoading ? (
          <LoadingCanvas aspectRatio={aspectRatio} />
        ) : result ? (
          <div className="w-full max-w-xl">
            <ImageCard gen={result} />
          </div>
        ) : (
          <div className="text-center text-zinc-600">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/5 bg-ink-850 text-3xl">
              ✦
            </div>
            <p className="text-sm">Your generated images will appear here.</p>
          </div>
        )}
      </div>

      {/* Recent strip */}
      {history.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Recent</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {history.map((g) => (
              <ImageCard key={g.id} gen={g} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
