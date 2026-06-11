// Generation option catalogs — shared by UI and the API route.

export const ASPECT_RATIOS = [
  { id: "1:1", label: "Square", sub: "1:1", falSize: "square_hd", w: 1024, h: 1024 },
  { id: "16:9", label: "Landscape", sub: "16:9", falSize: "landscape_16_9", w: 1344, h: 768 },
  { id: "9:16", label: "Portrait", sub: "9:16", falSize: "portrait_16_9", w: 768, h: 1344 },
] as const;

export type AspectRatioId = (typeof ASPECT_RATIOS)[number]["id"];

// Each style appends descriptive modifiers to the user prompt.
export const STYLES = [
  {
    id: "realistic",
    label: "Realistic",
    emoji: "📷",
    modifiers: "photorealistic, ultra realistic, sharp focus, natural lighting, 8k, highly detailed",
  },
  {
    id: "anime",
    label: "Anime",
    emoji: "🎌",
    modifiers: "anime style, cel shaded, vibrant colors, studio anime key visual, clean lineart",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    emoji: "🎬",
    modifiers: "cinematic lighting, dramatic composition, film grain, depth of field, color graded, 35mm",
  },
  {
    id: "fantasy",
    label: "Fantasy",
    emoji: "🧙",
    modifiers: "fantasy concept art, epic, ethereal atmosphere, magical, intricate detail, matte painting",
  },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];

export const DEFAULT_ASPECT: AspectRatioId = "1:1";
export const DEFAULT_STYLE: StyleId = "realistic";

export function styleModifiers(id: string): string {
  return STYLES.find((s) => s.id === id)?.modifiers ?? "";
}

export function falImageSize(aspectId: string): string {
  return ASPECT_RATIOS.find((a) => a.id === aspectId)?.falSize ?? "square_hd";
}
