import type { CSSProperties } from "react";
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
      style={{ outline: "none", ...style }}
    >
      {value}
    </Tag>
  );
}

const cq = (n: number) => `${n}cqw`;

export function SlideView({ slide: rawSlide, palette, spec, image, removeBg, logo, motion, onEdit, onRequestImage }: Props) {
  const slide = {
    ...rawSlide,
    bullets: Array.isArray(rawSlide?.bullets) ? rawSlide.bullets : [],
    metrics: Array.isArray(rawSlide?.metrics) ? rawSlide.metrics : [],
    chart: Array.isArray(rawSlide?.chart) && rawSlide.chart.length > 0 ? rawSlide.chart : [30, 50, 70, 90],
    eyebrow: rawSlide?.eyebrow ?? "",
    title: rawSlide?.title ?? "",
    body: rawSlide?.body ?? "",
    name: rawSlide?.name ?? "",
    layout: rawSlide?.layout ?? "A",
    type: rawSlide?.type ?? "bullets",
  };
  const pad = spec.pad;
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

  const Eyebrow = () =>
    slide.eyebrow ? (
      <Editable
        value={slide.eyebrow}
        onCommit={onEdit ? (v) => onEdit({ eyebrow: v }) : undefined}
        style={{
          fontSize: cq(1.15),
          letterSpacing: spec.uppercaseEyebrow ? "0.18em" : "0.02em",
          textTransform: spec.uppercaseEyebrow ? "uppercase" : "none",
          color: palette.primary,
          marginBottom: cq(1.6),
          fontWeight: 500,
        }}
      />
    ) : null;

  const Heading = ({ size = h1 }: { size?: number }) => (
    <Editable
      as="h2"
      value={slide.title}
      onCommit={onEdit ? (v) => onEdit({ title: v }) : undefined}
      style={{
        fontFamily: spec.headingFont,
        fontWeight: spec.headingWeight,
        fontSize: cq(size),
        letterSpacing: spec.tracking,
        lineHeight: 1.04,
        margin: 0,
        color: palette.ink,
      }}
    />
  );

  const Body = () =>
    slide.body ? (
      <Editable
        as="p"
        value={slide.body}
        onCommit={onEdit ? (v) => onEdit({ body: v }) : undefined}
        style={{
          fontSize: cq(1.75),
          lineHeight: 1.55,
          color: palette.muted,
          margin: `${cq(2)} 0 0`,
          maxWidth: "46ch",
        }}
      />
    ) : null;

  const Rule = () =>
    spec.rule ? (
      <div
        style={{
          width: cq(6),
          height: 2,
          background: palette.primary,
          margin: `${cq(2.4)} 0 0`,
        }}
      />
    ) : null;

  const Chart = () => (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: cq(1.4),
        height: "100%",
        width: "100%",
      }}
    >
      {slide.chart.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${v}%`,
            background: mix(palette.secondary, palette.primary, i / Math.max(slide.chart.length - 1, 1)),
            transition: `height ${dur}ms ease, background ${dur}ms ease`,
          }}
        />
      ))}
    </div>
  );

  const Metrics = () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: `${cq(2.4)} ${cq(3)}`,
        width: "100%",
      }}
    >
      {slide.metrics.map((m) => (
        <div key={m.label} style={{ borderTop: `1px solid ${palette.secondary}`, paddingTop: cq(1.2) }}>
          <div
            style={{
              fontFamily: spec.headingFont,
              fontSize: cq(3.4),
              fontWeight: spec.headingWeight,
              letterSpacing: spec.tracking,
              color: palette.primary,
            }}
          >
            {m.value}
          </div>
          <div style={{ fontSize: cq(1.3), color: palette.muted, marginTop: cq(0.5) }}>{m.label}</div>
        </div>
      ))}
    </div>
  );

  const Bullets = () => (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, width: "100%" }}>
      {slide.bullets.map((b, i) => (
        <li
          key={b}
          style={{
            display: "flex",
            gap: cq(1.4),
            padding: `${cq(1.3)} 0`,
            borderTop: i === 0 ? "none" : `1px solid ${mix(palette.background, palette.muted, 0.18)}`,
            fontSize: cq(1.7),
            lineHeight: 1.45,
            color: palette.ink,
          }}
        >
          <span style={{ color: palette.primary, fontSize: cq(1.2), paddingTop: cq(0.35) }}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );

  const Services = () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: cq(2.2), width: "100%" }}>
      {slide.bullets.map((b) => {
        const [head, ...rest] = b.split(" — ");
        return (
          <div
            key={b}
            style={{
              border: `1px solid ${mix(palette.background, palette.muted, 0.2)}`,
              padding: cq(1.8),
              borderRadius: 4,
            }}
          >
            <div
              style={{
                fontFamily: spec.headingFont,
                fontSize: cq(1.9),
                fontWeight: spec.headingWeight,
                color: palette.ink,
              }}
            >
              {head}
            </div>
            <div style={{ fontSize: cq(1.35), color: palette.muted, marginTop: cq(0.7), lineHeight: 1.5 }}>
              {rest.join(" — ")}
            </div>
          </div>
        );
      })}
    </div>
  );

  const Steps = ({ horizontal }: { horizontal: boolean }) => (
    <div
      style={{
        display: horizontal ? "flex" : "grid",
        gap: cq(1.6),
        width: "100%",
      }}
    >
      {slide.bullets.map((b, i) => (
        <div
          key={b}
          style={{
            flex: 1,
            borderTop: `2px solid ${i === 0 ? palette.primary : mix(palette.background, palette.muted, 0.25)}`,
            paddingTop: cq(1.2),
          }}
        >
          <div style={{ fontSize: cq(1.15), letterSpacing: "0.16em", color: palette.primary }}>
            {String(i + 1).padStart(2, "0")}
          </div>
          <div style={{ fontSize: cq(1.55), marginTop: cq(0.6), lineHeight: 1.4 }}>{b}</div>
        </div>
      ))}
    </div>
  );

  const Portrait = ({ full }: { full?: boolean }) => (
    <button
      type="button"
      onClick={onRequestImage}
      title="Click to replace this slide's photo"
      style={{ position: "relative", height: "100%", width: "100%", border: 0, padding: 0, background: "transparent", cursor: onRequestImage ? "pointer" : "default" }}
    >
      <div
        style={{
          position: "absolute",
          inset: full ? "0" : `${cq(4)} 0 0 ${cq(4)}`,
          background: mix(palette.background, palette.secondary, 0.55),
          borderRadius: 4,
        }}
      />
      {image ? (
        <img
          src={image}
          alt=""
          style={{
            position: "relative",
            height: "100%",
            width: "100%",
            objectFit: "cover",
            borderRadius: 4,
            mixBlendMode: removeBg ? "multiply" : "normal",
            filter: removeBg ? "contrast(1.04) saturate(1.02)" : "none",
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

  const visual = () => {
    switch (slide.type) {
      case "metrics":
        return slide.layout === "B" || slide.layout === "D" ? <Metrics /> : <Chart />;
      case "chart":
        return <Chart />;
      case "bullets":
        return <Bullets />;
      case "services":
        return <Services />;
      case "process":
        return <Steps horizontal={slide.layout !== "B"} />;
      case "timeline":
        return <Steps horizontal={false} />;
      case "visual":
      case "split":
        return <Portrait />;
      default:
        return null;
    }
  };

  const secondary = visual();
  const textBlock = (
    <div style={anim}>
      <Eyebrow />
      <Heading />
      <Rule />
      <Body />
      {slide.type === "metrics" && (slide.layout === "A" || slide.layout === "C") ? (
        <div style={{ marginTop: cq(3) }}>
          <div style={{ display: "flex", gap: cq(3) }}>
            {slide.metrics.slice(0, 2).map((m) => (
              <div key={m.label}>
                <div
                  style={{
                    fontFamily: spec.headingFont,
                    fontSize: cq(2.8),
                    color: palette.primary,
                    fontWeight: spec.headingWeight,
                  }}
                >
                  {m.value}
                </div>
                <div style={{ fontSize: cq(1.2), color: palette.muted }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  // Title & closing
  if (slide.type === "title" || slide.type === "closing") {
    const centered = slide.layout === "B" || slide.layout === "D";
    return (
      <div style={root}>
        <Frame palette={palette} logo={logo} pad={pad} name={slide.name} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: cq(pad),
            display: "flex",
            flexDirection: "column",
            justifyContent: slide.layout === "C" ? "flex-start" : "center",
            alignItems: centered ? "center" : "flex-start",
            textAlign: centered ? "center" : "left",
            gap: 0,
            ...anim,
          }}
        >
          <Eyebrow />
          <Heading size={h1 * 1.5} />
          <Rule />
          <Body />
        </div>
        {slide.useImage && image && slide.layout !== "D" ? (
          <div
            style={{
              position: "absolute",
              right: cq(pad * 0.6),
              bottom: 0,
              width: cq(30),
              height: "82%",
            }}
          >
            <Portrait full />
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
          <Portrait full />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(90deg, ${palette.background} 34%, transparent 68%)`,
          }}
        />
        <div style={{ position: "absolute", inset: 0, padding: cq(pad), width: "58%", display: "flex", flexDirection: "column", justifyContent: "flex-end", ...anim }}>
          <Eyebrow />
          <Heading size={h1 * 0.9} />
          <Rule />
          <Body />
        </div>
        <Frame palette={palette} logo={logo} pad={pad} name={slide.name} />
      </div>
    );
  }

  return (
    <div style={root}>
      <Frame palette={palette} logo={logo} pad={pad} name={slide.name} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: cq(pad),
          display: "flex",
          flexDirection: stacked ? "column" : reversed ? "row-reverse" : "row",
          alignItems: stacked ? "stretch" : "center",
          gap: cq(stacked ? 3 : 4.5),
        }}
      >
        <div style={{ flex: stacked ? "0 0 auto" : "1 1 44%", minWidth: 0 }}>{textBlock}</div>
        {secondary ? (
          <div
            style={{
              flex: stacked ? "1 1 auto" : "1 1 52%",
              minWidth: 0,
              height: stacked ? "auto" : "62%",
              display: "flex",
              alignItems: "flex-end",
              ...anim,
            }}
          >
            {secondary}
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
    <>
      <div
        style={{
          position: "absolute",
          left: cq(pad),
          right: cq(pad),
          bottom: cq(pad * 0.45),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: cq(1.05),
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: palette.muted,
        }}
      >
        <span>{name}</span>
        {logo ? (
          <img src={logo} alt="" style={{ height: cq(2.2), objectFit: "contain", opacity: 0.9 }} />
        ) : null}
      </div>
    </>
  );
}

function mix(a: string, b: string, t: number) {
  const pa = hex(a);
  const pb = hex(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i]! - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function hex(h: string): number[] {
  const s = h.replace("#", "");
  const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0);
}
