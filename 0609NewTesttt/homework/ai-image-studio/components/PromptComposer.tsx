"use client";

import { ASPECT_RATIOS, STYLES } from "@/lib/constants";

interface Props {
  prompt: string;
  setPrompt: (v: string) => void;
  negativePrompt: string;
  setNegativePrompt: (v: string) => void;
  style: string;
  setStyle: (v: string) => void;
  aspectRatio: string;
  setAspectRatio: (v: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function PromptComposer(props: Props) {
  const {
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    style,
    setStyle,
    aspectRatio,
    setAspectRatio,
    onGenerate,
    isGenerating,
  } = props;

  const canGenerate = prompt.trim().length >= 2 && !isGenerating;

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canGenerate) {
      onGenerate();
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-lg font-semibold text-white">Create</h1>
        <p className="text-sm text-zinc-400">Describe what you want to see.</p>
      </div>

      {/* Prompt */}
      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onKeyDown}
          rows={4}
          placeholder="A serene Japanese garden at dawn, koi pond, soft mist…"
          className="w-full resize-none rounded-xl border border-white/10 bg-ink-800 p-3.5 text-sm text-white outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
        />
      </div>

      {/* Aspect ratio */}
      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Aspect Ratio
        </label>
        <div className="grid grid-cols-3 gap-2">
          {ASPECT_RATIOS.map((a) => {
            const active = aspectRatio === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setAspectRatio(a.id)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border py-3 text-xs transition ${
                  active
                    ? "border-brand-500 bg-brand-500/10 text-white"
                    : "border-white/10 bg-ink-800 text-zinc-400 hover:border-white/20"
                }`}
              >
                <span
                  className={`block rounded-sm border ${
                    active ? "border-brand-400" : "border-zinc-500"
                  } ${a.id === "1:1" ? "h-5 w-5" : a.id === "16:9" ? "h-3.5 w-6" : "h-6 w-3.5"}`}
                />
                {a.sub}
              </button>
            );
          })}
        </div>
      </div>

      {/* Style */}
      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Style
        </label>
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map((s) => {
            const active = style === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                  active
                    ? "border-brand-500 bg-brand-500/10 text-white"
                    : "border-white/10 bg-ink-800 text-zinc-400 hover:border-white/20"
                }`}
              >
                <span>{s.emoji}</span>
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Negative prompt */}
      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Negative Prompt <span className="normal-case text-zinc-600">(optional)</span>
        </label>
        <input
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder="blurry, low quality, watermark, text…"
          className="w-full rounded-lg border border-white/10 bg-ink-800 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
        />
      </div>

      <button
        onClick={onGenerate}
        disabled={!canGenerate}
        className="mt-auto w-full rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isGenerating ? "Generating…" : "✦ Generate"}
      </button>
      <p className="-mt-3 text-center text-[11px] text-zinc-600">⌘/Ctrl + Enter</p>
    </div>
  );
}
