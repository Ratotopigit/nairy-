/**
 * Lightweight, zero-dependency client-side PDF generator for WebinarKit Offer Blueprints.
 * Produces standard PDF-1.4 binary documents that open cleanly in Adobe Acrobat,
 * Apple Preview, Chrome, Edge, Safari, and mobile PDF viewers.
 */

export interface OfferBlueprintData {
  title: string;
  promise: string;
  audience: string;
  core_angle: string;
  delivery_model: string;
  traffic_strategy?: string;
  timeline: string;
  pricing: string;
  scope: string[];
  success_metrics: string[];
  risk_reversal: string;
}

function escapePdf(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E]/g, " ");
}

function wrapText(text: string, maxChars: number): string[] {
  if (!text) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if ((cur + " " + w).length <= maxChars) {
      cur += " " + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

class OfferPdfBuilder {
  private pages: { stream: string }[] = [];
  private currentPage!: { stream: string };
  private y: number = 780;

  constructor() {
    this.newPage();
  }

  private newPage() {
    this.currentPage = { stream: "" };
    this.pages.push(this.currentPage);
    this.y = 780;
  }

  private ensureSpace(needed: number) {
    if (this.y - needed < 65) {
      this.newPage();
    }
  }

  private rect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    g: number,
    b: number,
    stroke = false,
    sr = 0.86,
    sg = 0.84,
    sb = 0.79
  ) {
    this.currentPage.stream += `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`;
    if (stroke) {
      this.currentPage.stream += `${sr.toFixed(3)} ${sg.toFixed(3)} ${sb.toFixed(3)} RG 1 w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S\n`;
    }
  }

  private line(x1: number, y1: number, x2: number, y2: number, r = 0.85, g = 0.84, b = 0.81, lw = 0.75) {
    this.currentPage.stream += `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${lw} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`;
  }

  private text(str: string, x: number, y: number, font = "/F2", size = 10, r = 0.11, g = 0.16, b = 0.15) {
    this.currentPage.stream += `BT ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdf(str)}) Tj ET\n`;
  }

  public generate(offer: OfferBlueprintData): Uint8Array {
    // Header Tag
    this.text("WEBINARKIT", 48, this.y, "/F1", 9.5, 0.12, 0.30, 0.24);
    this.text("OFFER STRATEGY BLUEPRINT", 120, this.y, "/F1", 9, 0.60, 0.42, 0.10);
    const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    this.text(dateStr, 485, this.y, "/F2", 8.5, 0.45, 0.45, 0.45);
    this.y -= 22;

    // Document Title
    const titleLines = wrapText(offer.title || "Offer Strategy", 48);
    for (const line of titleLines) {
      this.ensureSpace(24);
      this.text(line, 48, this.y, "/F1", 18, 0.12, 0.30, 0.24);
      this.y -= 22;
    }
    this.y -= 4;

    // Promise / Subtitle
    if (offer.promise) {
      const promiseLines = wrapText(offer.promise, 78);
      for (const line of promiseLines) {
        this.ensureSpace(16);
        this.text(line, 48, this.y, "/F3", 10.5, 0.35, 0.38, 0.37);
        this.y -= 15;
      }
      this.y -= 8;
    }

    // Divider Line
    this.line(48, this.y, 547, this.y, 0.85, 0.84, 0.81, 1);
    this.y -= 20;

    // Commercial Positioning Section
    this.ensureSpace(130);
    this.text("COMMERCIAL POSITIONING", 48, this.y, "/F1", 11, 0.12, 0.30, 0.24);
    this.y -= 16;

    const positioningItems = [
      { label: "Target Audience", value: offer.audience },
      { label: "Core Angle", value: offer.core_angle },
      { label: "Delivery Model", value: offer.delivery_model },
      { label: "Delivery Timeline", value: offer.timeline },
      { label: "Investment Range", value: offer.pricing },
    ].filter((i) => i.value);

    for (const item of positioningItems) {
      this.ensureSpace(18);
      this.text(item.label + ":", 54, this.y, "/F1", 9.5, 0.2, 0.2, 0.2);
      const valLines = wrapText(item.value, 60);
      this.text(valLines[0] || "", 170, this.y, "/F2", 9.5, 0.12, 0.16, 0.15);
      this.y -= 15;
      for (let k = 1; k < valLines.length; k++) {
        this.ensureSpace(14);
        this.text(valLines[k], 170, this.y, "/F2", 9.5, 0.12, 0.16, 0.15);
        this.y -= 14;
      }
    }
    this.y -= 14;

    // Scope & Deliverables Section
    if (Array.isArray(offer.scope) && offer.scope.length > 0) {
      this.ensureSpace(40);
      this.text("SCOPE & DELIVERABLES", 48, this.y, "/F1", 11, 0.12, 0.30, 0.24);
      this.y -= 16;
      for (const item of offer.scope) {
        const lines = wrapText(item, 76);
        this.ensureSpace(lines.length * 15 + 4);
        this.text("-", 56, this.y, "/F1", 10, 0.60, 0.42, 0.10);
        this.text(lines[0] || "", 70, this.y, "/F2", 9.5, 0.12, 0.16, 0.15);
        this.y -= 15;
        for (let k = 1; k < lines.length; k++) {
          this.ensureSpace(14);
          this.text(lines[k], 70, this.y, "/F2", 9.5, 0.12, 0.16, 0.15);
          this.y -= 14;
        }
      }
      this.y -= 12;
    }

    // Success Metrics Section
    if (Array.isArray(offer.success_metrics) && offer.success_metrics.length > 0) {
      this.ensureSpace(40);
      this.text("SUCCESS METRICS", 48, this.y, "/F1", 11, 0.12, 0.30, 0.24);
      this.y -= 16;
      for (const item of offer.success_metrics) {
        const lines = wrapText(item, 76);
        this.ensureSpace(lines.length * 15 + 4);
        this.text("[x]", 54, this.y, "/F1", 8.5, 0.12, 0.30, 0.24);
        this.text(lines[0] || "", 74, this.y, "/F2", 9.5, 0.12, 0.16, 0.15);
        this.y -= 15;
        for (let k = 1; k < lines.length; k++) {
          this.ensureSpace(14);
          this.text(lines[k], 74, this.y, "/F2", 9.5, 0.12, 0.16, 0.15);
          this.y -= 14;
        }
      }
      this.y -= 12;
    }

    // Risk Reversal Box
    if (offer.risk_reversal) {
      const lines = wrapText(offer.risk_reversal, 76);
      const boxHeight = lines.length * 15 + 32;
      this.ensureSpace(boxHeight + 10);
      const boxY = this.y - boxHeight;
      this.rect(48, boxY, 499, boxHeight, 0.96, 0.95, 0.92, true, 0.86, 0.84, 0.79);
      this.text("RISK REVERSAL & GUARANTEE", 60, boxY + boxHeight - 18, "/F1", 9, 0.60, 0.42, 0.10);
      let textY = boxY + boxHeight - 32;
      for (const line of lines) {
        this.text(line, 60, textY, "/F2", 9.5, 0.12, 0.16, 0.15);
        textY -= 14;
      }
      this.y = boxY - 16;
    }

    // Add footers on all pages
    const totalPages = this.pages.length;
    for (let p = 0; p < totalPages; p++) {
      const pageStream = this.pages[p];
      pageStream.stream += `0.85 0.84 0.81 RG 0.5 w 48 42 m 547 42 l S\n`;
      pageStream.stream += `BT 0.45 0.45 0.45 rg /F2 8 Tf 1 0 0 1 48 30 Tm (${escapePdf(
        "WebinarKit  |  Confidential Offer Blueprint"
      )}) Tj ET\n`;
      pageStream.stream += `BT 0.45 0.45 0.45 rg /F2 8 Tf 1 0 0 1 490 30 Tm (${escapePdf(
        `Page ${p + 1} of ${totalPages}`
      )}) Tj ET\n`;
    }

    return this.render();
  }

  private render(): Uint8Array {
    const totalPages = this.pages.length;
    const pageObjIds: number[] = [];
    const streamObjIds: number[] = [];
    let nextId = 6;
    for (let i = 0; i < totalPages; i++) {
      pageObjIds.push(nextId++);
      streamObjIds.push(nextId++);
    }

    const objects: string[] = [];
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${totalPages} >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>";

    const encoder = new TextEncoder();

    for (let i = 0; i < totalPages; i++) {
      const pageId = pageObjIds[i];
      const streamId = streamObjIds[i];
      objects[pageId] = `<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 595.28 841.89]
  /Resources <<
    /Font <<
      /F1 3 0 R
      /F2 4 0 R
      /F3 5 0 R
    >>
  >>
  /Contents ${streamId} 0 R
>>`;
      const content = this.pages[i].stream;
      const contentByteLength = encoder.encode(content).length;
      objects[streamId] = `<< /Length ${contentByteLength} >>\nstream\n${content}\nendstream`;
    }

    let out = "%PDF-1.4\n";
    const offsets: number[] = [];
    for (let i = 1; i < objects.length; i++) {
      offsets[i] = encoder.encode(out).length;
      out += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }

    const xrefOffset = encoder.encode(out).length;
    out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i++) {
      out += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
    }
    out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return encoder.encode(out);
  }
}

/**
 * Generates and triggers the download of a clean Offer Strategy PDF.
 */
export function downloadOfferPdf(offer: OfferBlueprintData, filename?: string): void {
  const builder = new OfferPdfBuilder();
  const bytes = builder.generate(offer);
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const slug = (offer.title || "offer-strategy")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `${slug || "offer-strategy"}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
