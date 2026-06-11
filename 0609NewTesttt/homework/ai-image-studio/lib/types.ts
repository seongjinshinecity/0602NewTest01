// Row shape of the `generations` table (see supabase/schema.sql).
export type GenerationStatus = "pending" | "processing" | "completed" | "failed";

export interface Generation {
  id: string;
  user_id: string;
  prompt: string;
  negative_prompt: string | null;
  style: string;
  aspect_ratio: string;
  model: string;
  fal_request_id: string | null;
  fal_status_url: string | null;
  fal_response_url: string | null;
  image_path: string | null;
  image_url: string | null;
  status: GenerationStatus;
  error: string | null;
  created_at: string;
}

// POST /api/generate request body
export interface GenerateRequest {
  prompt: string;
  negativePrompt?: string;
  style: string;
  aspectRatio: string;
}

// POST /api/generate response
export interface GenerateResponse {
  id: string;
  requestId: string;
}

// GET /api/status response
export interface StatusResponse {
  id: string;
  status: GenerationStatus;
  imageUrl: string | null;
  error: string | null;
}
