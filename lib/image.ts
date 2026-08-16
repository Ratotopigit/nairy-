/** Client-side image utilities: background cleanup + brand palette extraction. */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function toCanvas(img: HTMLImageElement, max = 1024) {
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * scale));
  c.height = Math.max(1, Math.round(img.height * scale));
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return { canvas: c, ctx };
}

/**
 * Removes a flat background (white/near-uniform corners) via a tolerance
 * flood fill from the image edges. Good enough for logos and product cutouts.
 */
export async function removeBackground(src: string, tolerance = 34): Promise<string> {
  try {
    const img = await loadImage(src);
    const { canvas, ctx } = toCanvas(img);
    const { width: w, height: h } = canvas;
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;

    const at = (x: number, y: number) => (y * w + x) * 4;
    const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
    const bg = corners.reduce(
      (acc, i) => [acc[0] + px[i]!, acc[1] + px[i + 1]!, acc[2] + px[i + 2]!] as [number, number, number],
      [0, 0, 0] as [number, number, number],
    ).map((v) => v / corners.length) as [number, number, number];

    const near = (i: number) =>
      Math.abs(px[i]! - bg[0]) + Math.abs(px[i + 1]! - bg[1]) + Math.abs(px[i + 2]! - bg[2]) <
      tolerance * 3;

    const seen = new Uint8Array(w * h);
    const stack: number[] = [];
    for (let x = 0; x < w; x++) {
      stack.push(x, x + (h - 1) * w);
    }
    for (let y = 0; y < h; y++) {
      stack.push(y * w, y * w + w - 1);
    }

    while (stack.length) {
      const p = stack.pop()!;
      if (p < 0 || p >= w * h || seen[p]) continue;
      const i = p * 4;
      if (!near(i)) continue;
      seen[p] = 1;
      px[i + 3] = 0;
      const x = p % w;
      const y = (p / w) | 0;
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
      if (y > 0) stack.push(p - w);
      if (y < h - 1) stack.push(p + w);
    }

    ctx.putImageData(data, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return src;
  }
}

type RGB = [number, number, number];

const hex = ([r, g, b]: RGB) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

function luma([r, g, b]: RGB) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function sat([r, g, b]: RGB) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
}

function mix(c: RGB, target: RGB, t: number): RGB {
  return [
    c[0] + (target[0] - c[0]) * t,
    c[1] + (target[1] - c[1]) * t,
    c[2] + (target[2] - c[2]) * t,
  ];
}

export type ExtractedPalette = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
};

/** Pulls a usable brand palette out of an uploaded logo or image. */
export async function extractPalette(src: string): Promise<ExtractedPalette | null> {
  try {
    const img = await loadImage(src);
    const { canvas, ctx } = toCanvas(img, 160);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const buckets = new Map<string, { sum: RGB; n: number }>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3]! < 128) continue;
      const c: RGB = [data[i]!, data[i + 1]!, data[i + 2]!];
      const l = luma(c);
      if (l > 0.94 || l < 0.05) continue;
      const key = c.map((v) => Math.round(v / 24)).join(",");
      const b = buckets.get(key) ?? { sum: [0, 0, 0] as RGB, n: 0 };
      b.sum = [b.sum[0] + c[0], b.sum[1] + c[1], b.sum[2] + c[2]];
      b.n += 1;
      buckets.set(key, b);
    }
    if (!buckets.size) return null;

    const ranked = [...buckets.values()]
      .map((b) => ({ c: b.sum.map((v) => v / b.n) as RGB, n: b.n }))
      .sort((a, b) => b.n * (0.4 + sat(b.c)) - a.n * (0.4 + sat(a.c)));

    const primary = ranked[0]!.c;
    const secondary = ranked.find((r) => Math.abs(luma(r.c) - luma(primary)) > 0.12)?.c
      ?? mix(primary, [255, 255, 255], 0.42);
    const accent = mix(primary, [0, 0, 0], 0.34);
    const background = mix(primary, [255, 255, 255], 0.94);

    return {
      primary: hex(primary),
      secondary: hex(secondary),
      accent: hex(accent),
      background: hex(background),
    };
  } catch {
    return null;
  }
}
