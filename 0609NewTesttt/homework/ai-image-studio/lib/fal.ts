// Thin REST wrapper around the fal.ai Queue API.
// Docs: https://fal.ai/docs/model-apis/model-endpoints/queue
//
// Flow:
//   submit()   POST  https://queue.fal.run/{model}          -> { request_id, status_url, response_url }
//   getStatus()  GET  {status_url}                           -> { status: IN_QUEUE | IN_PROGRESS | COMPLETED }
//   getResult()  GET  {response_url}                         -> { images: [{ url, ... }] }
//
// We use the async queue (not synchronous) so a single HTTP request never
// blocks long enough to hit a serverless function timeout.

const QUEUE_BASE = "https://queue.fal.run";

function falKey(): string {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is not set. Add it to .env.local.");
  return key;
}

export function falModel(): string {
  return process.env.FAL_MODEL || "fal-ai/flux/dev";
}

export interface FalSubmitResult {
  request_id: string;
  status_url: string;
  response_url: string;
  cancel_url?: string;
}

export interface FalImageOutput {
  images: { url: string; width: number; height: number; content_type?: string }[];
  seed?: number;
  has_nsfw_concepts?: boolean[];
}

export interface FalGenerateInput {
  prompt: string;
  image_size: string;
  // flux/dev ignores negative_prompt; we still pass it so swapping to a
  // CFG-capable model (which fal does offer) makes it effective with no code change.
  negative_prompt?: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  num_images?: number;
  enable_safety_checker?: boolean;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Key ${falKey()}`,
    "Content-Type": "application/json",
  };
}

export async function submitGeneration(input: FalGenerateInput): Promise<FalSubmitResult> {
  const res = await fetch(`${QUEUE_BASE}/${falModel()}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`fal submit failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  return (await res.json()) as FalSubmitResult;
}

type FalStatus = "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";

export async function getStatus(statusUrl: string): Promise<FalStatus> {
  const res = await fetch(statusUrl, { headers: authHeaders(), cache: "no-store" });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`fal status failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as { status: FalStatus };
  return data.status;
}

export async function getResult(responseUrl: string): Promise<FalImageOutput> {
  const res = await fetch(responseUrl, { headers: authHeaders(), cache: "no-store" });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`fal result failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  return (await res.json()) as FalImageOutput;
}

// NOTE: We do NOT reconstruct the status/response URLs from the model id —
// fal collapses the model path (e.g. `fal-ai/flux/dev` → `fal-ai/flux`) in the
// requests path, so a hand-built URL would 404. Always use the `status_url` /
// `response_url` returned by submitGeneration() and persisted on the row.
