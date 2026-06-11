import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitGeneration, falModel } from "@/lib/fal";
import { falImageSize, styleModifiers } from "@/lib/constants";
import type { GenerateRequest } from "@/lib/types";

export const runtime = "nodejs";

// POST /api/generate — submit a generation job to the fal queue.
// Returns immediately with { id, requestId }; the client then polls /api/status.
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: GenerateRequest;
  try {
    body = (await req.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = (body.prompt || "").trim();
  if (prompt.length < 2) {
    return NextResponse.json({ error: "Prompt is too short." }, { status: 400 });
  }
  if (prompt.length > 1500) {
    return NextResponse.json({ error: "Prompt is too long (max 1500 chars)." }, { status: 400 });
  }

  const style = body.style || "realistic";
  const aspectRatio = body.aspectRatio || "1:1";
  const negativePrompt = (body.negativePrompt || "").trim() || null;

  // Compose the final prompt: user text + style modifiers.
  const modifiers = styleModifiers(style);
  const finalPrompt = modifiers ? `${prompt}, ${modifiers}` : prompt;

  let requestId: string;
  let statusUrl: string;
  let responseUrl: string;
  try {
    const submit = await submitGeneration({
      prompt: finalPrompt,
      image_size: falImageSize(aspectRatio),
      negative_prompt: negativePrompt ?? undefined,
      num_images: 1,
      enable_safety_checker: true,
    });
    requestId = submit.request_id;
    statusUrl = submit.status_url;
    responseUrl = submit.response_url;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation submit failed" },
      { status: 502 }
    );
  }

  // Persist a row for history/gallery. RLS guarantees user_id = auth.uid().
  const { data: row, error } = await supabase
    .from("generations")
    .insert({
      user_id: user.id,
      prompt,
      negative_prompt: negativePrompt,
      style,
      aspect_ratio: aspectRatio,
      model: falModel(),
      fal_request_id: requestId,
      fal_status_url: statusUrl,
      fal_response_url: responseUrl,
      status: "processing",
    })
    .select("id")
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message || "Failed to save generation" },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: row.id, requestId });
}
