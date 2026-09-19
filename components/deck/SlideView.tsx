import type { CSSProperties, ReactElement } from "react";
import type { Motion, Palette, Slide, StyleSpec } from "@/lib/deck";

type Props = {
  slide: Slide;
  palette: Palette;
  spec: StyleSpec;
  image: string | null;
  removeBg: boolean;
  logo: string | null;
  motion: Motion;
  onEdit?: (patch: Partial<Slide>) => void;
  onRequestImage?: () => void;
};

const cq = (n: number) => `${Math.round(n * 1000) / 1000}cqw`;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Deterministic, SSR-safe text auto-fit.
 *
 * Wrapped text fills an area roughly proportional to `len * size^2`, so to keep a
 * block covering about the same area as its content grows we scale the font by
 * `sqrt(comfy / len)`. Text at or under `comfy` characters renders at `base`;
 * beyond that it shrinks smoothly and is clamped at `base * min` so it stays
 * legible. No DOM measurement, so server and client always agree.
 *
 * `comfy` is tuned per block to the n8n content budget (title <= 70, body <= 200,
 * bullet <= 90, metric value <= 10, label <= 30) so in-budget content never
 * shrinks much, while older over-budget decks degrade instead of being clipped.
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

/** Every text run wraps rather than overflowing its box. */
const WRAP: CSSProperties = {
  overflowWrap: "anywhere",
  wordBreak: "normal",
  hyphens: "auto",
  minWidth: 0,
};

/** One vertical rhythm, shared by every slide type (cqw units). */
const RHYTHM = 1.8;

/** Click-to-edit text directly on the canvas. */
function Editable({
  value,
  onCommit,
  style,
  as = "div",
}: {
  value: string;
  onCommit?: ((v: string) => void) | undefined;
  style?: CSSProperties;
  as?: "div" | "h2" | "p";
}) {
  const Tag = as as any;
  return (
    <Tag
      contentEditable={Boolean(onCommit)}
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={(e: any) => {
        const next = e.currentTarget.innerText.replace(/\n+$/, "");
        if (onCommit && next !== value) onCommit(next);
      }}
      onKeyDown={(e: any) => {
        if (e.key === "Escape") e.currentTarget.blur();
      }}
      style={{ outline: "none", ...WRAP, ...style }}
    >
      {value}
    </Tag>
  );
}

export function SlideView({ slide: rawSlide, palette, spec, image, removeBg, logo, motion, onEdit, onRequestImage }: Props) {
  const slide = {
    ...rawSlide,
    bullets: Array.isArray(rawSlide?.bullets) ? rawSlide.bullets.filter(Boolean) : [],
    metrics: Array.isArray(rawSlide?.metrics) ? rawSlide.metrics.filter(Boolean) : [],
    chart: Array.isArray(rawSlide?.chart) && rawSlide.chart.length > 0 ? rawSlide.chart : [30, 50, 70, 90],
    eyebrow: rawSlide?.eyebrow ?? "",
    title: rawSlide?.title ?? "",
    body: rawSlide?.body ?? "",
    name: rawSlide?.name ?? "",
    layout: rawSlide?.layout ?? "A",
    type: rawSlide?.type ?? "bullets",
  };
  const pad = spec.pad;
  // `removeBg` is the studio's older global toggle; a slide's own imageKind
  // wins when the art came from the deck-art webhook and already has alpha.
  const isCutout = (rawSlide?.imageKind ?? (removeBg ? "cutout" : "photo")) === "cutout";
  const h1 = 5.4 * spec.headingScale;
  const dur = motion === "None" ? 0 : motion === "Dynamic" ? 420 : 260;

  const root: CSSProperties = {
    containerType: "inline-size",
    background: palette.background,
    color: palette.ink,
    fontFamily: spec.bodyFont,
    position: "relative",
    width: "100%",
    height: "100%",
    // Final backstop only — auto-fit above should keep content inside the frame.
    overflow: "hidden",
    animation: motion === "None"
      ? undefined
      : motion === "Dynamic"
        ? "deck-slide-dynamic 420ms cubic-bezier(0.22, 1, 0.36, 1) both"
        : "deck-slide-professional 260ms ease-out both",
  };

  const anim: CSSProperties = {
    transition: `opacity ${dur}ms ease, transform ${dur}ms ease`,
  };

  /**
   * Shared padding for every slide type. The extra bottom padding reserves room
   * for the Frame footer so content can never collide with it.
   */
  const framePad = `${cq(pad)} ${cq(pad)} ${cq(pad * 1.3)}`;

  /** Uniform stack: eyebrow -> title -> rule -> body -> extras, one gap everywhere. */
  const stackStyle = (align: "start" | "center"): CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    alignItems: align === "center" ? "center" : "flex-start",
    textAlign: align === "center" ? "center" : "left",
    gap: cq(RHYTHM),
    width: "100%",
    minWidth: 0,
  });

  const Eyebrow = () =>
    slide.eyebrow ? (
      <Editable
        value={slide.eyebrow}
        onCommit={onEdit ? (v) => onEdit({ eyebrow: v }) : undefined}
        style={{
          fontSize: cq(fit(1.15, slide.eyebrow.length, 34, 0.75)),
          lineHeight: 1.35,
          letterSpacing: spec.uppercaseEyebrow ? "0.18em" : "0.02em",
          textTransform: spec.uppercaseEyebrow ? "uppercase" : "none",
          color: palette.primary,
          fontWeight: 500,
          maxWidth: "100%",
        }}
      />
    ) : null;

  /** `comfy` is the character count that still renders at full `size`. */
  const Heading = ({ size = h1, comfy = 40 }: { size?: number; comfy?: number }) => (
    <Editable
      as="h2"
      value={slide.title}
      onCommit={onEdit ? (v) => onEdit({ title: v }) : undefined}
      style={{
        fontFamily: spec.headingFont,
        fontWeight: spec.headingWeight,
        fontSize: cq(fit(size, slide.title.length, comfy, 0.5)),
        letterSpacing: spec.tracking,
        lineHeight: 1.1,
        margin: 0,
        color: palette.ink,
        maxWidth: "100%",
      }}
    />
  );

  const Body = ({ comfy = 150 }: { comfy?: number }) =>
    slide.body ? (
      <Editable
        as="p"
        value={slide.body}
        onCommit={onEdit ? (v) => onEdit({ body: v }) : undefined}
        style={{
          fontSize: cq(fit(1.75, slide.body.length, comfy, 0.7)),
          lineHeight: 1.55,
          color: palette.muted,
          margin: 0,
          maxWidth: "48ch",
        }}
      />
    ) : null;

  const Rule = () =>
    spec.rule ? (
      <div
        style={{
          width: cq(6),
          height: 2,
          flex: "0 0 auto",
          background: palette.primary,
        }}
      />
    ) : null;

  const Chart = () => {
    const max = Math.max(...slide.chart.map((v) => (Number.isFinite(v) ? Math.abs(v) : 0)), 1);
    return (
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: cq(clamp(14 / slide.chart.length, 0.5, 1.4)),
          height: "100%",
          minHeight: cq(18),
          width: "100%",
        }}
      >
        {slide.chart.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minWidth: 0,
              // Normalised: legacy decks with values above 100 can't blow past the box.
              height: `${clamp(((Number.isFinite(v) ? Math.abs(v) : 0) / max) * 100, 2, 100)}%`,
              borderRadius: "2px 2px 0 0",
              background: mix(palette.secondary, palette.primary, i / Math.max(slide.chart.length - 1, 1)),
              transition: `height ${dur}ms ease, background ${dur}ms ease`,
            }}
          />
        ))}
      </div>
    );
  };

  const Metrics = () => {
    const n = slide.metrics.length;
    const cols = n <= 1 ? 1 : n === 3 ? 3 : 2;
    const valueSize = countFit(
      fit(3.4, longest(slide.metrics.map((m) => m.value)), 6, 0.5),
      n,
      3,
      0.65,
    );
    const labelSize = fit(1.3, longest(slide.metrics.map((m) => m.label)), 26, 0.75);
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap: `${cq(RHYTHM * 1.3)} ${cq(RHYTHM * 1.6)}`,
          width: "100%",
        }}
      >
        {slide.metrics.map((m, i) => (
          <div
            key={`${i}-${m.label}`}
            style={{ borderTop: `1px solid ${palette.secondary}`, paddingTop: cq(1.2), minWidth: 0 }}
          >
            <div
              style={{
                ...WRAP,
                fontFamily: spec.headingFont,
                fontSize: cq(valueSize),
                lineHeight: 1.15,
                fontWeight: spec.headingWeight,
                letterSpacing: spec.tracking,
                color: palette.primary,
              }}
            >
              {m.value}
            </div>
            <div style={{ ...WRAP, fontSize: cq(labelSize), lineHeight: 1.4, color: palette.muted, marginTop: cq(0.5) }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const Bullets = () => {
    const n = slide.bullets.length;
    const size = countFit(fit(1.7, longest(slide.bullets), 62, 0.65), n, 4, 0.7);
    const padY = clamp(1.3 * (4 / Math.max(n, 1)), 0.5, 1.3);
    return (
      <ul style={{ listStyle: "none", margin: 0, padding: 0, width: "100%", minWidth: 0 }}>
        {slide.bullets.map((b, i) => (
          <li
            key={`${i}-${b}`}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: cq(1.4),
              padding: `${cq(padY)} 0`,
              borderTop: i === 0 ? "none" : `1px solid ${mix(palette.background, palette.muted, 0.18)}`,
              fontSize: cq(size),
              lineHeight: 1.45,
              color: palette.ink,
            }}
          >
            <span
              style={{
                flex: "0 0 auto",
                color: palette.primary,
                fontSize: cq(size * 0.72),
                lineHeight: 1.45 / 0.72,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span style={WRAP}>{b}</span>
          </li>
        ))}
      </ul>
    );
  };

  const Services = () => {
    const n = slide.bullets.length;
    const parts = slide.bullets.map((b) => {
      const [head, ...rest] = b.split(" — ");
      return { head: head ?? b, rest: rest.join(" — ") };
    });
    const headSize = countFit(fit(1.9, longest(parts.map((p) => p.head)), 26, 0.65), n, 4, 0.75);
    const restSize = countFit(fit(1.35, longest(parts.map((p) => p.rest)), 60, 0.7), n, 4, 0.8);
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${n <= 1 ? 1 : 2}, minmax(0, 1fr))`,
          gap: cq(RHYTHM * 1.2),
          width: "100%",
        }}
      >
        {parts.map((p, i) => (
          <div
            key={`${i}-${p.head}`}
            style={{
              border: `1px solid ${mix(palette.background, palette.muted, 0.2)}`,
              padding: cq(1.8),
              borderRadius: 4,
              minWidth: 0,
            }}
          >
            <div
              style={{
                ...WRAP,
                fontFamily: spec.headingFont,
                fontSize: cq(headSize),
                lineHeight: 1.25,
                fontWeight: spec.headingWeight,
                color: palette.ink,
              }}
            >
              {p.head}
            </div>
            {p.rest ? (
              <div style={{ ...WRAP, fontSize: cq(restSize), color: palette.muted, marginTop: cq(0.7), lineHeight: 1.5 }}>
                {p.rest}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  const Steps = ({ horizontal }: { horizontal: boolean }) => {
    const n = slide.bullets.length;
    const size = countFit(fit(1.55, longest(slide.bullets), horizontal ? 42 : 70, 0.65), n, 4, 0.72);
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: horizontal ? `repeat(${Math.max(n, 1)}, minmax(0, 1fr))` : "minmax(0, 1fr)",
          gap: cq(horizontal ? 1.6 : RHYTHM * 0.9),
          width: "100%",
        }}
      >
        {slide.bullets.map((b, i) => (
          <div
            key={`${i}-${b}`}
            style={{
              minWidth: 0,
              borderTop: `2px solid ${i === 0 ? palette.primary : mix(palette.background, palette.muted, 0.25)}`,
              paddingTop: cq(1.2),
            }}
          >
            <div
              style={{
                fontSize: cq(1.15),
                lineHeight: 1.4,
                letterSpacing: "0.16em",
                color: palette.primary,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <div style={{ ...WRAP, fontSize: cq(size), marginTop: cq(0.6), lineHeight: 1.4 }}>{b}</div>
          </div>
        ))}
      </div>
    );
  };

  const Portrait = () => (
    <button
      type="button"
      onClick={onRequestImage}
      title="Click to replace this slide's photo"
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
        minWidth: 0,
        border: 0,
        padding: 0,
        background: "transparent",
        cursor: onRequestImage ? "pointer" : "default",
      }}
    >
      {isCutout ? null : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: mix(palette.background, palette.secondary, 0.55),
            borderRadius: 4,
          }}
        />
      )}
      {image ? (
        <img
          src={image}
          alt=""
          style={{
            position: "relative",
            height: "100%",
            width: "100%",
            // Matches lib/pptx.ts drawMedia: a cutout is contained so the
            // subject stays whole, a photo is cover-cropped to fill.
            objectFit: isCutout ? "contain" : "cover",
            borderRadius: isCutout ? 0 : 4,
          }}
        />
      ) : (
        <div
          style={{
            position: "relative",
            height: "100%",
            width: "100%",
            display: "grid",
            placeItems: "center",
            color: palette.muted,
            fontSize: cq(1.2),
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Image
        </div>
      )}
    </button>
  );

  /**
   * The secondary column. `kind` drives how the slot is sized and aligned so that
   * every slide type lands on the same optical baseline instead of ad-hoc heights.
   */
  const visual = (): { node: ReactElement; kind: "chart" | "media" | "text" } | null => {
    switch (slide.type) {
      case "metrics":
        return slide.layout === "B" || slide.layout === "D"
          ? { node: <Metrics />, kind: "text" }
          : { node: <Chart />, kind: "chart" };
      case "chart":
        return { node: <Chart />, kind: "chart" };
      case "bullets":
        return { node: <Bullets />, kind: "text" };
      case "services":
        return { node: <Services />, kind: "text" };
      case "process":
        return { node: <Steps horizontal={slide.layout !== "B"} />, kind: "text" };
      case "timeline":
        return { node: <Steps horizontal={false} />, kind: "text" };
      case "visual":
      case "split":
        return { node: <Portrait />, kind: "media" };
      default:
        return null;
    }
  };

  const secondary = visual();
  const inlineMetrics = slide.type === "metrics" && (slide.layout === "A" || slide.layout === "C")
    ? slide.metrics.slice(0, 2)
    : [];

  const textBlock = (
    <div style={{ ...stackStyle("start"), ...anim }}>
      <Eyebrow />
      <Heading comfy={36} />
      <Rule />
      <Body comfy={130} />
      {inlineMetrics.length ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${inlineMetrics.length}, minmax(0, 1fr))`,
            gap: cq(RHYTHM * 1.6),
            width: "100%",
            marginTop: cq(RHYTHM * 0.5),
          }}
        >
          {inlineMetrics.map((m, i) => (
            <div key={`${i}-${m.label}`} style={{ minWidth: 0 }}>
              <div
                style={{
                  ...WRAP,
                  fontFamily: spec.headingFont,
                  fontSize: cq(fit(2.8, m.value.length, 6, 0.55)),
                  lineHeight: 1.15,
                  color: palette.primary,
                  fontWeight: spec.headingWeight,
                }}
              >
                {m.value}
              </div>
              <div style={{ ...WRAP, fontSize: cq(fit(1.2, m.label.length, 26, 0.75)), lineHeight: 1.4, color: palette.muted }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );

  // Title & closing
  if (slide.type === "title" || slide.type === "closing") {
    const centered = slide.layout === "B" || slide.layout === "D";
    const hasArt = Boolean(slide.useImage && image);
    /**
     * A photo is a full-bleed backdrop for the whole slide; a cutout is an
     * object standing beside or above the headline.
     *
     * Layout D used to suppress art outright, which silently blanked exactly
     * the closing slides the deck agent had chosen art for — the bookends are
     * the two slides that most need to look finished.
     */
    // Only art resolved by the deck-art pipeline carries an explicit kind. An
    // image the user uploaded themselves has none, and keeps the original
    // side-portrait treatment rather than silently taking over the slide.
    const artKind = rawSlide?.imageKind ?? null;
    const bleedPhoto = hasArt && artKind === "photo";
    const sideCutout = hasArt && artKind !== "photo" && slide.layout !== "D";
    const topCutout = hasArt && artKind === "cutout" && slide.layout === "D";

    return (
      <div style={root}>
        {bleedPhoto ? (
          <>
            <img
              src={image!}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                // Tinted with the deck's own background so the existing ink and
                // muted colours stay readable over any photograph.
                background: centered
                  ? `radial-gradient(ellipse at center, ${withAlpha(palette.background, 0.93)} 0%, ${withAlpha(palette.background, 0.7)} 100%)`
                  : `linear-gradient(90deg, ${withAlpha(palette.background, 0.96)} 0%, ${withAlpha(palette.background, 0.88)} 48%, ${withAlpha(palette.background, 0.4)} 100%)`,
              }}
            />
          </>
        ) : null}
        <Frame palette={palette} logo={logo} pad={pad} name={slide.name} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: framePad,
            display: "flex",
            flexDirection: "column",
            justifyContent: slide.layout === "C" ? "flex-start" : "center",
            alignItems: centered ? "center" : "flex-start",
            ...anim,
          }}
        >
          {topCutout ? (
            <div style={{ width: cq(26), height: "26%", marginBottom: cq(1.8) }}>
              <Portrait />
            </div>
          ) : null}
          <div
            style={{
              ...stackStyle(centered ? "center" : "start"),
              // Keep the headline clear of the cutout pinned to the right edge.
              maxWidth: sideCutout ? "62%" : "100%",
            }}
          >
            <Eyebrow />
            <Heading size={h1 * 1.5} comfy={sideCutout ? 30 : 42} />
            <Rule />
            <Body comfy={sideCutout ? 110 : 170} />
          </div>
        </div>
        {sideCutout ? (
          <div
            style={{
              position: "absolute",
              right: cq(pad * 0.6),
              bottom: cq(pad * 0.9),
              width: cq(30),
              height: "72%",
            }}
          >
            <Portrait />
          </div>
        ) : null}
      </div>
    );
  }

  const reversed = slide.layout === "B";
  const stacked = slide.layout === "D";
  const overlay = slide.layout === "C" && (slide.type === "visual" || slide.type === "split");

  if (overlay) {
    return (
      <div style={root}>
        <div style={{ position: "absolute", inset: 0 }}>
          <Portrait />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(90deg, ${palette.background} 34%, transparent 68%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: framePad,
            width: "58%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            ...anim,
          }}
        >
          <div style={stackStyle("start")}>
            <Eyebrow />
            <Heading size={h1 * 0.9} comfy={38} />
            <Rule />
            <Body comfy={120} />
          </div>
        </div>
        <Frame palette={palette} logo={logo} pad={pad} name={slide.name} />
      </div>
    );
  }

  const slotHeight = !secondary
    ? undefined
    : stacked
      ? "auto"
      : secondary.kind === "media"
        ? "76%"
        : secondary.kind === "chart"
          ? "62%"
          : "auto";

  return (
    <div style={root}>
      <Frame palette={palette} logo={logo} pad={pad} name={slide.name} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: framePad,
          display: "flex",
          flexDirection: stacked ? "column" : reversed ? "row-reverse" : "row",
          alignItems: stacked ? "stretch" : "center",
          justifyContent: "center",
          gap: cq(stacked ? RHYTHM * 1.7 : RHYTHM * 2.5),
        }}
      >
        <div style={{ flex: stacked ? "0 0 auto" : "1 1 44%", minWidth: 0, minHeight: 0 }}>{textBlock}</div>
        {secondary ? (
          <div
            style={{
              flex: stacked ? "1 1 auto" : "1 1 52%",
              minWidth: 0,
              minHeight: 0,
              height: slotHeight,
              display: "flex",
              // Charts and photos sit on the baseline; text-like visuals centre
              // against the copy column so the two sides read as one grid.
              alignItems: secondary.kind === "text" ? "center" : secondary.kind === "media" ? "stretch" : "flex-end",
              ...anim,
            }}
          >
            {secondary.node}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Frame({
  palette,
  logo,
  pad,
  name,
}: {
  palette: Palette;
  logo: string | null;
  pad: number;
  name: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: cq(pad),
        right: cq(pad),
        bottom: cq(pad * 0.45),
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: cq(1.5),
        fontSize: cq(1.05),
        lineHeight: 1.3,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: palette.muted,
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
      {logo ? (
        <img src={logo} alt="" style={{ flex: "0 0 auto", height: cq(2.2), objectFit: "contain", opacity: 0.9 }} />
      ) : null}
    </div>
  );
}

function mix(a: string, b: string, t: number) {
  const pa = hex(a);
  const pb = hex(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i]! - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/**
 * A translucent version of a palette colour, used for the scrim over a
 * full-bleed photo. Tinting with the deck's own background is what lets the
 * existing ink and muted tones stay legible over an arbitrary photograph.
 */
function withAlpha(c: string, a: number) {
  const [r, g, b] = hex(c);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function hex(h: string): number[] {
  const s = h.replace("#", "");
  const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0);
}
