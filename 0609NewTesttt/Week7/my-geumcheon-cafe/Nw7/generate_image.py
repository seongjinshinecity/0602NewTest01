import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

import fal_client

PRESETS = {
    "coffee-hero": (
        "professional product photography of a takeaway specialty coffee cup "
        "on a modern minimal counter, warm morning light, steam rising, "
        "Gasan Digital Complex office district vibe, clean beige and wood tones, "
        "shallow depth of field, editorial style"
    ),
    "dessert-box": (
        "professional product photography of a premium 3pm dessert gift box "
        "for office B2B delivery, opened box showing assorted pastries and mini desserts, "
        "flat lay on a wooden meeting room table, soft natural light, appetizing, high-end catalog style"
    ),
    "instagram-post": (
        "Instagram feed style photo of a small specialty coffee bar storefront "
        "named '여덟 시 반', morning rush hour, office workers picking up pre-ordered takeaway coffee, "
        "warm inviting atmosphere, natural light, lifestyle photography"
    ),
    "menu-flatlay": (
        "flat lay photography of a minimal cafe menu board with specialty coffee and pastries, "
        "clean typography, beige and wood color palette, soft shadows, top-down shot"
    ),
}

DEFAULT_MODEL = "fal-ai/flux/dev"


def on_queue_update(update):
    if isinstance(update, fal_client.InProgress):
        for log in update.logs:
            print(f"  {log['message']}")


def generate(prompt: str, model: str, output_dir: Path, count: int, label: str) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    result = fal_client.subscribe(
        model,
        arguments={
            "prompt": prompt,
            "num_images": count,
            "image_size": "square_hd",
        },
        with_logs=True,
        on_queue_update=on_queue_update,
    )

    import time
    import urllib.request

    timestamp = int(time.time())

    for i, image in enumerate(result["images"]):
        url = image["url"]
        ext = url.split(".")[-1].split("?")[0]
        if len(ext) > 4:
            ext = "png"
        dest = output_dir / f"{label}_{timestamp}_{i}.{ext}"

        urllib.request.urlretrieve(url, dest)
        print(f"saved: {dest}")


def main():
    parser = argparse.ArgumentParser(description="Generate cafe marketing/menu images via fal.ai")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--prompt", help="free-form prompt text")
    group.add_argument("--preset", choices=PRESETS.keys(), help="use a preset cafe prompt")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"fal.ai model endpoint (default: {DEFAULT_MODEL})")
    parser.add_argument("--count", type=int, default=1, help="number of images to generate")
    parser.add_argument("--output", default="output", help="output directory (relative to this script)")
    args = parser.parse_args()

    if not os.environ.get("FAL_KEY") or os.environ["FAL_KEY"] == "your_fal_key_here":
        print("FAL_KEY가 설정되지 않았습니다. .env 파일에 실제 fal.ai API 키를 넣어주세요.", file=sys.stderr)
        sys.exit(1)

    prompt = args.prompt or PRESETS[args.preset]
    label = args.preset or "custom"
    output_dir = Path(__file__).parent / args.output

    print(f"prompt: {prompt}")
    generate(prompt, args.model, output_dir, args.count, label)


if __name__ == "__main__":
    main()
