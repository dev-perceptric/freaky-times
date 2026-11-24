# FreakyTimes image kit (for a Claude Code session on the Mac with ComfyUI)

Goal: make the 31 images in `targets.csv` with the local ComfyUI, check every one, and publish them to the blog.

## What the images look like
- Look at `style-anchor.png` (raw output) and `example-final-cowgirl.png` (after `recolor.py`). Every new drawing must match.
- Full rules: `style-guide.md`. Short version: flat vector illustration, smooth rounded faceless figures, mitten hands, plain cream `#FFF6EC` background, one simple lavender piece of furniture, no text, nothing explicit (no genitals, no nipples).
- Render each position drawing with the **front figure coral `#FF6B6B`** and the **back figure plum `#5B2A86`**, blank pale peach face ovals, ink `#2B1B3D` hair. Then run `recolor.py`, which makes both people the same coral, matches the faces, and adds the cream line where bodies meet.
- Bodies: slender, toned, graceful **adults** (fashion-illustration proportions). Plus-size rows use plus-size adults. Two-women rows use two women. Strap-on rows: the wearer has a simple ink harness drawn as smooth straps, toy hidden by the angle.

## Hard safety rules (no exceptions)
- Every figure must be an unmistakable adult: adult height, adult head-to-body ratio, adult face and body shape. **Reject any image where anyone could look like a child or teen**, even slightly (small body next to a big one, big round head, childish clothes, childish face). Do not publish it, delete it.
- Negative prompt always includes: `child, children, kid, teen, teenager, young, minor, loli, shota, schoolgirl, school uniform, small body, childlike, baby face`.
- No real people, no celebrity likeness, no text, no logos.
- Heroes show clothed adults or abstract shapes only, never a sex pose.

## How to drive ComfyUI
- ComfyUI's API is at `http://127.0.0.1:8188` (check the port in the app). Use `GET /object_info` to list installed checkpoints, LoRAs and ControlNet models; `POST /prompt` with an API-format workflow; poll `GET /history/<prompt_id>`; download with `GET /view?filename=...&type=output`.
- Use an SDXL-family checkpoint that does clean flat vector art. A flat illustration / vector style LoRA helps a lot.
- **Exact poses:** use ControlNet OpenPose (SDXL, e.g. xinsir openpose). For each row, draw an OpenPose skeleton image (18-keypoint COCO format, standard OpenPose colors, black background) that matches the `pose` text: two skeletons for two people, placed exactly as described. Strength around 0.8–1.0. If the OpenPose ControlNet or `comfyui_controlnet_aux` is not installed, **ask Vincent before installing anything**.
- Square 1024x1024 for position drawings, 1344x768 for heroes. 25–30 steps, CFG 5–7. Generate 4 per row and keep the best.
- Prompt = the master prompt in `style-guide.md` section 7 with the row's `pose` and the right body text. For tag-based models, add short tags too (`flat vector illustration, minimal, faceless, cream background, side view`).

## Check every image (do not skip)
Open each candidate and confirm all of these before keeping it:
1. Pose matches the `pose` text (who is on top, which way they face, what touches what).
2. Correct number of heads, arms and legs.
3. **Both people clearly adults** (see safety rules).
4. Nothing explicit, no text, no extra objects or toys that aren't in the pose.
5. Style matches `example-final-cowgirl.png` after recolor.
If it fails, regenerate. If a row still fails after ~8 tries, skip it and list it at the end.

## Publish
1. Position drawings: `python3 ops/image-kit/recolor.py raw.png final.png` (keep `strap` in the name of strap-on files so the harness stays ink).
2. Save as WebP, quality 82: position drawings 1200x1200, heroes 1600x900 (heroes are NOT recolored). Use the exact `file` name from `targets.csv`.
3. Put them in `public/blog/images/`.
4. `pip install markdown && python3 scripts/blog_build.py` (articles pick up the new images automatically; missing ones stay hidden).
5. `npm run build` must pass.
6. Commit only the new images plus `lib/blog-posts.json`, push to `main`. GitHub builds the image and the OVH server deploys it within ~5 minutes.
7. Report which rows were published and which were skipped.
