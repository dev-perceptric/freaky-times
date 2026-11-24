# Make both figures one color: plum body -> coral, peach faces -> coral, cream outline where the two bodies meet.
import sys, numpy as np
from PIL import Image, ImageFilter
CORAL = np.array([255, 107, 107], float); CREAM = np.array([255, 246, 236], float)
def hsv(a):
    r, g, b = a[..., 0] / 255, a[..., 1] / 255, a[..., 2] / 255
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b); d = mx - mn + 1e-9
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 0, d / (mx + 1e-9), 0); return h, s, mx
def dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r: out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out
def grow(seed, allowed, step=3, maxit=200):
    cur = seed & allowed
    for _ in range(maxit):
        nxt = dilate(cur, step) & allowed
        if nxt.sum() == cur.sum(): break
        cur = nxt
    return cur
def run(src, dst, size=None, keep_ink=False):
    im = Image.open(src).convert('RGB'); W0, H0 = im.size
    im = im.resize((W0 * 2, H0 * 2), Image.LANCZOS)  # work at 2x for smooth edges
    a = np.asarray(im).astype(float); h, s, v = hsv(a)
    L = a @ np.array([0.299, 0.587, 0.114])
    ink = v < 0.30
    plum_core = (h > 250) & (h < 320) & (s > 0.30) & (v >= 0.30) & (v < 0.75)
    coral_core = ((h < 15) | (h > 345)) & (s > 0.35) & (v > 0.75)
    face_core = (h > 14) & (h < 36) & (s > 0.12) & (s < 0.40) & (v > 0.85)
    # faces: peach blobs that touch hair (grow through the whole oval, never into the cream background)
    near_fig = dilate(ink | plum_core | coral_core, 6)
    face = grow(face_core & dilate(ink, 6), face_core)
    hair = grow(ink & dilate(face, 8), ink, step=2)
    shadow = (ink & ~hair & dilate(plum_core | coral_core, 3)) if not keep_ink else np.zeros_like(ink)
    shadow = grow(shadow, ink & ~hair, step=2)
    # soft edges: purple-tinted pixels next to plum get a coral blend by darkness
    plum_ring = dilate(plum_core, 4) & (h > 240) & (h < 340) & (s > 0.06) & ~ink
    out = a.copy()
    alpha = np.clip((L.max() - L) / (L.max() - 67.0), 0, 1)[..., None]  # 67 = plum luminance
    bg = CREAM
    out[plum_ring] = (CORAL * alpha + bg * (1 - alpha))[plum_ring]
    out[plum_core] = CORAL
    face_ring = dilate(face, 3) & (h > 12) & (h < 40) & (s > 0.06) & (v > 0.75) & ~coral_core
    out[face_ring | face] = CORAL
    out[shadow] = np.array([214, 82, 86], float)  # far-side limb shade: darker coral
    # cream outline where the two bodies meet
    seam = dilate(plum_core, 5) & dilate(coral_core, 5) & ~ink
    seam = dilate(seam & (plum_core | coral_core), 2)
    out[seam] = CREAM
    res = Image.fromarray(out.clip(0, 255).astype('uint8')).filter(ImageFilter.SMOOTH)
    res = res.resize(size or (W0, H0), Image.LANCZOS); res.save(dst)
if __name__ == '__main__':
    run(sys.argv[1], sys.argv[2], keep_ink=('strap' in sys.argv[1]))
