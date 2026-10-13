/**
 * Generated artwork for a template, used when the host has no photo and in
 * template thumbnails. Pure SVG in the template's colours: no image files,
 * nothing to load, crisp at any size.
 */
import type { TemplateArt as ArtKind, WebinarTemplate } from "@/lib/webinar-templates";

type Props = {
  art: ArtKind;
  colors: WebinarTemplate["colors"];
  className?: string;
};

export function TemplateArt({ art, colors, className }: Props) {
  const { hero, accent, soft, surface } = colors;
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="200" fill={soft} />
      {art === "orbits" ? (
        <g fill="none" strokeWidth="2">
          <circle cx="100" cy="100" r="74" stroke={hero} opacity="0.35" />
          <circle cx="100" cy="100" r="50" stroke={hero} opacity="0.55" />
          <circle cx="100" cy="100" r="26" fill={hero} stroke="none" />
          <circle cx="174" cy="100" r="9" fill={accent} stroke="none" />
          <circle cx="65" cy="56" r="6" fill={accent} stroke="none" opacity="0.8" />
        </g>
      ) : null}
      {art === "waves" ? (
        <g fill="none" strokeWidth="9" strokeLinecap="round">
          {[60, 92, 124, 156].map((y, i) => (
            <path
              key={y}
              d={`M-10 ${y} C 30 ${y - 22}, 70 ${y + 22}, 110 ${y} S 190 ${y - 22}, 220 ${y}`}
              stroke={i % 2 ? accent : hero}
              opacity={0.35 + i * 0.15}
            />
          ))}
        </g>
      ) : null}
      {art === "grid" ? (
        <g>
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={i * 25} y1="0" x2={i * 25} y2="200" stroke={hero} strokeOpacity="0.35" />
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 25} x2="200" y2={i * 25} stroke={hero} strokeOpacity="0.35" />
          ))}
          <rect x="50" y="50" width="100" height="100" rx="18" fill="none" stroke={accent} strokeWidth="3" />
          <circle cx="150" cy="50" r="7" fill={accent} />
          <circle cx="50" cy="150" r="5" fill={hero} />
        </g>
      ) : null}
      {art === "sunburst" ? (
        <g>
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return (
              <line
                key={i}
                x1="100"
                y1="150"
                x2={100 + Math.cos(a) * 140}
                y2={150 + Math.sin(a) * 140}
                stroke={hero}
                strokeWidth="6"
                opacity="0.45"
              />
            );
          })}
          <circle cx="100" cy="150" r="52" fill={accent} />
          <circle cx="100" cy="150" r="34" fill={hero} />
        </g>
      ) : null}
      {art === "blobs" ? (
        <g>
          <path d="M60 30c30-18 78-8 90 26s-8 58-38 70-70 4-80-28 0-50 28-68z" fill={hero} opacity="0.85" />
          <path d="M110 110c26-10 62 4 66 32s-22 46-50 44-46-22-40-44 8-24 24-32z" fill={accent} opacity="0.85" />
          <circle cx="52" cy="150" r="20" fill={surface} opacity="0.9" />
        </g>
      ) : null}
      {art === "stripes" ? (
        <g>
          {Array.from({ length: 7 }, (_, i) => (
            <rect key={i} x={-40 + i * 44} y="-20" width="18" height="260" fill={i % 3 === 1 ? accent : hero} opacity={i % 3 === 1 ? 0.9 : 0.25} transform="rotate(20 100 100)" />
          ))}
          <rect x="40" y="40" width="120" height="120" fill="none" stroke={hero} strokeWidth="2" />
        </g>
      ) : null}
      {art === "dots" ? (
        <g>
          {Array.from({ length: 64 }, (_, i) => {
            const x = 16 + (i % 8) * 24;
            const y = 16 + Math.floor(i / 8) * 24;
            const big = (i * 7) % 11 === 0;
            return <circle key={i} cx={x} cy={y} r={big ? 8 : 3.5} fill={big ? accent : hero} opacity={big ? 0.95 : 0.5} />;
          })}
        </g>
      ) : null}
      {art === "peaks" ? (
        <g>
          <path d="M0 170 L40 130 L70 145 L110 90 L140 110 L200 40 L200 200 L0 200 Z" fill={hero} opacity="0.85" />
          <path d="M0 170 L40 130 L70 145 L110 90 L140 110 L200 40" fill="none" stroke={accent} strokeWidth="5" strokeLinejoin="round" />
          <circle cx="200" cy="40" r="8" fill={accent} />
          {[40, 80, 120].map((y) => (
            <line key={y} x1="0" y1={y} x2="200" y2={y} stroke={hero} strokeOpacity="0.2" />
          ))}
        </g>
      ) : null}
      {art === "rings" ? (
        <g fill="none">
          {[84, 66, 48, 30].map((r, i) => (
            <circle key={r} cx="100" cy="100" r={r} stroke={i % 2 ? accent : hero} strokeWidth={i === 0 ? 2 : 6} opacity={0.4 + i * 0.15} />
          ))}
          <circle cx="100" cy="100" r="12" fill={accent} />
        </g>
      ) : null}
      {art === "petals" ? (
        <g transform="translate(100 100)">
          {Array.from({ length: 8 }, (_, i) => (
            <ellipse key={i} cx="0" cy="-46" rx="18" ry="44" fill={i % 2 ? hero : accent} opacity={i % 2 ? 0.8 : 0.55} transform={`rotate(${i * 45})`} />
          ))}
          <circle r="16" fill={accent} />
        </g>
      ) : null}
      {art === "arcs" ? (
        <g fill="none" strokeLinecap="round">
          <path d="M20 180 A80 80 0 0 1 180 180" stroke={hero} strokeWidth="16" opacity="0.6" />
          <path d="M50 180 A50 50 0 0 1 150 180" stroke={accent} strokeWidth="16" />
          <path d="M80 180 A20 20 0 0 1 120 180" stroke={hero} strokeWidth="16" />
          <circle cx="150" cy="50" r="16" fill={accent} stroke="none" opacity="0.9" />
        </g>
      ) : null}
      {art === "bolt" ? (
        <g>
          {Array.from({ length: 6 }, (_, i) => (
            <rect key={i} x={-60 + i * 50} y="-20" width="20" height="260" fill={hero} opacity="0.18" transform="rotate(-25 100 100)" />
          ))}
          <path d="M112 20 L58 112 L96 112 L84 180 L144 84 L104 84 Z" fill={accent} />
        </g>
      ) : null}
    </svg>
  );
}
