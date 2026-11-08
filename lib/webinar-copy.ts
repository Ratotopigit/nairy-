// Pure helpers for lib/webinar-ai.ts, kept free of Firebase so node:test can import them.
import type { Webinar, WEBINAR_LIMITS } from "./webinars";

export type WebinarCopy = {
  title: string;
  subtitle: string;
  bullets: string[];
  cta_label: string;
  presenter_title: string;
  host_bio: string;
  social_proof: string;
  thank_you_message: string;
};

export type CopyField = keyof WebinarCopy;
export const COPY_FIELDS: CopyField[] = ["title", "subtitle", "bullets", "cta_label", "presenter_title", "host_bio", "social_proof", "thank_you_message"];

// `satisfies` makes tsc fail if these drift from WEBINAR_LIMITS (its values are literal types).
const LIMITS = { title: 120, subtitle: 240, bullet: 140, hostTitle: 80, hostBio: 280, socialProof: 100 } satisfies Pick<
  typeof WEBINAR_LIMITS,
  "title" | "subtitle" | "bullet" | "hostTitle" | "hostBio" | "socialProof"
>;
const MAX: Record<Exclude<CopyField, "bullets">, number> = {
  title: LIMITS.title,
  subtitle: LIMITS.subtitle,
  cta_label: 40,
  presenter_title: LIMITS.hostTitle,
  host_bio: LIMITS.hostBio,
  social_proof: LIMITS.socialProof,
  thank_you_message: 240,
};
export const OUTCOMES = 3;

/** Clips at a word boundary so a long field never ends mid-word. */
function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:\-]+$/, "");
}

/**
 * The first balanced {...} in a model reply, parsed. Code fences and any text
 * around the object are ignored. Throws a readable error when there is none.
 */
export function extractJson(reply: string): Record<string, unknown> {
  const text = reply.replace(/```(?:json)?/gi, "");
  const start = text.indexOf("{");
  if (start < 0) throw new Error("The AI didn't send page copy back. Please try again.");
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) {
      try {
        const parsed: unknown = JSON.parse(text.slice(start, i + 1));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
      } catch {
        break;
      }
      break;
    }
  }
  throw new Error("The AI's answer was cut off or unreadable. Please try again.");
}

/** A reply string or parsed object, made into a complete WebinarCopy. Missing or wrong-typed fields become "". */
export function coerceWebinarCopy(raw: unknown): WebinarCopy {
  const obj = typeof raw === "string" ? extractJson(raw) : raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const bullets = Array.isArray(obj.bullets) ? obj.bullets : [];
  return {
    title: clip(obj.title, MAX.title),
    subtitle: clip(obj.subtitle, MAX.subtitle),
    bullets: bullets.map((b) => clip(b, LIMITS.bullet)).filter(Boolean).slice(0, OUTCOMES),
    cta_label: clip(obj.cta_label, MAX.cta_label),
    presenter_title: clip(obj.presenter_title, MAX.presenter_title),
    host_bio: clip(obj.host_bio, MAX.host_bio),
    social_proof: clip(obj.social_proof, MAX.social_proof),
    thank_you_message: clip(obj.thank_you_message, MAX.thank_you_message),
  };
}

export type CopyTarget = Pick<Webinar, CopyField | "name">;
/** The text a new webinar starts with (emptyWebinar). */
export type CopySample = Pick<Webinar, CopyField>;

/**
 * Fields still empty or holding starter text. createWebinar copies the host's
 * internal name into the headline, so a headline equal to the name counts too.
 */
export function sampleFields(w: CopyTarget, sample: CopySample): CopyField[] {
  return COPY_FIELDS.filter((key) => {
    if (key === "bullets") {
      const cur = w.bullets.map((b) => b.trim()).filter(Boolean);
      return !cur.length || (cur.length === sample.bullets.length && cur.every((b, i) => b === sample.bullets[i]));
    }
    const cur = w[key].trim();
    return !cur || cur === sample[key] || (key === "title" && cur === w.name.trim());
  });
}

/** Only the fields to change. With onlyEmpty, the host's own words are never touched. */
export function copyPatch(w: CopyTarget, copy: WebinarCopy, opts: { onlyEmpty: boolean; sample: CopySample }): Partial<WebinarCopy> {
  const allowed = opts.onlyEmpty ? sampleFields(w, opts.sample) : COPY_FIELDS;
  const patch: Partial<WebinarCopy> = {};
  for (const key of allowed) {
    if (key === "bullets") {
      if (copy.bullets.length && copy.bullets.join("\n") !== w.bullets.join("\n")) patch.bullets = [...copy.bullets];
    } else if (copy[key] && copy[key] !== w[key]) {
      patch[key] = copy[key];
    }
  }
  return patch;
}
