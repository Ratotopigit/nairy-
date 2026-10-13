"use client";

/**
 * The eleven compositions. Each is a different arrangement of the same parts,
 * not a recolour: they differ in hero structure, image placement, text
 * alignment, where the form sits and how they recompose on a phone.
 * Spacing, sizing and breakpoints live in registration.css.
 */
import {
  Bio,
  BrandMark,
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

export { HostCredit };
