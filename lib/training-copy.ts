/**
 * Every line of text on the Training registration page and its thank-you page
 * that a host can change. Plain data and pure functions (no imports), so
 * lib/webinars.ts and the tests can use it.
 *
 *   fallback  what a live page shows until the host writes their own ("" = the
 *             element is hidden: claims, testimonials, offers and links are
 *             never made up for a host)
 *   sample    illustrative text for the gallery and the editor preview while a
 *             new webinar still has placeholder content, and the input hint
 *
 * A host's value always wins; an emptied field hides its element.
 */

export type CopyGroupId = "top" | "story" | "signup" | "proof" | "footer" | "thanks" | "offer";

export const COPY_GROUPS: { id: CopyGroupId; title: string; hint: string }[] = [
  { id: "top", title: "Top of the page", hint: "The first screen of the Training page." },
  { id: "story", title: "The story", hint: "The long-form copy under the host. Leave a field empty to hide it." },
  { id: "signup", title: "Sign-up card and ending", hint: "The registration card and the closing call to action." },
  { id: "proof", title: "Testimonial", hint: "Shown on both pages. Use a real quote from a real person." },
  { id: "footer", title: "Footer", hint: "Disclaimer and links, shown at the bottom of both pages." },
  { id: "thanks", title: "Thank-you page", hint: "What people see right after they register." },
  { id: "offer", title: "Thank-you bonus offer", hint: "An optional dark offer card on the thank-you page. Leave the heading empty to show a simple inbox reminder instead." },
];

type Def = { group: CopyGroupId; label: string; max: number; long?: boolean; fallback: string; sample: string };

const COPY = {
  // top
  audience: { group: "top", label: "Who it's for", max: 120, fallback: "", sample: "For coaches, consultants and course creators" },
  cta_note: { group: "top", label: "Note under the button", max: 90, fallback: "Free. Takes 20 seconds to register.", sample: "Free. Takes 20 seconds to register." },
  fine_print: { group: "top", label: "Small print", max: 90, fallback: "No credit card needed.", sample: "No credit card needed. No experience required." },
  trust_label: { group: "top", label: "Trust strip heading", max: 90, fallback: "", sample: "Trusted by thousands of professionals. As seen in" },
  trust_items: { group: "top", label: "Trust strip names, one per line", max: 240, long: true, fallback: "", sample: "Daily Startup\nThe Growth Journal\nTop Rated Training\n40+ Countries" },
  // story
  story_title: { group: "story", label: "Heading", max: 160, fallback: "", sample: "What if your next 10 clients came in without a single sales call, DM or live show?" },
  story_body: {
    group: "story",
    label: "Paragraphs, one per line",
    max: 1400,
    long: true,
    fallback: "",
    sample:
      "That's exactly what's happening for people who use this approach right now.\n**Here's the truth most people won't tell you:**\nYou don't need to be famous. You don't need a giant audience. The people you want to reach are already searching, and this training shows you how to be there when they do.",
  },
  bonus_title: { group: "story", label: "Bonus box title", max: 40, fallback: "Bonus", sample: "Bonus" },
  bonus_text: { group: "story", label: "Bonus box text", max: 320, long: true, fallback: "", sample: "The same system also powers launches, client acquisition and free-trial conversion, so every hour of work pays you four ways." },
  learn_title: { group: "story", label: "Outcomes heading", max: 80, fallback: "What you'll walk away with", sample: "What you'll walk away with" },
  foryou_title: { group: "story", label: "\"This is for you if\" heading", max: 90, fallback: "", sample: "This is for you if you've ever thought:" },
  foryou_items: {
    group: "story",
    label: "\"This is for you if\" lines, one per line",
    max: 700,
    long: true,
    fallback: "",
    sample: "\"I'm posting every day and barely getting clients.\"\n\"I tried live events and they're exhausting.\"\n\"Most tools are too expensive and too complicated.\"",
  },
  foryou_close: { group: "story", label: "Highlighted closing line", max: 120, fallback: "", sample: "Good. That's exactly who this works best for." },
  // signup
  access_sub: { group: "signup", label: "Sign-up card subtitle", max: 120, fallback: "Register now and we'll email your details right away.", sample: "Register now and we'll email your details right away." },
  final_title: { group: "signup", label: "Closing heading", max: 100, fallback: "Save your free seat today", sample: "Get instant access and save your free seat today" },
  final_text: { group: "signup", label: "Closing text", max: 320, long: true, fallback: "", sample: "If you want a simple way to land new clients and sales, this is the fastest path we know. Register and we'll send everything over." },
  final_note: { group: "signup", label: "Closing small print", max: 140, fallback: "By registering you agree to receive event reminders. Unsubscribe any time.", sample: "By registering you agree to receive event reminders. Unsubscribe any time." },
  // proof
  testimonial_quote: { group: "proof", label: "Quote", max: 220, long: true, fallback: "", sample: "Filled my calendar with 14 new clients in 30 days." },
  testimonial_by: { group: "proof", label: "Who said it", max: 80, fallback: "", sample: "Verified attendee" },
  // footer
  disclaimer: { group: "footer", label: "Disclaimer", max: 520, long: true, fallback: "", sample: "Results shown are not typical and not a guarantee of your results. Specific results depend on your effort, experience and offer." },
  privacy_url: { group: "footer", label: "Privacy policy link (https)", max: 300, fallback: "", sample: "https://example.com/privacy" },
  terms_url: { group: "footer", label: "Terms link (https)", max: 300, fallback: "", sample: "https://example.com/terms" },
  // thanks
  thanks_label: { group: "thanks", label: "Label above the heading", max: 60, fallback: "Your seat is locked in", sample: "Your seat is locked in" },
  thanks_title: { group: "thanks", label: "Heading", max: 120, fallback: "You're registered.", sample: "You're in." },
  thanks_highlight: { group: "thanks", label: "Highlighted part of the heading", max: 140, fallback: "", sample: "You're about to attend a training you'll use for years." },
  thanks_text: { group: "thanks", label: "Intro text", max: 320, long: true, fallback: "Check your email for your webinar details.", sample: "This is the exact system used to land new clients and sales, without sales calls or a sales team." },
  thanks_chip: { group: "thanks", label: "Confirmed badge", max: 50, fallback: "Your seat is confirmed", sample: "Your seat is confirmed" },
  learn2_label: { group: "thanks", label: "\"What you'll learn\" label", max: 80, fallback: "On this training you'll learn", sample: "On this free training you're about to learn" },
  learn2_title: { group: "thanks", label: "\"What you'll learn\" heading (empty = your webinar title)", max: 160, fallback: "", sample: "" },
  learn2_text: { group: "thanks", label: "\"What you'll learn\" text", max: 320, long: true, fallback: "", sample: "Whether you coach, sell courses, run an agency or build software, here's exactly what you'll see." },
  tile_texts: {
    group: "thanks",
    label: "Card descriptions, one per outcome, in order",
    max: 700,
    long: true,
    fallback: "",
    sample: "The full workflow that attracts, books and closes new clients around the clock.\nHow one automated session does the convincing that used to eat your week.\nThe exact steps, with no big audience and no experience needed.",
  },
  steps_label: { group: "thanks", label: "Steps label", max: 80, fallback: "Before you go, do these 2 things", sample: "Before you go, do these 2 things" },
  steps_title: { group: "thanks", label: "Steps heading", max: 100, fallback: "Lock in your spot.", sample: "Lock in your spot, then unlock your bonus." },
  step1_title: { group: "thanks", label: "Step 1 heading", max: 100, fallback: "Add the training to your calendar", sample: "Add the training to your calendar and save your link to join" },
  step1_text: { group: "thanks", label: "Step 1 text", max: 240, long: true, fallback: "So you don't miss it. Your link to join is in your email.", sample: "Add it to your calendar so you don't miss it, then copy your unique link below." },
  // offer
  offer_label: { group: "offer", label: "Offer label", max: 70, fallback: "", sample: "Registrants only, limited time" },
  offer_title: { group: "offer", label: "Offer heading (empty hides the offer card)", max: 140, fallback: "", sample: "Grab your special 14-day free trial of our software." },
  offer_text: { group: "offer", label: "Offer text", max: 420, long: true, fallback: "", sample: "Because you registered, you've unlocked a longer free trial that isn't on our homepage. Build and launch before the training even ends." },
  offer_old: { group: "offer", label: "Standard offer (struck through)", max: 60, fallback: "", sample: "Standard: 7-day trial" },
  offer_new: { group: "offer", label: "Your offer", max: 60, fallback: "", sample: "Yours: 14 days free" },
  offer_points: { group: "offer", label: "Benefits, one per line", max: 420, long: true, fallback: "", sample: "Everything in the Pro plan\nBuilt-in email and SMS\nAutomated and live rooms\nFunnel pages and analytics" },
  offer_button: { group: "offer", label: "Offer button text", max: 50, fallback: "Claim my offer", sample: "Claim my 14-day free trial" },
  offer_url: { group: "offer", label: "Offer button link (https)", max: 300, fallback: "", sample: "https://example.com/offer" },
  offer_note: { group: "offer", label: "Offer small print", max: 160, fallback: "", sample: "This offer is reserved for registrants and won't be here later." },
  offer_trust: { group: "offer", label: "Offer trust line", max: 80, fallback: "", sample: "Cancel anytime in one click" },
} satisfies Record<string, Def>;

export type CopyKey = keyof typeof COPY;
export type CopyField = Def & { key: CopyKey };

export const COPY_FIELDS: CopyField[] = (Object.keys(COPY) as CopyKey[]).map((key) => ({ key, ...(COPY as Record<CopyKey, Def>)[key] }));

/** Typed text store: only known keys, strings, within each field's length. */
export function cleanCopy(raw: unknown): Partial<Record<CopyKey, string>> {
  const out: Partial<Record<CopyKey, string>> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const f of COPY_FIELDS) {
    const v = (raw as Record<string, unknown>)[f.key];
    if (typeof v === "string") out[f.key] = v.slice(0, f.max);
  }
  return out;
}

/** The text to show: the host's own, else the field's fallback. Trimmed. */
export function copyOf(store: Partial<Record<CopyKey, string>> | undefined, key: CopyKey): string {
  const own = store?.[key];
  return (own === undefined ? COPY[key].fallback : own).trim();
}

/** The sample text for every field, for previews of a still-placeholder webinar. */
export const SAMPLE_COPY: Partial<Record<CopyKey, string>> = Object.fromEntries(COPY_FIELDS.filter((f) => f.sample).map((f) => [f.key, f.sample]));

/** Non-empty trimmed lines of a text field. */
export function copyLines(value: string): string[] {
  return value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

/** Only real https links are ever rendered as links. */
export function safeUrl(value: string): string {
  const v = value.trim();
  return /^https:\/\/[^\s"'<>]+$/i.test(v) ? v : "";
}
