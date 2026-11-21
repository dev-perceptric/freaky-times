"""Make lifestyle photos with GPT Image 2.5 Sunburst (edit mode) on fal.ai.

Usage:
  python3 scripts/sunburst.py <out_name> "<prompt>" <reference_url> [<reference_url> ...]
Options via env: QUALITY (default high), SIZE (default portrait_4_3), N (default 1).
Auth: FAL_KEY env var, or a proxy that injects the key for fal.run.
Saves to generated/<out_name>-<n>.jpg
"""
import base64
import json
import os
import sys
import time
import urllib.request

ENDPOINT = "https://fal.run/openai/gpt-image-2.5/sunburst/edit"


def as_url(ref):
    """Local files are sent inline as data URIs; URLs pass through."""
    if os.path.exists(ref):
        kind = "png" if ref.endswith(".png") else "jpeg"
        return f"data:image/{kind};base64," + base64.b64encode(open(ref, "rb").read()).decode()
    return ref


def main():
    name, prompt, refs = sys.argv[1], sys.argv[2], [as_url(r) for r in sys.argv[3:]]
    body = {
        "prompt": prompt,
        "image_urls": refs,
        "quality": os.environ.get("QUALITY", "high"),
        "image_size": os.environ.get("SIZE", "portrait_4_3"),
        "num_images": int(os.environ.get("N", "1")),
        "output_format": "jpeg",
    }
    req = urllib.request.Request(ENDPOINT, data=json.dumps(body).encode(), method="POST")
    req.add_header("Content-Type", "application/json")
    if os.environ.get("FAL_KEY"):
        req.add_header("Authorization", f"Key {os.environ['FAL_KEY']}")
    t = time.time()
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            out = json.load(r)
    except urllib.error.HTTPError as e:
        raise SystemExit(f"fal error {e.code}: {e.read().decode(errors='replace')[:600]}")
    os.makedirs("generated", exist_ok=True)
    for i, img in enumerate(out.get("images", []), 1):
        path = f"generated/{name}-{i}.jpg"
        urllib.request.urlretrieve(img["url"], path)
        print(f"saved {path} ({img.get('width')}x{img.get('height')}) in {time.time() - t:.0f}s")


if __name__ == "__main__":
    main()
