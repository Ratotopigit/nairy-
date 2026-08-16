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
  const pad = dim.w * 0.06;
  const contentW = dim.w - pad * 2;

  for (const s of opts.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: hex(opts.palette.background) };
    let y = pad;

    if (s.eyebrow) {
      slide.addText(opts.spec.uppercaseEyebrow ? s.eyebrow.toUpperCase() : s.eyebrow, {
        x: pad,
        y,
        w: contentW,
        h: 0.3,
        fontFace: body,
        fontSize: 11,
        charSpacing: 2,
        color: hex(opts.palette.primary),
      });
      y += 0.45;
    }

    const isTitle = s.type === "title" || s.type === "closing";
    slide.addText(s.title, {
      x: pad,
      y,
      w: contentW,
      h: isTitle ? 1.6 : 1.1,
      fontFace: head,
      fontSize: isTitle ? 44 : 30,
      bold: opts.spec.headingWeight >= 600,
      color: hex(opts.palette.ink),
      valign: "top",
    });
    y += isTitle ? 1.7 : 1.2;

    if (s.body) {
      slide.addText(s.body, {
        x: pad,
        y,
        w: contentW * (s.bullets.length || s.metrics.length ? 0.55 : 0.8),
        h: 0.9,
        fontFace: body,
        fontSize: 14,
        color: hex(opts.palette.muted),
        lineSpacingMultiple: 1.3,
        valign: "top",
      });
      y += 1.0;
    }

    if (s.metrics.length) {
      s.metrics.slice(0, 4).forEach((m, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = pad + col * (contentW / 2);
        const my = y + row * 1.0;
        slide.addText(m.value, {
          x,
          y: my,
          w: contentW / 2 - 0.2,
          h: 0.5,
          fontFace: head,
          fontSize: 24,
          bold: true,
          color: hex(opts.palette.primary),
        });
        slide.addText(m.label, {
          x,
          y: my + 0.45,
          w: contentW / 2 - 0.2,
          h: 0.3,
          fontFace: body,
          fontSize: 11,
          color: hex(opts.palette.muted),
        });
      });
      y += Math.ceil(Math.min(s.metrics.length, 4) / 2) * 1.0;
    }

    if (s.bullets.length) {
      slide.addText(
        s.bullets.map((b) => ({ text: b, options: { breakLine: true } })),
        {
          x: pad,
          y,
          w: contentW,
          h: dim.h - y - pad,
          fontFace: body,
          fontSize: 13,
          color: hex(opts.palette.ink),
          bullet: { type: "number" },
          lineSpacingMultiple: 1.4,
          valign: "top",
        },
      );
    }

    if (s.type === "chart" && s.chart.length) {
      const max = Math.max(...s.chart, 1);
      const barW = (contentW * 0.9) / s.chart.length;
      s.chart.forEach((v, i) => {
        const h = ((dim.h - y - pad * 1.6) * v) / max;
        slide.addShape("rect", {
          x: pad + i * barW,
          y: dim.h - pad * 1.6 - h,
          w: barW * 0.7,
          h,
          fill: { color: hex(i % 2 ? opts.palette.secondary : opts.palette.primary) },
        });
      });
    }

    const slideImage = s.image ?? opts.image;
    if (s.useImage && slideImage) {
      try {
        slide.addImage({ data: slideImage, x: dim.w * 0.6, y: pad, w: dim.w * 0.34, h: dim.h * 0.6 });
      } catch {
        /* ignore unsupported image data */
      }
    }

    if (opts.logo) {
      try {
        slide.addImage({ data: opts.logo, x: dim.w - pad - 1.1, y: dim.h - pad * 0.9, w: 1.1, h: 0.35 });
      } catch {
        /* ignore */
      }
    }

    slide.addText(s.name.toUpperCase(), {
      x: pad,
      y: dim.h - pad * 0.9,
      w: contentW / 2,
      h: 0.3,
      fontFace: body,
      fontSize: 9,
      charSpacing: 2,
      color: hex(opts.palette.muted),
    });
  }

  await pptx.writeFile({ fileName: opts.fileName ?? "presentation.pptx" });
}
