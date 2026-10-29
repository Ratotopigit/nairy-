/**
 * Content for previews. A brand-new webinar still has placeholder text, which
 * makes every template look empty; for previews (the gallery) that text is
 * swapped for realistic sample content in the template's own category. The
 * webinar's images, colours and fonts are always kept, so a host sees THEIR
 * brand in every design.
 */
import { CATEGORY_SAMPLES, type TemplateCategory } from "@/lib/webinar-templates";
import { SAMPLE_COPY } from "@/lib/training-copy";
import { emptyWebinar, type Webinar } from "@/lib/webinars";

const PLACEHOLDER_TITLE = emptyWebinar("").title;

export function hasPlaceholderContent(w: Pick<Webinar, "title">): boolean {
  return !w.title.trim() || w.title === PLACEHOLDER_TITLE;
}

export function previewWebinar(w: Webinar, category: TemplateCategory, templateId: string): Webinar {
  const next: Webinar = { ...w, template_id: templateId, status: "published" };
  if (!next.next_session_at) {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(10, 0, 0, 0);
    next.next_session_at = d.toISOString();
  }
  if (!hasPlaceholderContent(w)) return next;
  const sample = CATEGORY_SAMPLES[category];
  return {
    ...next,
    title: sample.title,
    subtitle: sample.subtitle,
    bullets: [...sample.outcomes],
    presenter_name: w.presenter_name || sample.host,
    presenter_title: w.presenter_title || sample.hostTitle,
    host_bio: w.host_bio || sample.bio,
    // Whatever the host has already written wins over the sample text.
    page_copy: { ...SAMPLE_COPY, ...w.page_copy },
    social_proof: w.social_proof || "Trusted by 1,200 coaches and consultants",
    brand_name: w.brand_name || sample.brand,
    brand_tagline: w.brand_tagline || sample.tagline,
  };
}
