/**
 * Small colour toolkit for the registration page theme. Pure functions, no
 * dependencies, so the palette maths can be unit-tested and every template
 * (and every host-chosen colour) goes through the same contrast checks.
 */

export function isHex(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function parseHex(hex: string): [number, number, number] {
  const h = isHex(hex) ? hex : "#000000";
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

export function toHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** `amount` of `b` mixed into `a` (0 = a, 1 = b). */
export function mix(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return toHex(ar + (br - ar) * amount, ag + (bg - ag) * amount, ab + (bb - ab) * amount);
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * White or a warm near-black, whichever reads better on `bg`. If neither
 * reaches 4.5 (only possible on mid-tones), pure black or white is used,
 * which always does: the worst case on any background is about 4.58.
 */
export function readableInk(bg: string, light = "#ffffff", dark = "#14110f"): string {
  const best = contrast(bg, light) >= contrast(bg, dark) ? light : dark;
  if (contrast(bg, best) >= 4.5) return best;
  return contrast(bg, "#ffffff") >= contrast(bg, "#000000") ? "#ffffff" : "#000000";
}

export function isDark(hex: string): boolean {
  return luminance(hex) < 0.22;
}

/**
 * Nudges `fg` toward black or white until it meets `min` contrast on every
 * background given, keeping the hue as long as possible. The target is
 * lowered to the best any colour can achieve on those backgrounds, so a
 * mid-tone page can't be asked for the impossible.
 */
export function ensureContrast(fg: string, backgrounds: string | string[], min = 4.5): string {
  const bgs = Array.isArray(backgrounds) ? backgrounds : [backgrounds];
  const worst = (c: string) => Math.min(...bgs.map((b) => contrast(c, b)));
  const endpoint = worst("#000000") >= worst("#ffffff") ? "#000000" : "#ffffff";
  const goal = Math.min(min, worst(endpoint));
  if (worst(fg) >= goal) return fg;
  for (let step = 1; step <= 24; step += 1) {
    const candidate = mix(fg, endpoint, step / 24);
    if (worst(candidate) >= goal) return candidate;
  }
  return endpoint;
}

/** Darkens `color` until white text on it reaches `min` contrast. */
export function darkenForWhite(color: string, min = 6): string {
  for (let step = 0; step <= 20; step += 1) {
    const candidate = mix(color, "#000000", step / 20);
    if (contrast("#ffffff", candidate) >= min) return candidate;
  }
  return "#000000";
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
