import type { Palette, RatioId, Slide, StyleSpec } from "@/lib/deck";

const hex = (c: string) => c.replace("#", "").toUpperCase().slice(0, 6);

/** Map a CSS font stack to the closest PowerPoint-safe family name. */
function pptFont(stack: string) {
  const first = stack.split(",")[0]?.replace(/["']/g, "").trim() ?? "Inter";
  return first;
}

const DIMS: Record<RatioId, { w: number; h: number }> = {
  "16:9": { w: 13.333, h: 7.5 },
  "4:3": { w: 10, h: 7.5 },
  portrait: { w: 7.5, h: 10 },
  square: { w: 9, h: 9 },
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Same deterministic auto-fit rule as components/deck/SlideView.tsx: wrapped text
 * fills an area ~ len * size^2, so scale by sqrt(comfy / len), clamped to
 * [base * min, base]. Keeping the two in sync is what makes the export look like
 * the preview.
 *
 * pptxgenjs 4.0.1 exposes `fit: 'shrink'`, but its own typings note that neither
 * this library nor the OOXML flag can trigger PowerPoint's scale recalculation
 * until the user edits or resizes the shape. So we still size text ourselves and
 * use `fit: 'shrink'` purely as a belt-and-braces backstop.
 */
function fit(base: number, len: number, comfy: number, min = 0.6) {
  if (len <= comfy) return base;
  return base * clamp(Math.sqrt(comfy / Math.max(len, 1)), min, 1);
}

/** Extra shrink when a list carries more items than the layout budgets for. */
function countFit(base: number, count: number, comfy: number, min = 0.7) {
  if (count <= comfy) return base;
  return base * clamp(comfy / count, min, 1);
}

const longest = (xs: string[]) => xs.reduce((m, s) => Math.max(m, s.length), 0);

/** Vertical rhythm, in cqw, matching SlideView's RHYTHM. */
const RHYTHM = 1.8;

/** Estimated rendered height (inches) of a wrapped run. */
function textH(len: number, wIn: number, sizePt: number, lineHeight: number) {
  const perLine = Math.max(Math.floor((wIn * 72) / (sizePt * 0.5)), 1);
  const lines = Math.max(Math.ceil(Math.max(len, 1) / perLine), 1);
  return (lines * sizePt * lineHeight) / 72;
}

export async function exportPptx(opts: {
  slides: Slide[];
  palette: Palette;
  spec: StyleSpec;
  ratio: RatioId;
  image: string | null;
  logo: string | null;
  fileName?: string;
}) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  const dim = DIMS[opts.ratio];
  pptx.defineLayout({ name: "DECK", width: dim.w, height: dim.h });
  pptx.layout = "DECK";

  const head = pptFont(opts.spec.headingFont);
  const body = pptFont(opts.spec.bodyFont);

  const ink = hex(opts.palette.ink);
  const muted = hex(opts.palette.muted);
  const primary = hex(opts.palette.primary);
  const secondary = hex(opts.palette.secondary);
  const bg = hex(opts.palette.background);

  /** cqw (percent of slide width, as used on screen) -> inches. */
  const inch = (cqw: number) => (cqw / 100) * dim.w;
  /** cqw -> points, so exported type matches the preview's optical size. */
  const pt = (cqw: number) => Math.round(inch(cqw) * 72 * 10) / 10;

  const pad = inch(opts.spec.pad);
  const footerReserve = pad * 1.3;
  const contentW = dim.w - pad * 2;
  const contentH = dim.h - pad - footerReserve;
  const h1 = 5.4 * opts.spec.headingScale;

  /**
   * Zero the PowerPoint text-box inset so a box's x/y is where the glyphs start,
   * matching the CSS box model used on screen.
   */
  const BOX = { margin: 0, wrap: true, fit: "shrink" } as const;

  for (const s of opts.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: bg };

    const eyebrowText = s.eyebrow ? (opts.spec.uppercaseEyebrow ? s.eyebrow.toUpperCase() : s.eyebrow) : "";
    const bullets = Array.isArray(s.bullets) ? s.bullets.filter(Boolean) : [];
    const metrics = Array.isArray(s.metrics) ? s.metrics.filter(Boolean) : [];
    const chart = Array.isArray(s.chart) && s.chart.length ? s.chart : [];
    const rawImage = s.image ?? opts.image;
    /**
     * pptxgenjs only validates `data` when the file is written, not when the
     * image is added, so a remote URL that slipped through does not fail one
     * picture -- it throws from writeFile and takes the entire export down
     * with "Could not build the .pptx file". Art is normally inlined as a
     * data URI by resolveArtForExport first; if that did not happen, drop the
     * image and still produce a deck.
     */
    const slideImage = typeof rawImage === "string" && rawImage.startsWith("data:")
      ? rawImage
      : null;
    const slideKind = s.imageKind ?? "photo";
    const isTitle = s.type === "title" || s.type === "closing";

    /**
     * Draw the eyebrow / title / rule / body stack into a column, returning the
     * y after it. `topY` is the top of the stack; pass `align: "center"` to mirror
     * the centred on-screen title layouts.
     */
    const drawStack = (o: {
      x: number;
      y: number;
      w: number;
      titleCqw: number;
      titleComfy: number;
      bodyComfy: number;
      align: "left" | "center";
    }) => {
      let y = o.y;
      const gap = inch(RHYTHM);

      if (eyebrowText) {
        const size = pt(fit(1.15, eyebrowText.length, 34, 0.75));
        const h = textH(eyebrowText.length, o.w, size, 1.35);
        slide.addText(eyebrowText, {
          ...BOX,
          x: o.x,
          y,
          w: o.w,
          h,
          align: o.align,
          valign: "top",
          fontFace: body,
          fontSize: size,
          charSpacing: opts.spec.uppercaseEyebrow ? 2 : 0.4,
          color: primary,
        });
        y += h + gap;
      }

      if (s.title) {
        const size = pt(fit(o.titleCqw, s.title.length, o.titleComfy, 0.5));
        const h = textH(s.title.length, o.w, size, 1.1);
        slide.addText(s.title, {
          ...BOX,
          x: o.x,
          y,
          w: o.w,
          h,
          align: o.align,
          valign: "top",
          fontFace: head,
          fontSize: size,
          bold: opts.spec.headingWeight >= 600,
          lineSpacingMultiple: 1.1,
          color: ink,
        });
        y += h + gap;
      }

      if (opts.spec.rule) {
        const ruleW = inch(6);
        slide.addShape("rect", {
          x: o.align === "center" ? o.x + (o.w - ruleW) / 2 : o.x,
          y,
          w: ruleW,
          h: 0.028,
          fill: { color: primary },
          line: { type: "none" },
        });
        y += 0.028 + gap;
      }

      if (s.body) {
        const size = pt(fit(1.75, s.body.length, o.bodyComfy, 0.7));
        const h = textH(s.body.length, o.w, size, 1.55);
        slide.addText(s.body, {
          ...BOX,
          x: o.x,
          y,
          w: o.w,
          h,
          align: o.align,
          valign: "top",
          fontFace: body,
          fontSize: size,
          color: muted,
          lineSpacingMultiple: 1.55,
        });
        y += h + gap;
      }

      return y - o.y - gap;
    };

    /** Height the stack will take, so it can be vertically centred like on screen. */
    const stackH = (o: { w: number; titleCqw: number; titleComfy: number; bodyComfy: number }) => {
      const gap = inch(RHYTHM);
      let h = 0;
      if (eyebrowText) h += textH(eyebrowText.length, o.w, pt(fit(1.15, eyebrowText.length, 34, 0.75)), 1.35) + gap;
      if (s.title) h += textH(s.title.length, o.w, pt(fit(o.titleCqw, s.title.length, o.titleComfy, 0.5)), 1.1) + gap;
      if (opts.spec.rule) h += 0.028 + gap;
      if (s.body) h += textH(s.body.length, o.w, pt(fit(1.75, s.body.length, o.bodyComfy, 0.7)), 1.55) + gap;
      return Math.max(h - gap, 0);
    };

    // ---- Secondary column renderers (mirror SlideView's visual()) ----

    const drawChart = (x: number, y: number, w: number, h: number) => {
      if (!chart.length) return;
      const max = Math.max(...chart.map((v) => (Number.isFinite(v) ? Math.abs(v) : 0)), 1);
      const gap = inch(clamp(14 / chart.length, 0.5, 1.4));
      const barW = Math.max((w - gap * (chart.length - 1)) / chart.length, 0.05);
      chart.forEach((v, i) => {
        const ratio = clamp(((Number.isFinite(v) ? Math.abs(v) : 0) / max), 0.02, 1);
        const bh = h * ratio;
        slide.addShape("rect", {
          x: x + i * (barW + gap),
          y: y + h - bh,
          w: barW,
          h: bh,
          fill: { color: i % 2 ? secondary : primary },
          line: { type: "none" },
        });
      });
    };

    const drawBullets = (x: number, y: number, w: number, h: number) => {
      if (!bullets.length) return;
      const size = pt(countFit(fit(1.7, longest(bullets), 62, 0.65), bullets.length, 4, 0.7));
      slide.addText(
        bullets.map((b) => ({ text: b, options: { breakLine: true } })),
        {
          ...BOX,
          x,
          y,
          w,
          h,
          valign: "middle",
          fontFace: body,
          fontSize: size,
          color: ink,
          bullet: { type: "number" },
          lineSpacingMultiple: 1.45,
          paraSpaceAfter: size * 0.55,
        },
      );
    };

    const drawMetrics = (x: number, y: number, w: number, h: number) => {
      if (!metrics.length) return;
      const n = metrics.length;
      const cols = n <= 1 ? 1 : n === 3 ? 3 : 2;
      const rows = Math.ceil(n / cols);
      const gapX = inch(RHYTHM * 1.6);
      const gapY = inch(RHYTHM * 1.3);
      const cellW = (w - gapX * (cols - 1)) / cols;
      const valueSize = pt(countFit(fit(3.4, longest(metrics.map((m) => m.value)), 6, 0.5), n, 3, 0.65));
      const labelSize = pt(fit(1.3, longest(metrics.map((m) => m.label)), 26, 0.75));
      const valueH = (valueSize * 1.15) / 72;
      const labelH = textH(longest(metrics.map((m) => m.label)), cellW, labelSize, 1.4);
      const cellH = 0.02 + inch(1.2) + valueH + labelH;
      // Centre the grid in the slot, as the on-screen flex row does.
      const top = y + Math.max((h - (cellH * rows + gapY * (rows - 1))) / 2, 0);

      metrics.forEach((m, i) => {
        const cx = x + (i % cols) * (cellW + gapX);
        const cy = top + Math.floor(i / cols) * (cellH + gapY);
        slide.addShape("rect", {
          x: cx,
          y: cy,
          w: cellW,
          h: 0.014,
          fill: { color: secondary },
          line: { type: "none" },
        });
        slide.addText(m.value, {
          ...BOX,
          x: cx,
          y: cy + 0.014 + inch(1.2),
          w: cellW,
          h: valueH,
          valign: "top",
          fontFace: head,
          fontSize: valueSize,
          bold: opts.spec.headingWeight >= 600,
          color: primary,
        });
        slide.addText(m.label, {
          ...BOX,
          x: cx,
          y: cy + 0.014 + inch(1.2) + valueH + inch(0.5),
          w: cellW,
          h: labelH,
          valign: "top",
          fontFace: body,
          fontSize: labelSize,
          color: muted,
          lineSpacingMultiple: 1.4,
        });
      });
    };

    const drawServices = (x: number, y: number, w: number, h: number) => {
      if (!bullets.length) return;
      const parts = bullets.map((b) => {
        const [h0, ...rest] = b.split(" — ");
        return { head: h0 ?? b, rest: rest.join(" — ") };
      });
      const n = parts.length;
      const cols = n <= 1 ? 1 : 2;
      const rows = Math.ceil(n / cols);
      const gap = inch(RHYTHM * 1.2);
      const cellW = (w - gap * (cols - 1)) / cols;
      const inner = inch(1.8);
      const headSize = pt(countFit(fit(1.9, longest(parts.map((p) => p.head)), 26, 0.65), n, 4, 0.75));
      const restSize = pt(countFit(fit(1.35, longest(parts.map((p) => p.rest)), 60, 0.7), n, 4, 0.8));
      const innerW = cellW - inner * 2;
      const headH = textH(longest(parts.map((p) => p.head)), innerW, headSize, 1.25);
      const restH = parts.some((p) => p.rest)
        ? textH(longest(parts.map((p) => p.rest)), innerW, restSize, 1.5) + inch(0.7)
        : 0;
      const cellH = headH + restH + inner * 2;
      const top = y + Math.max((h - (cellH * rows + gap * (rows - 1))) / 2, 0);

      parts.forEach((p, i) => {
        const cx = x + (i % cols) * (cellW + gap);
        const cy = top + Math.floor(i / cols) * (cellH + gap);
        slide.addShape("rect", {
          x: cx,
          y: cy,
          w: cellW,
          h: cellH,
          fill: { color: bg },
          line: { color: secondary, width: 0.75 },
        });
        slide.addText(p.head, {
          ...BOX,
          x: cx + inner,
          y: cy + inner,
          w: innerW,
          h: headH,
          valign: "top",
          fontFace: head,
          fontSize: headSize,
          bold: opts.spec.headingWeight >= 600,
          color: ink,
        });
        if (p.rest) {
          slide.addText(p.rest, {
            ...BOX,
            x: cx + inner,
            y: cy + inner + headH + inch(0.7),
            w: innerW,
            h: restH - inch(0.7),
            valign: "top",
            fontFace: body,
            fontSize: restSize,
            color: muted,
            lineSpacingMultiple: 1.5,
          });
        }
      });
    };

    const drawSteps = (x: number, y: number, w: number, h: number, horizontal: boolean) => {
      if (!bullets.length) return;
      const n = bullets.length;
      const size = pt(countFit(fit(1.55, longest(bullets), horizontal ? 42 : 70, 0.65), n, 4, 0.72));
      const idxSize = pt(1.15);
      const gap = inch(horizontal ? 1.6 : RHYTHM * 0.9);
      const cellW = horizontal ? (w - gap * (n - 1)) / n : w;
      const idxH = (idxSize * 1.4) / 72;
      const bodyH = textH(longest(bullets), cellW, size, 1.4);
      const cellH = 0.028 + inch(1.2) + idxH + inch(0.6) + bodyH;
      const total = horizontal ? cellH : cellH * n + gap * (n - 1);
      const top = y + Math.max((h - total) / 2, 0);

      bullets.forEach((b, i) => {
        const cx = horizontal ? x + i * (cellW + gap) : x;
        const cy = horizontal ? top : top + i * (cellH + gap);
        slide.addShape("rect", {
          x: cx,
          y: cy,
          w: cellW,
          h: 0.028,
          fill: { color: i === 0 ? primary : secondary },
          line: { type: "none" },
        });
        slide.addText(String(i + 1).padStart(2, "0"), {
          ...BOX,
          x: cx,
          y: cy + 0.028 + inch(1.2),
          w: cellW,
          h: idxH,
          valign: "top",
          fontFace: body,
          fontSize: idxSize,
          charSpacing: 1.6,
          color: primary,
        });
        slide.addText(b, {
          ...BOX,
          x: cx,
          y: cy + 0.028 + inch(1.2) + idxH + inch(0.6),
          w: cellW,
          h: bodyH,
          valign: "top",
          fontFace: body,
          fontSize: size,
          color: ink,
          lineSpacingMultiple: 1.4,
        });
      });
    };

    const drawMedia = (x: number, y: number, w: number, h: number) => {
      // A cutout is transparent art sitting on the slide, not a framed photo:
      // no tinted panel behind it, and `contain` so nothing gets cropped away.
      const isCutout = slideKind === "cutout";
      if (!isCutout) {
        slide.addShape("rect", {
          x,
          y,
          w,
          h,
          fill: { color: secondary },
          line: { type: "none" },
        });
      }
      if (slideImage) {
        try {
          slide.addImage({
            data: slideImage,
            x,
            y,
            w,
            h,
            sizing: { type: isCutout ? "contain" : "cover", w, h },
          });
        } catch {
          /* ignore unsupported image data */
        }
      }
    };

    type Kind = "chart" | "media" | "text" | null;
    const kind: Kind = isTitle
      ? null
      : s.type === "metrics"
        ? s.layout === "B" || s.layout === "D"
          ? "text"
          : "chart"
        : s.type === "chart"
          ? "chart"
          : s.type === "bullets" || s.type === "services" || s.type === "process" || s.type === "timeline"
            ? "text"
            : s.type === "visual" || s.type === "split"
              ? "media"
              : null;

    const drawSecondary = (x: number, y: number, w: number, h: number) => {
      switch (s.type) {
        case "metrics":
          if (s.layout === "B" || s.layout === "D") drawMetrics(x, y, w, h);
          else drawChart(x, y, w, h);
          return;
        case "chart":
          drawChart(x, y, w, h);
          return;
        case "bullets":
          drawBullets(x, y, w, h);
          return;
        case "services":
          drawServices(x, y, w, h);
          return;
        case "process":
          drawSteps(x, y, w, h, s.layout !== "B");
          return;
        case "timeline":
          drawSteps(x, y, w, h, false);
          return;
        case "visual":
        case "split":
          drawMedia(x, y, w, h);
          return;
        default:
      }
    };

    // ---------------- Title & closing ----------------
    if (isTitle) {
      const centered = s.layout === "B" || s.layout === "D";
      const hasArt = Boolean(s.useImage && slideImage);
      /**
       * Mirrors SlideView: a photo is a full-bleed backdrop, a cutout stands
       * beside or above the headline. Layout D used to drop art entirely,
       * which blanked the closing slides that are guaranteed art.
       *
       * Only pipeline art carries an explicit kind; a user's own upload has
       * none and keeps the original side-portrait treatment.
       */
      const artKind = s.imageKind ?? null;
      const bleedPhoto = hasArt && artKind === "photo";
      const sideCutout = hasArt && artKind !== "photo" && s.layout !== "D";
      const topCutout = hasArt && artKind === "cutout" && s.layout === "D";

      // Backdrop first — pptxgenjs paints in call order, so the headline has
      // to come after the photo and its scrim or it ends up underneath.
      if (bleedPhoto && slideImage) {
        try {
          slide.addImage({
            data: slideImage,
            x: 0,
            y: 0,
            w: dim.w,
            h: dim.h,
            sizing: { type: "cover", w: dim.w, h: dim.h },
          });
        } catch {
          /* ignore unsupported image data */
        }
        // PowerPoint shape fills are solid, so the on-screen gradient becomes
        // one or two translucent bands in the deck's own background colour.
        if (centered) {
          slide.addShape("rect", {
            x: 0, y: 0, w: dim.w, h: dim.h,
            fill: { color: bg, transparency: 20 },
            line: { type: "none" },
          });
        } else {
          slide.addShape("rect", {
            x: 0, y: 0, w: dim.w * 0.55, h: dim.h,
            fill: { color: bg, transparency: 6 },
            line: { type: "none" },
          });
          slide.addShape("rect", {
            x: dim.w * 0.55, y: 0, w: dim.w * 0.45, h: dim.h,
            fill: { color: bg, transparency: 45 },
            line: { type: "none" },
          });
        }
      }

      const textW = sideCutout ? contentW * 0.62 : contentW;
      const geo = {
        w: textW,
        titleCqw: h1 * 1.5,
        titleComfy: sideCutout ? 30 : 42,
        bodyComfy: sideCutout ? 110 : 170,
      };
      const h = stackH(geo);
      const cutoutH = topCutout ? dim.h * 0.26 + inch(RHYTHM) : 0;
      const startY = s.layout === "C" ? pad : pad + Math.max((contentH - h - cutoutH) / 2, 0);

      if (topCutout) {
        const iw = inch(26);
        drawMedia(centered ? (dim.w - iw) / 2 : pad, startY, iw, dim.h * 0.26);
      }
      drawStack({ x: pad, y: startY + cutoutH, ...geo, align: centered ? "center" : "left" });

      if (sideCutout && slideImage) {
        const iw = inch(30);
        const ih = dim.h * 0.72;
        drawMedia(dim.w - inch(opts.spec.pad * 0.6) - iw, dim.h - inch(opts.spec.pad * 0.9) - ih, iw, ih);
      }
    }
    // ---------------- Overlay (layout C, visual/split) ----------------
    else if (s.layout === "C" && (s.type === "visual" || s.type === "split")) {
      drawMedia(0, 0, dim.w, dim.h);
      // Approximates the on-screen left-to-right background fade.
      slide.addShape("rect", {
        x: 0,
        y: 0,
        w: dim.w * 0.4,
        h: dim.h,
        fill: { color: bg },
        line: { type: "none" },
      });
      slide.addShape("rect", {
        x: dim.w * 0.4,
        y: 0,
        w: dim.w * 0.28,
        h: dim.h,
        fill: { color: bg, transparency: 45 },
        line: { type: "none" },
      });
      const textW = dim.w * 0.58 - pad * 2;
      const geo = { w: textW, titleCqw: h1 * 0.9, titleComfy: 38, bodyComfy: 120 };
      const h = stackH(geo);
      drawStack({ x: pad, y: dim.h - footerReserve - h, ...geo, align: "left" });
    }
    // ---------------- Two-column content slides ----------------
    else {
      const stacked = s.layout === "D";
      const reversed = s.layout === "B";
      const gap = inch(stacked ? RHYTHM * 1.7 : RHYTHM * 2.5);

      if (stacked || !kind) {
        const geo = { w: contentW, titleCqw: h1, titleComfy: 36, bodyComfy: 130 };
        const h = stackH(geo);
        const startY = kind ? pad : pad + Math.max((contentH - h) / 2, 0);
        drawStack({ x: pad, y: startY, ...geo, align: "left" });
        if (kind) {
          const vy = pad + h + gap;
          drawSecondary(pad, vy, contentW, Math.max(dim.h - footerReserve - vy, 0.5));
        }
      } else {
        const avail = contentW - gap;
        const textW = (avail * 44) / 96;
        const visW = (avail * 52) / 96;
        const textX = reversed ? pad + visW + gap : pad;
        const visX = reversed ? pad : pad + textW + gap;

        const geo = { w: textW, titleCqw: h1, titleComfy: 36, bodyComfy: 130 };
        const h = stackH(geo);
        drawStack({ x: textX, y: pad + Math.max((contentH - h) / 2, 0), ...geo, align: "left" });

        const visH = kind === "media" ? contentH * 0.76 : kind === "chart" ? contentH * 0.62 : contentH;
        const visY = pad + (contentH - visH) / 2;
        drawSecondary(visX, visY, visW, visH);
      }
    }

    // ---------------- Footer ----------------
    const footerY = dim.h - pad * 0.45 - 0.16;
    if (s.name) {
      slide.addText(s.name.toUpperCase(), {
        ...BOX,
        x: pad,
        y: footerY,
        w: contentW * 0.6,
        h: 0.22,
        valign: "middle",
        fontFace: body,
        fontSize: pt(1.05),
        charSpacing: 1.6,
        color: muted,
      });
    }

    if (opts.logo) {
      try {
        slide.addImage({
          data: opts.logo,
          x: dim.w - pad - 1.1,
          y: footerY - 0.04,
          w: 1.1,
          h: 0.3,
          sizing: { type: "contain", w: 1.1, h: 0.3 },
        });
      } catch {
        /* ignore */
      }
    }
  }

  await pptx.writeFile({ fileName: opts.fileName ?? "presentation.pptx" });
}
