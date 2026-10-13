"use client";

/**
 * The five compositions. Each is a different arrangement of the same parts,
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
          <Media src={hero.src} focusX={hero.fx} focusY={hero.fy} fallback={<DateMark />} priority />
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

export { HostCredit };
