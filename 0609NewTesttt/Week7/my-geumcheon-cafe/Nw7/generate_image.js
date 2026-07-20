import "dotenv/config";
import { fal } from "@fal-ai/client";
import fs from "node:fs";
import path from "node:path";

fal.config({ credentials: process.env.FAL_KEY });

const prompt =
  process.argv[2] ||
  "A futuristic cityscape at dusk, with neon lights and flying cars";

const result = await fal.subscribe("fal-ai/flux/dev", {
  input: {
    prompt,
    image_size: "landscape_16_9",
    num_inference_steps: 28,
    guidance_scale: 3.5,
  },
});

const image = result.data.images[0];
console.log(image.url);

const outputDir = path.join(import.meta.dirname, "output");
fs.mkdirSync(outputDir, { recursive: true });

const res = await fetch(image.url);
const buffer = Buffer.from(await res.arrayBuffer());
const dest = path.join(outputDir, `flux-dev-${Date.now()}.png`);
fs.writeFileSync(dest, buffer);
console.log(`saved: ${dest}`);
