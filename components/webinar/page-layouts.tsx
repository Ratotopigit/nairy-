"use client";

/**
 * The twelve compositions. Each is a different arrangement of the same parts,
 * not a recolour: they differ in hero structure, image placement, text
 * alignment, where the form sits and how they recompose on a phone.
 * Spacing, sizing and breakpoints live in registration.css.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, CalendarCheck, Check, CirclePlay, Clock, Copy, Lightbulb, Mail, Rocket, Sparkles, Target, TrendingUp, Users, Zap } from "lucide-react";
import {
  Bio,
  BrandMark,
  CalendarButtons,
  DateMark,
  Footer,
  Headline,
  HostBlock,
  HostCredit,
  Kicker,
  Media,
  Outcomes,
  Proof,
  RegisterPanel,
  SessionBlock,
  Subtitle,
  WhenLine,
  initials,
  usePage,
} from "@/components/webinar/page-parts";
import { ensureContrast, mix } from "@/lib/color";
import { splitHeadline } from "@/lib/headline";
import { seedWithOverrides } from "@/lib/webinar-templates";
import { calendarEvent } from "@/lib/webinars";

/** The main photograph: the hero image, else the portrait (still a real photo), else nothing. */
function useHeroSource() {
  const { w } = usePage();
  if (w.image_url) return { src: w.image_url, fx: w.image_focus_x, fy: w.image_focus_y };
  if (w.portrait_url) return { src: w.portrait_url, fx: w.portrait_focus_x, fy: w.portrait_focus_y };
  return { src: "", fx: 50, fy: 50 };
}

// ── 1. Editorial ──────────────────────────────────────────────────────────

export function EditorialLayout() {
  const hero = useHeroSource();
  return (
    <>
      <header className="wp-e-mast">
        <div className="wp-wrap wp-e-mast-in">
          <BrandMark />
          <p className="wp-e-meta">
            <WhenLine short />
          </p>
        </div>
      </header>
      <main className="wp-wrap wp-e-grid">
        <div className="wp-e-top">
          <Kicker />
          <Headline />
          <Subtitle />
        </div>
        <div className="wp-e-side">
          <Media className="wp-e-media" src={hero.src} focusX={hero.fx} focusY={hero.fy} fallback={<DateMark />} priority />
          <RegisterPanel className="wp-e-panel" />
        </div>
        <div className="wp-e-list">
          <Outcomes />
          <HostBlock />
        </div>
      </main>
      <Footer />
    </>
  );
}

// ── 2. Photography-led ────────────────────────────────────────────────────

export function PhotoLayout() {
  const { w } = usePage();
  return (
    <div className="wp-p">
      <section className="wp-p-hero">
        <Media className="wp-p-bg" src={w.image_url} focusX={w.image_focus_x} focusY={w.image_focus_y} priority />
        <div className="wp-p-scrim" />
        <div className="wp-wrap wp-p-in">
          <BrandMark />
          <div className="wp-p-copy">
            <Kicker />
            <Headline />
            <Subtitle />
            <p className="wp-p-when">
              <WhenLine />
            </p>
          </div>
        </div>
      </section>
      <div className="wp-p-panelrow">
        <div className="wp-wrap">
          <RegisterPanel float />
        </div>
      </div>
      <section className="wp-wrap wp-p-below">
        <Outcomes cols />
        <div className="wp-p-below-meta">
          <HostBlock />
        </div>
      </section>
      <Footer />
    </div>
  );
}

// ── 3. Modern minimal ─────────────────────────────────────────────────────

export function MinimalLayout() {
  const { w } = usePage();
  return (
    <div className="wp-m wp-wrap">
      <div className="wp-m-head">
        <BrandMark />
      </div>
      <div className="wp-m-col">
        <Kicker />
        <Headline />
        <Subtitle />
        <SessionBlock />
        <div className="wp-m-form">
          <RegisterPanel title={null} compact bare />
        </div>
      </div>
      {w.image_url ? (
        <Media className="wp-m-image" src={w.image_url} focusX={w.image_focus_x} focusY={w.image_focus_y} />
      ) : null}
      <div className="wp-m-lower">
        <Outcomes cols />
        <HostBlock />
      </div>
      <Footer />
    </div>
  );
}

// ── 4. Host spotlight ─────────────────────────────────────────────────────

export function HostLayout() {
  const { w, hostName } = usePage();
  return (
    <div className="wp-h">
      <section className="wp-h-hero">
        {w.image_url ? (
          <div className="wp-h-bg" aria-hidden="true">
            <Media src={w.image_url} focusX={w.image_focus_x} focusY={w.image_focus_y} />
          </div>
        ) : null}
        <div className="wp-wrap wp-h-inner">
          <BrandMark />
          <div className="wp-h-grid">
            <div className="wp-h-copy">
              <Kicker />
              <Headline />
              <Subtitle />
              <p className="wp-h-when">
                <WhenLine />
              </p>
            </div>
            <figure className="wp-h-portrait">
              <Media
                src={w.portrait_url}
                focusX={w.portrait_focus_x}
                focusY={w.portrait_focus_y}
                mark={hostName ? initials(hostName) : undefined}
                alt={hostName}
                priority
              />
              {hostName ? (
                <figcaption className="wp-h-cap">
                  <strong>{hostName}</strong>
                  {w.presenter_title ? <span>{w.presenter_title}</span> : null}
                </figcaption>
              ) : null}
            </figure>
          </div>
        </div>
      </section>
      <div className="wp-wrap wp-h-band">
        <RegisterPanel float title="Reserve your seat" />
      </div>
      <section className="wp-wrap wp-h-below">
        <Outcomes cols />
        {w.host_bio.trim() || w.social_proof.trim() ? (
          <div style={{ display: "grid", gap: "1rem" }}>
            <Bio />
            <Proof />
          </div>
        ) : null}
      </section>
      <Footer />
    </div>
  );
}

// ── 5. Creative asymmetric ────────────────────────────────────────────────

export function AsymmetricLayout() {
  const hero = useHeroSource();
  const { w, hostName } = usePage();
  return (
    <div className="wp-a">
      <header className="wp-wrap wp-a-head">
        <BrandMark />
        <p className="wp-e-meta">
          <WhenLine short />
        </p>
      </header>
      <main className="wp-wrap wp-a-grid">
        <div className="wp-a-visual">
          <div className="wp-a-frame">
            <Media src={hero.src} focusX={hero.fx} focusY={hero.fy} fallback={<DateMark />} priority />
          </div>
          {hostName ? (
            <p className="wp-a-tag">
              <strong>{hostName}</strong>
              {w.presenter_title}
            </p>
          ) : null}
        </div>
        <div className="wp-a-copy">
          <Kicker />
          <Headline />
          <Subtitle />
        </div>
        <div className="wp-a-panel">
          <RegisterPanel float />
        </div>
        <div className="wp-a-list">
          <Outcomes cols title={null} />
          {w.host_bio.trim() || w.social_proof.trim() ? (
            <div className="wp-a-about">
              <Bio />
              <Proof />
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ── 6. Split screen ───────────────────────────────────────────────────────

export function SplitLayout() {
  const hero = useHeroSource();
  return (
    <div className="wp-s">
      <section className="wp-s-art">
        {hero.src ? <Media className="wp-s-bg" src={hero.src} focusX={hero.fx} focusY={hero.fy} priority /> : null}
        <div className="wp-s-scrim" />
        <div className="wp-s-in">
          <BrandMark />
          <div className="wp-s-copy">
            <Kicker />
            <Headline />
            <Subtitle />
            <p className="wp-s-when">
              <WhenLine />
            </p>
          </div>
          <HostCredit />
        </div>
      </section>
      <main className="wp-s-main">
        <div className="wp-s-form">
          <RegisterPanel bare />
          <Outcomes />
        </div>
        <Footer />
      </main>
    </div>
  );
}

// ── 7. Poster ─────────────────────────────────────────────────────────────

export function PosterLayout() {
  const { w } = usePage();
  return (
    <div className="wp-x wp-wrap">
      <header className="wp-x-head">
        <BrandMark />
        <p className="wp-e-meta">
          <WhenLine short />
        </p>
      </header>
      <div className="wp-x-title">
        <Kicker />
        <Headline />
      </div>
      {w.image_url ? <Media className="wp-x-image" src={w.image_url} focusX={w.image_focus_x} focusY={w.image_focus_y} priority /> : null}
      <div className="wp-x-strip">
        <div className="wp-x-col wp-x-about">
          <Subtitle />
          <HostBlock />
        </div>
        <div className="wp-x-col wp-x-learn">
          <Outcomes title="Inside" />
        </div>
        <div className="wp-x-col wp-x-form">
          <RegisterPanel bare />
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ── 8. Letter ─────────────────────────────────────────────────────────────

export function LetterLayout() {
  const hero = useHeroSource();
  return (
    <div className="wp-l wp-wrap">
      <header className="wp-l-head">
        <BrandMark />
      </header>
      <div className="wp-l-grid">
        <aside className="wp-l-rail">
          <p className="wp-label">When</p>
          <SessionBlock />
          <HostBlock />
        </aside>
        <main className="wp-l-main">
          <Kicker />
          <Headline />
          <div className="wp-l-lead">
            <Subtitle />
          </div>
          {hero.src ? <Media className="wp-l-image" src={hero.src} focusX={hero.fx} focusY={hero.fy} priority /> : null}
          <Outcomes title="What you'll take away" />
          <RegisterPanel title="Save your seat" compact />
        </main>
      </div>
      <Footer />
    </div>
  );
}

// ── 9. Bento ──────────────────────────────────────────────────────────────

export function BentoLayout() {
  const hero = useHeroSource();
  const { w, hostName } = usePage();
  const hasHost = Boolean(hostName || w.host_bio.trim() || w.social_proof.trim());
  return (
    <div className="wp-b wp-wrap">
      <header className="wp-b-top">
        <BrandMark />
        <p className="wp-e-meta">
          <WhenLine short />
        </p>
      </header>
      <div className="wp-b-grid" data-host={hasHost ? "" : undefined}>
        <section className="wp-b-tile wp-b-head">
          <Kicker />
          <Headline />
          <Subtitle />
        </section>
        <section className="wp-b-tile wp-b-date">
          <SessionBlock />
        </section>
        <div className="wp-b-tile wp-b-img">
          <Media src={hero.src} focusX={hero.fx} focusY={hero.fy} mark={hostName ? initials(hostName) : undefined} priority />
        </div>
        <section className="wp-b-tile wp-b-out">
          <Outcomes title="What you'll learn" />
        </section>
        <section className="wp-b-tile wp-b-form">
          <RegisterPanel bare title="Reserve your seat" compact />
        </section>
        {hasHost ? (
          <section className="wp-b-tile wp-b-host">
            <HostBlock />
          </section>
        ) : null}
      </div>
      <Footer />
    </div>
  );
}

// ── 10. Programme ─────────────────────────────────────────────────────────

export function AgendaLayout() {
  const hero = useHeroSource();
  const { w, hostName } = usePage();
  const hasHost = Boolean(hostName || w.host_bio.trim() || w.social_proof.trim());
  return (
    <div className="wp-g">
      <div className="wp-g-brand">
        <BrandMark />
      </div>
      <div className="wp-g-copy">
        <Kicker />
        <Headline />
        <Subtitle />
        <p className="wp-g-when">
          <WhenLine />
        </p>
        {hero.src ? <Media className="wp-g-image" src={hero.src} focusX={hero.fx} focusY={hero.fy} priority /> : null}
      </div>
      <div className="wp-g-form">
        <RegisterPanel bare />
      </div>
      <div className="wp-g-list">
        <Outcomes title="The programme" />
        {w.host_bio.trim() || w.social_proof.trim() ? (
          <div className="wp-g-about">
            <Bio />
            <Proof />
          </div>
        ) : null}
      </div>
      {hasHost ? (
        <div className="wp-g-host">
          <HostCredit />
        </div>
      ) : null}
      <div className="wp-g-foot">
        <Footer />
      </div>
    </div>
  );
}

// ── 11. Focus card ────────────────────────────────────────────────────────

export function CardLayout() {
  const hero = useHeroSource();
  return (
    <div className="wp-c">
      <Media className="wp-c-bg" src={hero.src} focusX={hero.fx} focusY={hero.fy} priority />
      <div className="wp-c-scrim" />
      <div className="wp-c-wrap">
        <div className="wp-c-card">
          <div className="wp-c-copy">
            <BrandMark />
            <Kicker />
            <Headline />
            <Subtitle />
            <div className="wp-c-out">
              <Outcomes title={null} />
            </div>
            <HostCredit />
          </div>
          <div className="wp-c-form">
            <RegisterPanel bare />
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

// ── 12. Sales training (with its own full thank-you page) ─────────────────

const NIGHT = "#0b0920";

/** Night-sky hero tones tinted by the brand, and a highlight colour that reads on them. */
function useNightVars(): CSSProperties {
  const { t, w } = usePage();
  const seed = seedWithOverrides(t.seed, w);
  const top = mix(NIGHT, seed.brand, 0.3);
  const night = mix(NIGHT, seed.brand, 0.08);
  return { "--t-top": top, "--t-night": night, "--t-hl": ensureContrast(mix(seed.accent, "#ffffff", 0.25), [top, night], 4.5) } as CSSProperties;
}

function Highlighted({ text }: { text: string }) {
  const [lead, tail] = splitHeadline(text);
  return (
    <>
      {lead}
      {tail ? (
        <>
          {" "}
          <em className="wp-t-hl">{tail}</em>
        </>
      ) : null}
    </>
  );
}

function JumpButton() {
  const { w, form } = usePage();
  return (
    <button type="button" className="wp-btn wp-t-big" onClick={form.jump}>
      {w.cta_label || "Register now"}
      <ArrowRight aria-hidden="true" />
    </button>
  );
}

export function TrainingLayout() {
  const { form, brandName } = usePage();
  const vars = useNightVars();
  const top = useRef<HTMLDivElement>(null);
  // The thank-you page replaces the whole page, so start it from the top.
  useEffect(() => {
    if (form.done) top.current?.scrollIntoView({ block: "start" });
  }, [form.done]);
  return (
    <div ref={top} className="wp-t" style={vars}>
      {form.done ? <TrainingThanks /> : <TrainingRegister />}
      {brandName ? (
        <div className="wp-t-foot">
          <Footer />
        </div>
      ) : null}
    </div>
  );
}

function TrainingRegister() {
  const { w, phase, hostName, outcomes } = usePage();
  const open = phase !== "ended";
  const minutes = w.duration_minutes;
  return (
    <>
      <section className="wp-t-hero">
        {w.image_url ? <Media className="wp-t-photo" src={w.image_url} focusX={w.image_focus_x} focusY={w.image_focus_y} priority /> : null}
        <div className="wp-wrap wp-t-hero-in">
          <BrandMark />
          <Kicker />
          <h1 className="wp-h1">
            <Highlighted text={w.title || "Your webinar title"} />
          </h1>
          <Subtitle />
          <p className="wp-t-chips">
            <span>
              <CirclePlay aria-hidden="true" />
              <WhenLine short />
            </span>
            {minutes ? (
              <span>
                <Clock aria-hidden="true" />
                {minutes}-minute training
              </span>
            ) : null}
          </p>
          {open ? (
            <div className="wp-t-cta">
              <JumpButton />
              <p className="wp-t-note">Free. Takes 20 seconds to register.</p>
            </div>
          ) : null}
          {w.social_proof.trim() ? (
            <p className="wp-t-proof">
              <Zap aria-hidden="true" />
              {w.social_proof}
            </p>
          ) : null}
        </div>
      </section>
      <section className="wp-t-body">
        <div className="wp-t-col">
          {hostName ? (
            <div className="wp-t-host">
              <Media
                className="wp-t-face"
                src={w.portrait_url}
                focusX={w.portrait_focus_x}
                focusY={w.portrait_focus_y}
                mark={initials(hostName)}
                alt={hostName}
              />
              <p className="wp-label">Presented by</p>
              <p className="wp-t-name">{hostName}</p>
              {w.presenter_title ? <p className="wp-host-title">{w.presenter_title}</p> : null}
              <Bio />
            </div>
          ) : null}
          {outcomes.length ? (
            <div className="wp-t-learn">
              <p className="wp-label">What you&apos;ll walk away with</p>
              <ul>
                {outcomes.map((item, i) => (
                  <li key={i}>
                    <span className="wp-t-tick" aria-hidden="true">
                      <Check />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="wp-t-card">
            <p className="wp-t-card-bar">{phase === "live" ? "Happening now" : "Free registration"}</p>
            <div className="wp-t-card-in">
              <div className="wp-t-card-head">
                <span className="wp-t-play" aria-hidden="true">
                  <CirclePlay />
                </span>
                <h2>{minutes ? `Free ${minutes}-minute training` : "Free training"}</h2>
                <p className="wp-t-card-sub">
                  <WhenLine />
                </p>
              </div>
              <RegisterPanel bare compact title={null} />
            </div>
          </div>
        </div>
      </section>
      {open ? (
        <section className="wp-t-final">
          <div className="wp-t-col wp-t-center">
            <Kicker />
            <h2 className="wp-t-h2">Save your free seat today</h2>
            <p className="wp-t-lead">
              <WhenLine />
            </p>
            <JumpButton />
            <p className="wp-t-note">Free. We never spam. Unsubscribe any time.</p>
          </div>
        </section>
      ) : null}
    </>
  );
}

const TILE_ICONS = [TrendingUp, Users, Rocket, Target, Lightbulb];

function TrainingThanks() {
  const { w, phase, when, joinUrl, mode, form, outcomes } = usePage();
  const event = calendarEvent(w, joinUrl);
  const seeYou = phase === "live" ? "Join us now." : when ? `See you on ${when.weekday}.` : "See you there.";
  return (
    <>
      <section className="wp-t-hero">
        <div className="wp-wrap wp-t-hero-in">
          <BrandMark />
          <Kicker>
            <Sparkles aria-hidden="true" />
            Your seat is locked in
          </Kicker>
          <h1 className="wp-h1">
            You&apos;re registered. <em className="wp-t-hl">{seeYou}</em>
          </h1>
          <p className="wp-sub">
            Check your email for your webinar details.
            {w.thank_you_message.trim() ? ` ${w.thank_you_message.trim()}` : ""}
          </p>
          <p className="wp-t-chips">
            <span>
              <CalendarCheck aria-hidden="true" />
              Your seat is confirmed
            </span>
          </p>
        </div>
      </section>
      <section className="wp-t-body">
        <div className="wp-t-col">
          {outcomes.length ? (
            <div className="wp-t-center">
              <p className="wp-label">On this training you&apos;ll learn</p>
              <h2 className="wp-t-h2">
                <Highlighted text={w.title || "Your webinar title"} />
              </h2>
              <div className="wp-t-cards">
                {outcomes.map((item, i) => {
                  const Icon = TILE_ICONS[i % TILE_ICONS.length];
                  return (
                    <div key={i} className="wp-t-tile">
                      <span className="wp-t-icon" aria-hidden="true">
                        <Icon />
                      </span>
                      <p>{item}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="wp-t-center">
            <p className="wp-label">Before you go, do these 2 things</p>
            <h2 className="wp-t-h2">Lock in your spot.</h2>
          </div>
          <div className="wp-t-step">
            <span className="wp-t-num" aria-hidden="true">
              1
            </span>
            <h3>Add the training to your calendar</h3>
            <p>So you don&apos;t miss it. Your link to join is in your email{joinUrl ? " and right here" : ""}.</p>
            <div className="wp-t-card">
              <p className="wp-t-card-bar">Your countdown, calendar &amp; link to join</p>
              <div className="wp-t-card-in">
                <SessionBlock />
                {event && phase !== "ended" ? <CalendarButtons event={event} /> : null}
                {joinUrl ? <JoinLink url={joinUrl} /> : null}
              </div>
            </div>
          </div>
          <div className="wp-t-step">
            <span className="wp-t-num" aria-hidden="true">
              2
            </span>
            <div className="wp-t-night">
              <Kicker>
                <Mail aria-hidden="true" />
                Check your inbox
              </Kicker>
              <h3>Your confirmation is on its way</h3>
              <p>
                We sent your details to <strong>{form.email.trim() || "your email"}</strong>. Not there in a couple of minutes? Check your spam or
                promotions folder and mark it as safe, so the reminder reaches you too.
              </p>
            </div>
          </div>
          {w.social_proof.trim() ? <p className="wp-t-quote">{w.social_proof.trim()}</p> : null}
          {mode === "preview" ? (
            <button type="button" className="wp-cal-btn wp-t-back" onClick={form.reset}>
              Back to the form
            </button>
          ) : null}
        </div>
      </section>
    </>
  );
}

function JoinLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="wp-t-link">
      <p className="wp-label">Your link to join</p>
      <div className="wp-t-link-row">
        <a href={url} target="_blank" rel="noopener noreferrer">
          {url}
        </a>
        <button
          type="button"
          className="wp-cal-btn"
          aria-label={copied ? "Link copied" : "Copy your link to join"}
          onClick={() => void navigator.clipboard?.writeText(url).then(() => setCopied(true), () => undefined)}
        >
          {copied ? <Check /> : <Copy />}
        </button>
      </div>
    </div>
  );
}

export { HostCredit };
