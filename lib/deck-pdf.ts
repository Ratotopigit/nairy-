/**
 * Zero-dependency deck -> PDF export.
 *
 * Deliberately hand-rolled in the same style as lib/offer-pdf.ts rather than
 * pulling in jsPDF: the studio already lazy-loads pptxgenjs, and a second
 * multi-hundred-kilobyte PDF library is the kind of weight this app cannot
 * afford.
 *
 * Images: every picture is re-encoded to JPEG through a canvas before it is
 * embedded. JPEG bytes drop straight into a PDF as a DCTDecode XObject with no
 * compression code of our own, and routing PNG cutouts through the same path
 * flattens their alpha onto the slide background instead of needing a zlib
 * implementation. A picture that fails to load is skipped; the page still
 * renders its text.
 */
import type { Palette, Slide } from "@/lib/deck";

const PAGE = { w: 792, h: 445 }; // 16:9 in PDF points
const MARGIN = 48;

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string, fallback: Rgb): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? "").trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

function esc(value: string): string {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E]/g, " ");
}

/** Helvetica is ~0.5em average; good enough for wrapping without font metrics. */
function wrap(text: string, size: number, maxWidth: number): string[] {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const maxChars = Math.max(8, Math.floor(maxWidth / (size * 0.5)));
  const out: string[] = [];
  let line = "";
  for (const word of clean.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxChars) line = next;
    else {
      if (line) out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out;
}

/** Loads a URL and re-encodes it as JPEG bytes plus pixel dimensions. */
async function toJpeg(
  url: string,
  background: string,
): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
    if (!loaded || !img.naturalWidth) return null;

    // Cap the long edge: a 4000px Pixabay original would balloon the file for
    // no visible gain at slide size.
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // Cutouts are transparent; JPEG has no alpha, so flatten onto the slide
    // colour rather than letting it default to black.
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    const b64 = dataUrl.split(",")[1] ?? "";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return { bytes, width: w, height: h };
  } catch {
    // A tainted canvas or a blocked host must not take the whole export down.
    return null;
  }
}

type PdfObject = { body: string; binary?: Uint8Array };

export async function downloadDeckPdf(
  slides: Slide[],
  palette: Palette,
  fileName = "presentation.pdf",
): Promise<void> {
  const bg = hexToRgb(palette?.background ?? "#FFFFFF", { r: 1, g: 1, b: 1 });
  const fg = hexToRgb(palette?.primary ?? "#111111", { r: 0.07, g: 0.07, b: 0.07 });
  const muted = hexToRgb(palette?.secondary ?? "#555555", { r: 0.33, g: 0.33, b: 0.33 });
  const bgCss = palette?.background ?? "#FFFFFF";

  // Resolve art first so page objects can reference image XObjects by index.
  const images = await Promise.all(
    slides.map((slide) => (slide.image ? toJpeg(slide.image, bgCss) : Promise.resolve(null))),
  );

  // Object ids are 1-based and equal the array index + 1.
  // 1 = catalog, 2 = pages, 3 = regular font, 4 = bold font.
  const objects: PdfObject[] = [
    { body: "<< /Type /Catalog /Pages 2 0 R >>" },
    { body: "" }, // pages placeholder, filled in once the kids are known
    { body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" },
    { body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>" },
  ];
  const boldId = 4;

  const pageIds: number[] = [];

  slides.forEach((slide, index) => {
    const art = images[index];
    let imageId = 0;
    if (art) {
      objects.push({
        body:
          `<< /Type /XObject /Subtype /Image /Width ${art.width} /Height ${art.height} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${art.bytes.length} >>`,
        binary: art.bytes,
      });
      imageId = objects.length;
    }

    const hasArt = imageId > 0;
    // With art the text takes the left half; without it, the full width.
    const textWidth = hasArt ? PAGE.w * 0.52 - MARGIN : PAGE.w - MARGIN * 2;

    const ops: string[] = [];
    ops.push(`${bg.r.toFixed(3)} ${bg.g.toFixed(3)} ${bg.b.toFixed(3)} rg`);
    ops.push(`0 0 ${PAGE.w} ${PAGE.h} re f`);

    if (hasArt) {
      const boxW = PAGE.w * 0.40;
      const boxH = PAGE.h - MARGIN * 2;
      const ratio = art!.width / art!.height;
      let drawW = boxW;
      let drawH = boxW / ratio;
      if (drawH > boxH) {
        drawH = boxH;
        drawW = boxH * ratio;
      }
      const x = PAGE.w - MARGIN - boxW + (boxW - drawW) / 2;
      const y = (PAGE.h - drawH) / 2;
      ops.push("q");
      ops.push(`${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm`);
      ops.push(`/Im${imageId} Do`);
      ops.push("Q");
    }

    let cursor = PAGE.h - MARGIN - 18;
    const line = (text: string, size: number, color: Rgb, font: "F1" | "F2", gap = 6) => {
      ops.push("BT");
      ops.push(`/${font} ${size} Tf`);
      ops.push(`${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)} rg`);
      ops.push(`${MARGIN} ${cursor.toFixed(2)} Td`);
      ops.push(`(${esc(text)}) Tj`);
      ops.push("ET");
      cursor -= size + gap;
    };

    if (slide.eyebrow) line(slide.eyebrow.toUpperCase(), 9, muted, "F1", 10);
    for (const l of wrap(slide.title, 24, textWidth)) line(l, 24, fg, "F2", 4);
    cursor -= 8;
    for (const l of wrap(slide.body, 12, textWidth)) line(l, 12, muted, "F1", 4);

    if (slide.bullets?.length) {
      cursor -= 8;
      for (const bullet of slide.bullets) {
        const wrapped = wrap(bullet, 11, textWidth - 14);
        wrapped.forEach((l, i) => line(i === 0 ? `-  ${l}` : `   ${l}`, 11, fg, "F1", 4));
      }
    }

    if (slide.metrics?.length) {
      cursor -= 10;
      for (const metric of slide.metrics) {
        line(metric.value, 20, fg, "F2", 2);
        line(metric.label, 9, muted, "F1", 8);
      }
    }

    // Slide number, bottom right.
    ops.push("BT");
    ops.push("/F1 8 Tf");
    ops.push(`${muted.r.toFixed(3)} ${muted.g.toFixed(3)} ${muted.b.toFixed(3)} rg`);
    ops.push(`${PAGE.w - MARGIN - 20} ${MARGIN / 2} Td`);
    ops.push(`(${index + 1}) Tj`);
    ops.push("ET");

    const content = ops.join("\n");
    objects.push({ body: `<< /Length ${content.length} >>\nstream\n${content}\nendstream` });
    const contentId = objects.length;

    const xobject = hasArt ? ` /XObject << /Im${imageId} ${imageId} 0 R >>` : "";
    objects.push({
      body:
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.w} ${PAGE.h}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 ${boldId} 0 R >>${xobject} >> ` +
        `/Contents ${contentId} 0 R >>`,
    });
    pageIds.push(objects.length);
  });

  objects[1] = {
    body: `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`,
  };

  // Serialise, tracking byte offsets for the xref table.
  const chunks: Uint8Array[] = [];
  const encoder = new TextEncoder();
  let offset = 0;
  const offsets: number[] = [];
  const push = (data: Uint8Array | string) => {
    const bytes = typeof data === "string" ? encoder.encode(data) : data;
    chunks.push(bytes);
    offset += bytes.length;
  };

  push("%PDF-1.4\n");
  objects.forEach((obj, i) => {
    offsets[i] = offset;
    push(`${i + 1} 0 obj\n`);
    if (obj.binary) {
      push(`${obj.body}\nstream\n`);
      push(obj.binary);
      push("\nendstream\nendobj\n");
    } else {
      push(`${obj.body}\nendobj\n`);
    }
  });

  const xrefStart = offset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 0; i < objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

  const blob = new Blob(chunks as BlobPart[], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
