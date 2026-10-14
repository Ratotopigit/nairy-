"""
Color remapping script to convert green branding in logo PNGs to Bright Blue & White theme.
- Primary brand blue: #3478F6 (for bright green text 'Stack' and upper tile of the icon)
- Deeper accent blue: #1D4F91 / #2563EB (for bottom darker tile and shadows of the icon)
- Preserves dark text 'Webinar' and 'AI', slate subtitle, white play button, and alpha channel intact.
"""

import os
import numpy as np
from PIL import Image

def transform_logo(src_path: str, dst_path: str):
    print(f"Transforming {src_path} -> {dst_path}...")
    img = Image.open(src_path).convert('RGBA')
    arr = np.array(img, dtype=np.float32)
    h_img, w_img, _ = arr.shape
    
    out = arr.copy()
    
    alpha = arr[:, :, 3]
    mask_active = alpha > 0
    
    # Restrict to Icon (x <= 515) and Stack (1430 <= x <= 2045, y <= 440)
    # This guarantees Webinar (547-1425), AI (2050-2126), and Subtitle (y >= 480) are 100% untouched.
    region_mask = np.zeros((h_img, w_img), dtype=bool)
    region_mask[:, :516] = True
    region_mask[:440, 1430:2045] = True
    
    work_mask = mask_active & region_mask
    ys, xs = np.where(work_mask)
    
    r = arr[ys, xs, 0] / 255.0
    g = arr[ys, xs, 1] / 255.0
    b = arr[ys, xs, 2] / 255.0
    
    # Vectorized RGB to HSV
    cmax = np.maximum(np.maximum(r, g), b)
    cmin = np.minimum(np.minimum(r, g), b)
    delta = cmax - cmin
    
    h = np.zeros_like(r)
    d_mask = delta > 1e-6
    
    r_mask = d_mask & (r == cmax)
    h[r_mask] = (60.0 * ((g[r_mask] - b[r_mask]) / delta[r_mask]) + 360.0) % 360.0
    
    g_mask = d_mask & (g == cmax) & (~r_mask)
    h[g_mask] = (60.0 * ((b[g_mask] - r[g_mask]) / delta[g_mask]) + 120.0) % 360.0
    
    b_mask = d_mask & (b == cmax) & (~r_mask) & (~g_mask)
    h[b_mask] = (60.0 * ((r[b_mask] - g[b_mask]) / delta[b_mask]) + 240.0) % 360.0
    
    s = np.zeros_like(r)
    s[cmax > 1e-6] = delta[cmax > 1e-6] / cmax[cmax > 1e-6]
    v = cmax
    
    # Filter green hues: 100 to 185
    # Smooth weight based on hue to avoid hard step artifacts
    w_h = np.clip((h - 100.0) / 15.0, 0.0, 1.0) * np.clip((185.0 - h) / 10.0, 0.0, 1.0)
    
    # Smooth weight based on saturation to keep the white play button pristine
    w_s = np.clip((s - 0.03) / 0.05, 0.0, 1.0)
    
    weight = w_h * w_s
    
    # Compute new H, S, V:
    # 1. Hue:
    # Orig green text & upper tile (H ~ 159°) -> 219° (#3478F6)
    # Orig lower tile (H ~ 168°) -> 214.1° (#1D4F91)
    h_new_deg = np.interp(h, [120.0, 159.0, 168.0, 185.0], [220.0, 219.0, 214.14, 214.0])
    h_new = (h_new_deg / 360.0) % 1.0
    
    # 2. Value:
    # Orig lower tile (v ~ 0.282) -> 0.569 (#1D4F91)
    # Orig Stack text (v ~ 0.651) -> 0.965 (#3478F6)
    # Orig upper tile highlight (v ~ 0.80) -> 0.985
    # White (v = 1.0) -> 1.0
    v_new = np.interp(v, [0.0, 0.282, 0.651, 0.80, 1.0], [0.0, 0.569, 0.965, 0.985, 1.0])
    
    # 3. Saturation:
    # Stack text (s ~ 0.928) -> 0.789 (#3478F6)
    # Lower tile (s ~ 0.805) -> 0.800 (#1D4F91)
    s_factor = np.interp(v, [0.0, 0.282, 0.651, 1.0], [0.95, 0.800 / 0.805, 0.789 / 0.928, 0.75])
    s_new = np.clip(s * s_factor, 0.0, 1.0)
    
    # Convert new HSV to RGB
    hi = np.floor(h_new * 6.0).astype(int) % 6
    f = (h_new * 6.0) - np.floor(h_new * 6.0)
    p = v_new * (1.0 - s_new)
    q = v_new * (1.0 - f * s_new)
    t = v_new * (1.0 - (1.0 - f) * s_new)
    
    nr = np.zeros_like(r)
    ng = np.zeros_like(g)
    nb = np.zeros_like(b)
    
    nr[hi == 0] = v_new[hi == 0]; ng[hi == 0] = t[hi == 0];     nb[hi == 0] = p[hi == 0]
    nr[hi == 1] = q[hi == 1];     ng[hi == 1] = v_new[hi == 1]; nb[hi == 1] = p[hi == 1]
    nr[hi == 2] = p[hi == 2];     ng[hi == 2] = v_new[hi == 2]; nb[hi == 2] = t[hi == 2]
    nr[hi == 3] = p[hi == 3];     ng[hi == 3] = q[hi == 3];     nb[hi == 3] = v_new[hi == 3]
    nr[hi == 4] = t[hi == 4];     ng[hi == 4] = p[hi == 4];     nb[hi == 4] = v_new[hi == 4]
    nr[hi == 5] = v_new[hi == 5]; ng[hi == 5] = p[hi == 5];     nb[hi == 5] = q[hi == 5]
    
    final_r = (1.0 - weight) * r + weight * nr
    final_g = (1.0 - weight) * g + weight * ng
    final_b = (1.0 - weight) * b + weight * nb
    
    out[ys, xs, 0] = np.clip(final_r * 255.0, 0, 255)
    out[ys, xs, 1] = np.clip(final_g * 255.0, 0, 255)
    out[ys, xs, 2] = np.clip(final_b * 255.0, 0, 255)
    # Alpha channel remains 100% bit-for-bit identical
    
    res = Image.fromarray(out.astype(np.uint8), mode='RGBA')
    res.save(dst_path, format='PNG')
    print(f"Successfully saved {dst_path} (size: {res.size})")

if __name__ == '__main__':
    targets = [
        ('public/assets/webinarstackai-logo.png', 'public/assets/webinarstackai-logo.png'),
        ('public/assets/webinarkit-logo.png', 'public/assets/webinarkit-logo.png')
    ]
    for src, dst in targets:
        transform_logo(src, dst)
