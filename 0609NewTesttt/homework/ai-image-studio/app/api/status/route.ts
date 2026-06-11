import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResult, getStatus } from "@/lib/fal";
import type { Generation, StatusResponse } from "@/lib/types";

export const runtime = "nodejs";

const BUCKET = "generations";

// GET /api/status?id=<generation id>
// Polls fal for the job tied to this row. On completion it downloads the image,
// stores it in Supabase Storage (fal URLs expire), updates the row, and returns
// the persisted public URL.
export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // RLS ensures the row belongs to this user.
  const { data: row, error } = await supabase
    .from("generations")
    .select("*")
    .eq("id", id)
    .single<Generation>();

  if (error || !row) {
    return NextResponse.json({ error: "Generation not found" }, { status: 404 });
  }

  // Terminal states: just echo back.
  if (row.status === "completed" || row.status === "failed") {
    return NextResponse.json(reply(row));
  }
  if (!row.fal_status_url || !row.fal_response_url) {
    return NextResponse.json({ error: "Generation has no fal URLs" }, { status: 500 });
  }

  try {
    const status = await getStatus(row.fal_status_url);

    if (status !== "COMPLETED") {
      // Still IN_QUEUE / IN_PROGRESS.
      return NextResponse.json(reply({ ...row, status: "processing" }));
    }

    const result = await getResult(row.fal_response_url);
    const imageUrl = result.images?.[0]?.url;
    if (!imageUrl) throw new Error("fal returned no image");

    // Download the rendered image and persist it to Storage.
    const imgRes = await fetch(imageUrl, { cache: "no-store" });
    if (!imgRes.ok) throw new Error(`Failed to fetch generated image (${imgRes.status})`);
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const bytes = new Uint8Array(await imgRes.arrayBuffer());

    const path = `${user.id}/${row.id}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType, upsert: true });
    if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { data: updated, error: updErr } = await supabase
      .from("generations")
      .update({ status: "completed", image_path: path, image_url: pub.publicUrl, error: null })
      .eq("id", row.id)
      .select("*")
      .single<Generation>();
    if (updErr || !updated) throw new Error(updErr?.message || "Failed to update row");

    return NextResponse.json(reply(updated));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    await supabase.from("generations").update({ status: "failed", error: message }).eq("id", row.id);
    return NextResponse.json(reply({ ...row, status: "failed", error: message }));
  }
}

function reply(row: Generation): StatusResponse {
  return { id: row.id, status: row.status, imageUrl: row.image_url, error: row.error };
}
