/**
 * Illustrations for the templates: small flat scenes with people where the
 * topic suits one (coaching, teaching, presenting), objects where it doesn't
 * (a house, a rocket, a chart). Pure SVG in each template's own colours, so
 * there is nothing to download and they stay crisp at any size.
 *
 * A few parts move gently (float, sway, a chart line drawing itself). Nothing
 * blinks, and all of it stops for people who ask for reduced motion.
 */
import type { TemplateArt as ArtKind, WebinarTemplate } from "@/lib/webinar-templates";

type Props = {
  art: ArtKind;
  colors: WebinarTemplate["colors"];
  className?: string;
  /** No motion: thumbnails, so a grid of them doesn't fidget. */
  still?: boolean;
};

type Look = { skin: string; hair: string; top: string; bottom: string; shoe?: string; hairStyle?: "short" | "long" | "bun" };
type Arm = "down" | "point" | "wave" | "hold" | "mic";

/** A standing person; (x, y) is between the feet. */
function Person({ x, y, look, arm = "down", flip = false, scale = 1 }: { x: number; y: number; look: Look; arm?: Arm; flip?: boolean; scale?: number }) {
  const right: Record<Arm, { d: string; hand: [number, number] }> = {
    down: { d: "M16 -82 Q22 -66 20 -50", hand: [20, -48] },
    point: { d: "M16 -82 Q28 -88 40 -100", hand: [42, -102] },
    wave: { d: "M16 -82 Q27 -96 26 -112", hand: [26, -115] },
    hold: { d: "M16 -82 Q26 -78 34 -88", hand: [36, -90] },
    mic: { d: "M16 -82 Q26 -86 10 -97", hand: [9, -98] },
  };
  const r = right[arm];
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      <ellipse cx="0" cy="1" rx="24" ry="3.5" fill="#000" opacity="0.08" />
      <rect x="-11" y="-47" width="9" height="44" rx="4" fill={look.bottom} />
      <rect x="2" y="-47" width="9" height="44" rx="4" fill={look.bottom} />
      <rect x="-15" y="-6" width="13" height="6" rx="3" fill={look.shoe ?? "#2b2522"} />
      <rect x="2" y="-6" width="13" height="6" rx="3" fill={look.shoe ?? "#2b2522"} />
      <path d="M-17 -84 Q-19 -62 -15 -43 L15 -43 Q19 -62 17 -84 Q0 -91 -17 -84Z" fill={look.top} />
      <rect x="-4" y="-93" width="8" height="10" rx="3" fill={look.skin} />
      <path d="M-16 -82 Q-22 -66 -20 -50" stroke={look.top} strokeWidth="7" strokeLinecap="round" fill="none" />
      <circle cx="-20" cy="-48" r="3.6" fill={look.skin} />
      <path d={r.d} stroke={look.top} strokeWidth="7" strokeLinecap="round" fill="none" />
      <circle cx={r.hand[0]} cy={r.hand[1]} r="3.6" fill={look.skin} />
      <Head cy={-102} look={look} />
    </g>
  );
}

/** Head with hair; faceless on purpose (calm, editorial, never uncanny). */
function Head({ cy, look, r = 11 }: { cy: number; look: Look; r?: number }) {
  const s = r / 11;
  return (
    <g transform={`translate(0 ${cy}) scale(${s})`}>
      {look.hairStyle === "long" ? (
        <path d="M-12 1 Q-14 -17 0 -16 Q14 -17 12 1 L13 17 Q8 19 7 13 L7 -3 Q0 -7 -7 -3 L-7 13 Q-8 19 -13 17Z" fill={look.hair} />
      ) : null}
      <circle cx="0" cy="0" r="11" fill={look.skin} />
      {look.hairStyle === "long" ? (
        <path d="M-11.5 -1 Q-12 -15 0 -15 Q12 -15 11.5 -1 Q6 -9 -2 -8 Q-8 -7 -11.5 -1Z" fill={look.hair} />
      ) : (
        <path d="M-11.5 -1 Q-12 -15 0 -15 Q12 -15 11.5 -1 Q8 -8 0 -8 Q-7 -8 -11.5 -1Z" fill={look.hair} />
      )}
      {look.hairStyle === "bun" ? <ellipse cx="0" cy="-16" rx="6" ry="5" fill={look.hair} /> : null}
    </g>
  );
}

/** Head and shoulders behind a desk or table; y is the table edge. */
function Seated({ x, y, look, lean = 0 }: { x: number; y: number; look: Look; lean?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${lean})`}>
      <path d="M-21 0 L-21 -28 Q-21 -42 -8 -44 L8 -44 Q21 -42 21 -28 L21 0Z" fill={look.top} />
      <rect x="-4" y="-51" width="8" height="9" rx="3" fill={look.skin} />
      <path d="M-18 -34 Q-27 -14 -14 -3" stroke={look.top} strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M18 -34 Q27 -14 14 -3" stroke={look.top} strokeWidth="7" strokeLinecap="round" fill="none" />
      <circle cx="-12" cy="-2" r="3.6" fill={look.skin} />
      <circle cx="12" cy="-2" r="3.6" fill={look.skin} />
      <Head cy={-61} look={look} r={12} />
    </g>
  );
}

function Plant({ x, y, pot, leaf, sway }: { x: number; y: number; pot: string; leaf: string; sway: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={sway}>
        <path d="M0 -20 Q-14 -34 -16 -52 Q-2 -42 0 -20Z" fill={leaf} />
        <path d="M0 -20 Q12 -38 22 -50 Q18 -30 0 -20Z" fill={leaf} opacity="0.8" />
        <path d="M0 -20 Q-2 -44 4 -62 Q10 -42 0 -20Z" fill={leaf} opacity="0.9" />
      </g>
      <path d="M-11 -20 L11 -20 L8 0 L-8 0Z" fill={pot} />
    </g>
  );
}

function Sparkle({ x, y, size, fill }: { x: number; y: number; size: number; fill: string }) {
  const s = size;
  return <path d={`M${x} ${y - s} Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s}Z`} fill={fill} />;
}

export function TemplateArt({ art, colors, className, still = false }: Props) {
  const { hero, accent, soft, surface, ink, line } = colors;
  const float = still ? "" : "wt-float";
  const floatSlow = still ? "" : "wt-float wt-float-slow";
  const sway = still ? "" : "wt-sway";
  const draw = still ? "" : "wt-draw";

  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="200" fill={soft} />

      {art === "desk" ? (
        <g>
          <rect x="112" y="24" width="66" height="56" rx="8" fill={surface} opacity="0.7" />
          <path d="M145 24 V80 M112 52 H178" stroke={soft} strokeWidth="3" />
          <g className={float}>
            <rect x="18" y="30" width="62" height="44" rx="9" fill={surface} />
            <rect x="28" y="56" width="8" height="10" rx="2" fill={hero} opacity="0.5" />
            <rect x="40" y="48" width="8" height="18" rx="2" fill={hero} opacity="0.75" />
            <rect x="52" y="40" width="8" height="26" rx="2" fill={accent} />
            <rect x="28" y="38" width="18" height="4" rx="2" fill={line} />
          </g>
          <Seated x={86} y={140} look={{ skin: "#e3ab8c", hair: "#3a2a20", top: hero, bottom: ink, hairStyle: "long" }} />
          <rect x="58" y="110" width="56" height="31" rx="5" fill="#e9e5de" />
          <path d="M86 120 q4 6 0 12 q-4 -6 0 -12z" fill={accent} opacity="0.8" />
          <rect x="14" y="140" width="176" height="8" rx="3" fill={ink} opacity="0.85" />
          <rect x="30" y="148" width="6" height="52" fill={ink} opacity="0.6" />
          <rect x="168" y="148" width="6" height="52" fill={ink} opacity="0.6" />
          <rect x="126" y="124" width="13" height="16" rx="3" fill={accent} />
          <path d="M139 128 q6 0 6 5 q0 5 -6 5" stroke={accent} strokeWidth="2.5" fill="none" />
          <Plant x={166} y={140} pot={surface} leaf={hero} sway={sway} />
        </g>
      ) : null}

      {art === "conversation" ? (
        <g>
          <path d="M0 150 Q100 132 200 150 V200 H0Z" fill={hero} opacity="0.18" />
          <g className={float}>
            <rect x="18" y="26" width="70" height="36" rx="14" fill={surface} />
            <path d="M44 62 L40 74 L54 62Z" fill={surface} />
            <rect x="30" y="38" width="44" height="4" rx="2" fill={line} />
            <rect x="30" y="47" width="30" height="4" rx="2" fill={line} />
          </g>
          <g className={floatSlow}>
            <rect x="110" y="44" width="72" height="34" rx="14" fill={accent} />
            <path d="M152 78 L158 90 L144 78Z" fill={accent} />
            <rect x="122" y="55" width="46" height="4" rx="2" fill={surface} opacity="0.85" />
            <rect x="122" y="64" width="28" height="4" rx="2" fill={surface} opacity="0.85" />
          </g>
          <Seated x={58} y={156} lean={4} look={{ skin: "#8d5a3c", hair: "#1f1612", top: hero, bottom: ink, hairStyle: "bun" }} />
          <Seated x={142} y={156} lean={-4} look={{ skin: "#f1c6a5", hair: "#7a4a2a", top: ink, bottom: ink, hairStyle: "short" }} />
          <ellipse cx="100" cy="160" rx="64" ry="8" fill={surface} />
          <rect x="96" y="160" width="8" height="40" fill={surface} opacity="0.9" />
          <rect x="88" y="146" width="10" height="13" rx="2" fill={accent} opacity="0.9" />
          <rect x="102" y="148" width="10" height="11" rx="2" fill={hero} opacity="0.7" />
        </g>
      ) : null}

      {art === "presenter" ? (
        <g>
          <rect x="94" y="34" width="94" height="76" rx="10" fill={surface} />
          <rect x="104" y="44" width="34" height="5" rx="2.5" fill={line} />
          <rect x="108" y="82" width="10" height="18" rx="2" fill={hero} opacity="0.45" />
          <rect x="124" y="72" width="10" height="28" rx="2" fill={hero} opacity="0.7" />
          <rect x="140" y="64" width="10" height="36" rx="2" fill={hero} />
          <rect x="156" y="54" width="10" height="46" rx="2" fill={accent} />
          <path className={draw} d="M106 76 L126 66 L146 58 L170 46" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M120 110 L112 150 M162 110 L170 150" stroke={ink} strokeWidth="3" opacity="0.5" />
          <Person x={62} y={186} arm="point" look={{ skin: "#c98e6a", hair: "#2b1d16", top: accent, bottom: ink, hairStyle: "short" }} />
          <Plant x={20} y={186} pot={hero} leaf={ink} sway={sway} />
        </g>
      ) : null}

      {art === "meditate" ? (
        <g>
          <path d="M-10 150 Q40 104 92 138 Q140 96 210 132 V200 H-10Z" fill={hero} opacity="0.28" />
          <path d="M-10 166 Q60 138 120 160 Q170 146 210 160 V200 H-10Z" fill={hero} opacity="0.4" />
          <g className={sway}>
            <path d="M30 170 Q22 130 34 96" stroke={ink} strokeWidth="2" fill="none" opacity="0.6" />
            <path d="M33 120 Q16 110 18 96 Q32 104 33 120Z" fill={accent} opacity="0.8" />
            <path d="M31 142 Q48 134 50 118 Q34 124 31 142Z" fill={accent} opacity="0.65" />
          </g>
          <g transform="translate(100 172)">
            <ellipse cx="0" cy="2" rx="40" ry="5" fill="#000" opacity="0.07" />
            <path d="M-34 0 Q-32 -17 0 -15 Q32 -17 34 0 Q0 7 -34 0Z" fill={ink} opacity="0.85" />
            <path d="M-16 -14 Q-19 -36 -15 -54 Q0 -60 15 -54 Q19 -36 16 -14Z" fill={accent} />
            <rect x="-4" y="-63" width="8" height="10" rx="3" fill="#f0c4a4" />
            <path d="M-15 -50 Q-30 -30 -24 -10" stroke={accent} strokeWidth="7" strokeLinecap="round" fill="none" />
            <path d="M15 -50 Q30 -30 24 -10" stroke={accent} strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="-24" cy="-8" r="3.6" fill="#f0c4a4" />
            <circle cx="24" cy="-8" r="3.6" fill="#f0c4a4" />
            <Head cy={-73} look={{ skin: "#f0c4a4", hair: "#4a2e1f", top: accent, bottom: ink, hairStyle: "bun" }} />
          </g>
          <g className={floatSlow}>
            <path d="M150 52 Q160 44 170 52 Q160 60 150 52Z" fill={accent} opacity="0.55" />
            <path d="M126 34 Q133 28 140 34 Q133 40 126 34Z" fill={hero} opacity="0.7" />
          </g>
        </g>
      ) : null}

      {art === "megaphone" ? (
        <g>
          <g className={float}>
            <rect x="20" y="30" width="44" height="38" rx="10" fill={surface} />
            <path d="M42 58 C30 50 30 40 37 40 C40 40 42 43 42 45 C42 43 44 40 47 40 C54 40 54 50 42 58Z" fill={accent} />
          </g>
          <g className={floatSlow}>
            <rect x="140" y="126" width="46" height="38" rx="10" fill={ink} />
            <rect x="150" y="146" width="6" height="10" rx="1.5" fill={hero} />
            <rect x="160" y="140" width="6" height="16" rx="1.5" fill={hero} />
            <rect x="170" y="134" width="6" height="22" rx="1.5" fill={hero} />
          </g>
          <Person x={66} y={188} arm="hold" look={{ skin: "#6b4430", hair: "#141010", top: ink, bottom: "#3a3a3a", hairStyle: "short" }} />
          <g transform="translate(102 98) rotate(-14)">
            <path d="M0 -6 L36 -20 L36 20 L0 6Z" fill={accent} />
            <rect x="-6" y="-7" width="8" height="14" rx="2" fill={ink} />
            <rect x="34" y="-21" width="5" height="42" rx="2" fill={ink} />
          </g>
          <g stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8">
            <path d="M152 70 Q160 80 156 92" />
            <path d="M162 62 Q174 80 166 100" />
            <path d="M172 54 Q188 80 176 108" />
          </g>
        </g>
      ) : null}

      {art === "stage" ? (
        <g>
          <rect width="200" height="200" fill={hero} />
          <path d="M100 -10 L36 178 L164 178Z" fill={surface} opacity="0.16" />
          <path d="M100 -10 L62 178 L138 178Z" fill={surface} opacity="0.12" />
          <ellipse cx="100" cy="180" rx="86" ry="14" fill={soft} opacity="0.25" />
          <path d="M0 0 H40 Q32 50 38 100 Q30 150 36 200 H0Z" fill={accent} />
          <path d="M14 0 Q8 100 14 200 M26 0 Q20 100 26 200" stroke="#000" strokeOpacity="0.15" strokeWidth="2" fill="none" />
          <path d="M200 0 H160 Q168 50 162 100 Q170 150 164 200 H200Z" fill={accent} />
          <path d="M186 0 Q192 100 186 200 M174 0 Q180 100 174 200" stroke="#000" strokeOpacity="0.15" strokeWidth="2" fill="none" />
          <path d="M0 0 H200 V16 Q150 26 100 16 Q50 26 0 16Z" fill={accent} opacity="0.9" />
          <Person x={100} y={178} arm="mic" look={{ skin: "#d9a07c", hair: "#2a1a12", top: soft, bottom: "#2a2422", hairStyle: "long" }} />
          <g transform="translate(100 178)">
            <rect x="7" y="-104" width="5" height="9" rx="2.5" fill="#2a2422" />
          </g>
        </g>
      ) : null}

      {art === "teacher" ? (
        <g>
          <rect x="78" y="30" width="110" height="78" rx="8" fill={ink} />
          <rect x="78" y="104" width="110" height="6" rx="2" fill={hero} />
          <g stroke={surface} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.9">
            <path d="M92 48 H130" />
            <path d="M92 58 H118" />
            <path d="M144 78 L160 50 L176 78Z" />
            <path className={draw} d="M92 88 Q102 72 112 88 T132 88" />
          </g>
          <text x="140" y="96" fontSize="13" fontWeight="700" fontFamily="Arial, sans-serif" fill={hero}>A+</text>
          <Person x={54} y={186} arm="point" look={{ skin: "#a86f4c", hair: "#1c1410", top: accent, bottom: ink, hairStyle: "bun" }} />
          <g>
            <rect x="132" y="168" width="54" height="10" rx="2" fill={accent} />
            <rect x="136" y="158" width="46" height="10" rx="2" fill={hero} />
            <rect x="130" y="148" width="50" height="10" rx="2" fill={ink} opacity="0.75" />
            <rect x="0" y="178" width="200" height="22" fill={hero} opacity="0.22" />
          </g>
          <g className={float}>
            <Sparkle x={34} y={40} size={7} fill={hero} />
          </g>
        </g>
      ) : null}

      {art === "house" ? (
        <g>
          <rect x="0" y="160" width="200" height="40" fill={hero} opacity="0.14" />
          <g>
            <rect x="34" y="128" width="5" height="34" rx="2" fill={hero} />
            <path className={sway} d="M36 92 C18 98 16 126 36 132 C56 126 54 98 36 92Z" fill={hero} opacity="0.75" />
          </g>
          <rect x="62" y="96" width="112" height="66" fill={surface} />
          <path d="M54 100 L182 74 L182 84 L54 110Z" fill={hero} />
          <rect x="72" y="112" width="52" height="36" rx="2" fill={accent} opacity="0.35" />
          <path d="M98 112 V148 M72 130 H124" stroke={hero} strokeWidth="2.5" />
          <rect x="134" y="118" width="22" height="44" rx="2" fill={hero} />
          <rect x="150" y="138" width="3" height="5" rx="1" fill={accent} />
          <path d="M138 162 L152 162 L166 200 L126 200Z" fill={line} opacity="0.8" />
          <g className={float}>
            <g transform="translate(150 34) rotate(18)">
              <circle cx="0" cy="0" r="9" fill="none" stroke={accent} strokeWidth="4" />
              <path d="M9 0 H34 M26 0 V7 M32 0 V6" stroke={accent} strokeWidth="4" strokeLinecap="round" />
            </g>
          </g>
        </g>
      ) : null}

      {art === "rocket" ? (
        <g>
          <g fill={surface}>
            <path d="M14 172 q0 -14 16 -14 q6 -12 20 -8 q14 -4 18 10 q12 2 10 12 Z" />
            <path d="M124 186 q0 -10 12 -10 q6 -10 18 -6 q12 -2 14 8 q10 2 8 8 Z" opacity="0.8" />
          </g>
          <circle cx="160" cy="58" r="18" fill={hero} />
          <ellipse cx="160" cy="58" rx="30" ry="8" fill="none" stroke={accent} strokeWidth="3" transform="rotate(-16 160 58)" />
          <path d="M60 156 Q78 130 92 118" stroke={accent} strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" fill="none" opacity="0.7" />
          <g className={float}>
            <g transform="translate(104 98) rotate(40)">
              <path d="M0 -50 Q18 -28 17 12 L-17 12 Q-18 -28 0 -50Z" fill={surface} />
              <path d="M0 -50 Q10 -40 13 -30 L-13 -30 Q-10 -40 0 -50Z" fill={accent} />
              <circle cx="0" cy="-12" r="8" fill={hero} />
              <circle cx="0" cy="-12" r="8" fill="none" stroke={line} strokeWidth="3" />
              <path d="M-17 2 L-28 20 L-17 14Z" fill={accent} />
              <path d="M17 2 L28 20 L17 14Z" fill={accent} />
              <path d="M-9 13 Q0 40 9 13Z" fill="#f59e0b" />
              <path d="M-5 13 Q0 28 5 13Z" fill="#fde68a" />
            </g>
          </g>
          <Sparkle x={42} y={44} size={8} fill={accent} />
          <Sparkle x={70} y={70} size={4} fill={hero} />
          <Sparkle x={182} y={118} size={5} fill={accent} />
        </g>
      ) : null}

      {art === "botanical" ? (
        <g>
          <rect x="40" y="22" width="120" height="150" rx="14" fill={surface} opacity="0.6" />
          <g className={sway}>
            <path d="M100 150 Q96 100 70 64" stroke={hero} strokeWidth="2.5" fill="none" />
            <path d="M70 64 Q46 72 50 100 Q66 104 80 86 Q84 72 70 64Z" fill={hero} opacity="0.85" />
            <path d="M100 150 Q104 96 134 58" stroke={hero} strokeWidth="2.5" fill="none" />
            <path d="M134 58 Q160 64 158 92 Q140 98 126 82 Q122 66 134 58Z" fill={accent} opacity="0.8" />
            <path d="M100 150 Q100 90 102 40" stroke={hero} strokeWidth="2.5" fill="none" />
            <path d="M102 40 Q86 52 90 74 Q104 78 112 62 Q114 48 102 40Z" fill={hero} opacity="0.65" />
            <path d="M58 82 Q66 84 74 78 M144 78 Q136 80 132 74 M96 58 Q102 62 106 58" stroke={surface} strokeWidth="1.6" fill="none" opacity="0.7" />
          </g>
          <path d="M76 146 H124 L118 186 Q100 192 82 186Z" fill={accent} />
          <path d="M76 146 H124" stroke={ink} strokeOpacity="0.15" strokeWidth="3" />
        </g>
      ) : null}

      {art === "creative" ? (
        <g>
          <path d="M54 26c32-18 80-8 92 26s-8 58-38 70-70 4-80-28 0-50 26-68z" fill={hero} opacity="0.85" />
          <path d="M108 104c26-10 62 4 66 32s-22 46-50 44-46-22-40-44 8-24 24-32z" fill={accent} opacity="0.85" />
          <path className={draw} d="M26 160 Q60 120 96 150 T170 120" stroke={surface} strokeWidth="9" strokeLinecap="round" fill="none" />
          <g className={float}>
            <g transform="translate(118 64) rotate(35)">
              <rect x="-4" y="-34" width="8" height="46" rx="4" fill={ink} />
              <rect x="-5" y="10" width="10" height="8" rx="1.5" fill={surface} />
              <path d="M-5 18 Q-6 32 0 38 Q6 32 5 18Z" fill={accent} />
            </g>
          </g>
          <Sparkle x={40} y={44} size={7} fill={surface} />
          <Sparkle x={170} y={40} size={5} fill={accent} />
        </g>
      ) : null}

      {art === "arcs" ? (
        <g fill="none" strokeLinecap="round">
          <path d="M20 182 A80 80 0 0 1 180 182" stroke={hero} strokeWidth="16" opacity="0.6" />
          <path d="M50 182 A50 50 0 0 1 150 182" stroke={accent} strokeWidth="16" />
          <path d="M80 182 A20 20 0 0 1 120 182" stroke={hero} strokeWidth="16" />
          <rect x="138" y="34" width="26" height="26" rx="6" fill={accent} stroke="none" opacity="0.9" transform="rotate(14 151 47)" />
          <rect x="44" y="56" width="16" height="16" rx="4" fill={hero} stroke="none" opacity="0.6" transform="rotate(-12 52 64)" />
        </g>
      ) : null}

      {art === "peaks" ? (
        <g>
          {[40, 80, 120].map((y) => (
            <line key={y} x1="0" y1={y} x2="200" y2={y} stroke={hero} strokeOpacity="0.2" />
          ))}
          <path d="M0 172 L40 132 L70 146 L110 92 L140 112 L188 50 L188 200 L0 200 Z" fill={hero} opacity="0.85" />
          <path className={draw} d="M0 172 L40 132 L70 146 L110 92 L140 112 L188 50" fill="none" stroke={accent} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M176 46 L192 42 L188 58Z" fill={accent} />
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
