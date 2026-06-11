"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PromptComposer from "./PromptComposer";
import ResultPanel from "./ResultPanel";
import { DEFAULT_ASPECT, DEFAULT_STYLE } from "@/lib/constants";
import type { Generation, GenerateResponse, GenerationStatus, StatusResponse } from "@/lib/types";

const POLL_MS = 1500;
const MAX_POLLS = 120; // ~3 minutes safety cap

export default function Studio({ initialHistory }: { initialHistory: Generation[] }) {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [style, setStyle] = useState<string>(DEFAULT_STYLE);
  const [aspectRatio, setAspectRatio] = useState<string>(DEFAULT_ASPECT);

  const [status, setStatus] = useState<GenerationStatus | null>(null);
  const [result, setResult] = useState<Generation | null>(initialHistory[0] ?? null);
  const [history, setHistory] = useState<Generation[]>(initialHistory.slice(1));
  const [error, setError] = useState<string | null>(null);

  const cancelled = useRef(false);
  useEffect(() => {
    return () => {
      cancelled.current = true;
    };
  }, []);

  const poll = useCallback(
    async (id: string) => {
      for (let i = 0; i < MAX_POLLS; i++) {
        if (cancelled.current) return;
        await new Promise((r) => setTimeout(r, POLL_MS));
        if (cancelled.current) return;

        const res = await fetch(`/api/status?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        const data = (await res.json()) as StatusResponse & { error?: string };

        if (!res.ok) {
          setError(data.error || "Status check failed");
          setStatus("failed");
          return;
        }
        if (data.status === "failed") {
          setError(data.error || "Generation failed");
          setStatus("failed");
          return;
        }
        if (data.status === "completed" && data.imageUrl) {
          const gen: Generation = {
            id: data.id,
            user_id: "",
            prompt,
            negative_prompt: negativePrompt || null,
            style,
            aspect_ratio: aspectRatio,
            model: "",
            fal_request_id: null,
            fal_status_url: null,
            fal_response_url: null,
            image_path: null,
            image_url: data.imageUrl,
            status: "completed",
            error: null,
            created_at: new Date().toISOString(),
          };
          // Move the previous featured image into the recent strip.
          setResult((prev) => {
            if (prev) setHistory((h) => [prev, ...h].slice(0, 12));
            return gen;
          });
          setStatus("completed");
          return;
        }
        setStatus("processing");
      }
      setError("Timed out waiting for the image.");
      setStatus("failed");
    },
    [prompt, negativePrompt, style, aspectRatio]
  );

  const onGenerate = useCallback(async () => {
    if (prompt.trim().length < 2 || status === "processing" || status === "pending") return;
    setError(null);
    setStatus("pending");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, negativePrompt, style, aspectRatio }),
      });
      const data = (await res.json()) as GenerateResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to start generation");
      await poll(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate");
      setStatus("failed");
    }
  }, [prompt, negativePrompt, style, aspectRatio, status, poll]);

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[380px_1fr]">
      <section className="border-b border-white/5 lg:border-b-0 lg:border-r">
        <PromptComposer
          prompt={prompt}
          setPrompt={setPrompt}
          negativePrompt={negativePrompt}
          setNegativePrompt={setNegativePrompt}
          style={style}
          setStyle={setStyle}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          onGenerate={onGenerate}
          isGenerating={status === "pending" || status === "processing"}
        />
      </section>
      <section className="min-h-0">
        <ResultPanel
          status={status}
          result={result}
          history={history}
          error={error}
          aspectRatio={aspectRatio}
        />
      </section>
    </div>
  );
}
