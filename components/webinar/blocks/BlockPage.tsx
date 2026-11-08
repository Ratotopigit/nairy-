"use client";

/**
 * Pages built in the page builder (lib/page-blocks.ts), drawn in the
 * webinar's template colours and fonts.
 *
 * BlockPage is the standalone page (builder canvas, replay page, watch room). BlockList is
 * the same blocks inside a page that already provides the registration state
 * (RegistrationPage), so a form block there is the page's one real form, with
 * its sticky button and its join link.
 *
 * Block text is always rendered as text, never HTML. The html block lives only
 * in a sandboxed iframe without allow-same-origin.
 */
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import "@/components/webinar/registration.css";
import { CalendarButtons, PageProvider, RegisterPanel, initials, usePage } from "@/components/webinar/page-parts";
import { splitDuration, useNow, useRegistration } from "@/components/webinar/blocks/registration-state";
import { allLeaves, type Block, type BlockStyle, type ButtonBlock, type HtmlBlock, type ImageBlock, type LeafBlock, type ListBlock, type PageId, type PresenterBlock, type TimerBlock, type VideoBlock } from "@/lib/page-blocks";
import { videoEmbedUrl } from "@/lib/webinar-access";
import { calendarEvent, isValidPaymentUrl, registrationUrl, sessionEnd, sessionStart, type Webinar } from "@/lib/webinars";
import { fetchJoinUrl, recentRegistrant, viewUrl } from "@/components/webinar/blocks/watch-link";

export type BlockPath = [number] | [number, number, number]; // top index, or [top, column, index]

type Wrap = (block: Block, path: BlockPath, node: React.ReactNode) => React.ReactNode;

type Props = {
  webinar: Webinar;
  page: PageId;
  blocks: Block[];
  /** "live" on the public site, "preview" in the editor (no network, no real sign-up). */
  mode: "live" | "preview";
  /** Registration form submit; omit in preview. Must resolve on success, throw on failure. */
  onRegister?: (name: string, email: string) => Promise<void>;
  /** Called after a successful sign-up from a form block. */
  onRegistered?: () => void;
  /** Builder only: wraps every rendered block, including blocks inside columns, for selection and dragging. */
  wrap?: Wrap;
};

/** The watch room's own background and button colours over the template's. */
function watchThemed(w: Webinar): Webinar {
  const { bg, accent } = w.watch_room;
  return bg || accent ? { ...w, theme_bg: bg || w.theme_bg, theme_accent: accent || w.theme_accent } : w;
}

export function BlockPage({ webinar, page, blocks, mode, onRegister, onRegistered, wrap }: Props) {
  const { state, vars, dataAttrs } = useRegistration({
    webinar: page === "watch" ? watchThemed(webinar) : webinar,
    mode,
    onRegister,
    onRegistered,
    // The thank-you page is what a signed-up visitor sees.
    startDone: page === "thanks",
    blockThanks: true,
  });
  return (
    <div className="wp-root" style={vars}>
      <div className="wp" {...dataAttrs}>
        <PageProvider value={state}>
          {page === "watch" ? <BrandBar w={webinar} /> : null}
          <BlockList page={page} blocks={blocks} wrap={wrap} />
        </PageProvider>
      </div>
    </div>
  );
}

/** The blocks alone; needs a PageProvider above it. */
export function BlockList({ page, blocks, wrap }: { page: PageId; blocks: Block[]; wrap?: Wrap }) {
  const { mode } = usePage();
  const top = useRef<HTMLDivElement>(null);
  // A visitor who just signed up lands at the top of the thank-you page.
  useEffect(() => {
    if (mode === "live" && page === "thanks") top.current?.scrollIntoView({ block: "start" });
  }, [mode, page]);
  // Only the first form block (columns included) is the one the sticky button and "form" buttons scroll to.
  const firstForm = allLeaves(blocks).find((b) => b.type === "form")?.id;
  return (
    <div ref={top} className="wpb" data-preview={mode === "preview" ? "" : undefined}>
      {blocks.map((block, i) => {
        const node =
          block.type === "columns" ? (
            <Shell key={block.id} style={block.style} wide>
              <div className="wpb-cols" style={{ "--cols": block.columns.length } as CSSProperties}>
                {block.columns.map((col, c) => (
                  <div key={c} className="wpb-col">
                    {col.map((leaf, j) => {
                      const inner = (
                        <Shell key={leaf.id} style={leaf.style} nested>
                          <Leaf block={leaf} page={page} primaryForm={leaf.id === firstForm} />
                        </Shell>
                      );
                      return wrap ? <Fragment key={leaf.id}>{wrap(leaf, [i, c, j], inner)}</Fragment> : inner;
                    })}
                  </div>
                ))}
              </div>
            </Shell>
          ) : (
            <Shell key={block.id} style={block.style} wide={block.type === "html" || block.type === "video" || block.type === "watch-player"}>
              <Leaf block={block} page={page} primaryForm={block.id === firstForm} />
            </Shell>
          );
        return wrap ? <Fragment key={block.id}>{wrap(block, [i], node)}</Fragment> : node;
      })}
    </div>
  );
}

const JUSTIFY = { left: "flex-start", center: "center", right: "flex-end" } as const;

/** One block's band: its own background, text colour, alignment and padding over the theme. */
function Shell({ style, wide, nested, children }: { style: BlockStyle; wide?: boolean; nested?: boolean; children: ReactNode }) {
  const css: Record<string, string | number> = {
    textAlign: style.align,
    paddingBlock: style.pad,
    "--jc": JUSTIFY[style.align],
  };
  if (style.bg) css.background = style.bg;
  if (style.color) {
    css.color = style.color;
    css["--ink"] = style.color;
    css["--muted"] = `color-mix(in srgb, ${style.color} 74%, transparent)`;
    css["--brand-text"] = style.color;
  }
  return (
    <div className="wpb-block" data-align={style.align} data-nested={nested ? "" : undefined} data-has-bg={style.bg ? "" : undefined} style={css as CSSProperties}>
      {nested ? children : <div className="wpb-in" data-wide={wide ? "" : undefined}>{children}</div>}
    </div>
  );
}

/** What a block shows in the editor when it has nothing to show visitors yet. */
function Note({ children }: { children: ReactNode }) {
  const { mode } = usePage();
  return mode === "preview" ? <p className="wpb-note">{children}</p> : null;
}

function Leaf({ block, page, primaryForm }: { block: LeafBlock; page: PageId; primaryForm: boolean }) {
  switch (block.type) {
    case "heading": {
      if (!block.text.trim()) return <Note>Add a heading.</Note>;
      const H = (`h${block.level}`) as "h1" | "h2" | "h3";
      return (
        <H className="wp-h1 wpb-h" data-level={block.level}>
          {block.text}
        </H>
      );
    }
    case "text":
      return block.text.trim() ? <p className="wpb-text">{block.text}</p> : <Note>Add some text.</Note>;
    case "image":
      return <ImageView block={block} />;
    case "video":
      return <VideoView block={block} page={page} />;
    case "button":
      return <ButtonView block={block} />;
    case "form":
      return <FormView label={block.button} primary={primaryForm} />;
    case "timer":
      return <TimerView block={block} />;
    case "presenter":
      return <PresenterView block={block} />;
    case "list":
      return <ListView block={block} />;
    case "spacer":
      return <div className="wpb-spacer" style={{ height: block.height }} aria-hidden="true" />;
    case "divider":
      return <hr className="wpb-divider" />;
    case "html":
      return <HtmlView block={block} />;
    case "session-link":
      return <SessionLinkView label={block.label} />;
    case "share":
      return <ShareView label={block.label} />;
    case "calendar":
      return <CalendarView label={block.label} />;
    case "watch-player":
      return <WatchPlayerView />;
  }
}

// ── Media ─────────────────────────────────────────────────────────────────

function ImageView({ block }: { block: ImageBlock }) {
  const [broken, setBroken] = useState<string | null>(null);
  if (!block.url || broken === block.url) return <Note>{block.url ? "This image couldn't be loaded." : "Add an image."}</Note>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="wpb-img" src={block.url} alt={block.alt} loading="lazy" decoding="async" style={{ width: `${block.width}%` }} onError={() => setBroken(block.url)} />
  );
}

function Player({ src, title }: { src: string; title: string }) {
  const { mode } = usePage();
  return (
    <div className="wp-media" style={{ aspectRatio: "16 / 9" }}>
      <iframe
        src={src}
        title={title}
        allow="encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        // In the builder the block wrapper takes focus, not the frame inside it.
        tabIndex={mode === "preview" ? -1 : undefined}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
      />
    </div>
  );
}

function VideoView({ block, page }: { block: VideoBlock; page: PageId }) {
  const { w, form } = usePage();
  if (block.source === "webinar") {
    // The session video is what an on-demand sign-up unlocks; a paid one is delivered through checkout. Same rule as the template.
    if (w.access_type === "paid") return <Note>The webinar video isn&apos;t shown on paid webinars; buyers get it through checkout.</Note>;
    if (w.delivery_type !== "automated") return <Note>The webinar video plays for on-demand webinars. Choose the replay or a custom video instead.</Note>;
    if (page === "registration" && !form.done) return <Note>The webinar video appears here once a visitor signs up.</Note>;
  }
  const raw = block.source === "webinar" ? w.video_url : block.source === "replay" ? w.replay_url : block.url;
  // The iframe address is rebuilt from the parsed video id only.
  const embed = videoEmbedUrl(raw);
  if (!embed) return <Note>{raw ? "Use a YouTube or Vimeo link for this video." : block.source === "replay" ? "Add the replay link in the webinar settings." : block.source === "webinar" ? "Add the webinar video link in the webinar settings." : "Add a YouTube or Vimeo link."}</Note>;
  return <Player src={embed} title={w.title || "Webinar video"} />;
}

function HtmlView({ block }: { block: HtmlBlock }) {
  const { mode } = usePage();
  if (!block.code.trim()) return <Note>Paste your HTML or embed code.</Note>;
  return (
    <iframe
      className="wpb-html"
      // Never allow-same-origin: the public page shares an origin with the signed-in app.
      sandbox="allow-scripts allow-popups"
      srcDoc={block.code}
      title="Embedded content"
      referrerPolicy="no-referrer"
      loading="lazy"
      tabIndex={mode === "preview" ? -1 : undefined}
      style={{ height: block.height }}
    />
  );
}

// ── Actions ───────────────────────────────────────────────────────────────

function ButtonView({ block }: { block: ButtonBlock }) {
  const { w, form, mode } = usePage();
  const label = block.label.trim() || "Learn more";
  if (block.action === "form") {
    return (
      <button type="button" className="wp-btn wpb-btn" onClick={form.jump}>
        {label}
      </button>
    );
  }
  const href = block.action === "payment" ? (isValidPaymentUrl(w.payment_url) ? new URL(w.payment_url).href : "") : block.href;
  if (!href) {
    return (
      <>
        <button type="button" className="wp-btn wpb-btn" disabled style={{ cursor: "not-allowed" }}>
          {label}
        </button>
        {mode === "preview" ? <Note>{block.action === "payment" ? "Add a checkout link in the webinar settings." : "Add a link for this button."}</Note> : null}
      </>
    );
  }
  return (
    <a className="wp-btn wpb-btn" href={href} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
}

/** The template's own registration panel: same validation, sign-up, paid checkout and success state. */
function FormView({ label, primary }: { label: string; primary: boolean }) {
  const state = usePage();
  const box = useRef<HTMLDivElement>(null);
  const spare = useRef<HTMLDivElement>(null);
  const spareName = useRef<HTMLInputElement>(null);
  const spareEmail = useRef<HTMLInputElement>(null);
  const w = label.trim() ? { ...state.w, cta_label: label.trim() } : state.w;
  // A second form block shares the fields but not the refs, so scrolling and the sticky button target the first.
  const form = primary ? state.form : { ...state.form, panelRef: spare, nameRef: spareName, emailRef: spareEmail };
  // RegisterPanel always renders id="register"; only the primary form may keep it (ids must be unique).
  useEffect(() => {
    const panel = box.current?.querySelector(".wp-panel");
    if (primary) panel?.setAttribute("id", "register");
    else panel?.removeAttribute("id");
  });
  return (
    <div ref={box} className="wpb-form">
      <PageProvider value={{ ...state, w, form }}>
        <RegisterPanel title={null} compact />
      </PageProvider>
    </div>
  );
}

// ── Timer ─────────────────────────────────────────────────────────────────

function timerTarget(block: TimerBlock, w: Webinar): Date | null {
  if (block.target === "session") return sessionStart(w); // null for automated
  if (block.target === "replay-expiry") {
    const end = sessionEnd(w);
    return end && w.replay_expires_days > 0 ? new Date(end.getTime() + w.replay_expires_days * 86_400_000) : null;
  }
  return block.date ? new Date(block.date) : null;
}

function TimerView({ block }: { block: TimerBlock }) {
  const { w } = usePage();
  const target = timerTarget(block, w);
  const now = useNow(Boolean(target));
  if (!target) {
    return (
      <Note>
        {block.target === "custom"
          ? "Pick a date for this timer."
          : w.delivery_type === "automated"
            ? "On-demand webinars have no session date, so this timer stays hidden."
            : block.target === "replay-expiry" && w.replay_expires_days === 0
              ? "The replay never expires, so this timer stays hidden."
              : "Set the session date to start this timer."}
      </Note>
    );
  }
  if (now === null) return <div className="wpb-timer" aria-hidden="true" />;
  const left = target.getTime() - now;
  if (left <= 0) return <Note>This timer&apos;s date has passed, so visitors don&apos;t see it.</Note>;
  const c = splitDuration(left);
  const pad = (n: number) => String(n).padStart(2, "0");
  const units: [number, string, string][] = [
    [c.days, "d", "days"],
    [c.hours, "h", "hours"],
    [c.minutes, "m", "minutes"],
    [c.seconds, "s", "seconds"],
  ];
  return (
    <div className="wpb-timer">
      {block.label.trim() ? <p className="wp-label">{block.label}</p> : null}
      {/* Read once by screen readers, not every second. */}
      <p className="wp-count" aria-hidden="true">
        {units.map(([n, short], i) =>
          i === 0 && n === 0 ? null : (
            <span key={short}>
              {pad(n)}
              <i>{short}</i>
            </span>
          ),
        )}
      </p>
      <p className="wp-sr">
        {new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(target)}
      </p>
    </div>
  );
}

// ── People and lists ──────────────────────────────────────────────────────

function PresenterView({ block }: { block: PresenterBlock }) {
  const { w } = usePage();
  const [broken, setBroken] = useState<string | null>(null);
  const name = block.name.trim() || w.presenter_name.trim();
  const title = block.title.trim() || w.presenter_title.trim();
  const bio = block.bio.trim() || w.host_bio.trim();
  const photo = block.photo || w.portrait_url;
  // The webinar's own portrait keeps the host's chosen crop.
  const focus = block.photo ? "50% 50%" : `${w.portrait_focus_x}% ${w.portrait_focus_y}%`;
  if (!name && !bio) return <Note>Add the presenter&apos;s name in the webinar settings or in this block.</Note>;
  return (
    <div className="wpb-presenter">
      {/* Decorative: the name is printed right beside it. */}
      <span className="wp-avatar wpb-avatar" aria-hidden="true">
        {initials(name)}
        {photo && broken !== photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" style={{ objectPosition: focus }} onError={() => setBroken(photo)} />
        ) : null}
      </span>
      <div className="wpb-presenter-copy">
        {name ? <p className="wp-host-name wpb-presenter-name">{name}</p> : null}
        {title ? <p className="wp-host-title">{title}</p> : null}
        {bio ? <p className="wp-bio wpb-pre">{bio}</p> : null}
      </div>
    </div>
  );
}

const TICK = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.2 8.6l3 3 6.6-7.2" />
  </svg>
);

function ListView({ block }: { block: ListBlock }) {
  const items = block.items.map((i) => i.trim()).filter(Boolean);
  if (!items.length) return <Note>Add list items.</Note>;
  const List = block.marker === "number" ? "ol" : "ul";
  return (
    <List className="wpb-list" data-marker={block.marker}>
      {items.map((item, i) => (
        <li key={i}>
          <span className="wpb-marker" aria-hidden="true">
            {/* "dot" is drawn as a short rule: the owner's style has no decorative dots. */}
            {block.marker === "number" ? String(i + 1).padStart(2, "0") : block.marker === "tick" ? TICK : null}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </List>
  );
}

// ── Thank-you page ────────────────────────────────────────────────────────

/** The webinar's public link, or "" before mount (it needs the page's origin). */
function usePublicUrl(w: Webinar): string {
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(registrationUrl(w)), [w]);
  return url;
}

function SessionLinkView({ label }: { label: string }) {
  const { w, joinUrl, mode } = usePage();
  const publicUrl = usePublicUrl(w);
  const title = label.trim() ? <p className="wp-label">{label}</p> : null;
  if (w.delivery_type === "automated") {
    const watch = publicUrl ? `${publicUrl}${publicUrl.includes("?") ? "&" : "?"}view=watch` : "";
    return (
      <div className="wpb-stack">
        {title}
        {watch ? (
          <a className="wp-btn wpb-btn" href={watch}>
            Watch now
          </a>
        ) : null}
      </div>
    );
  }
  // The join link only reaches the browser after a real sign-up (registerForWebinar's joinUrl).
  return (
    <div className="wpb-stack">
      {title}
      {joinUrl ? (
        <a className="wp-btn wpb-btn" href={joinUrl} target="_blank" rel="noopener noreferrer">
          Join the webinar
        </a>
      ) : (
        <p className="wpb-text">We&apos;ve emailed you the link.</p>
      )}
      {mode === "preview" && !joinUrl ? <Note>Visitors see their own join link here, when you have set one.</Note> : null}
    </div>
  );
}

function CalendarView({ label }: { label: string }) {
  const { w, joinUrl, phase } = usePage();
  const event = w.delivery_type === "automated" ? null : calendarEvent(w, joinUrl);
  if (!event || phase === "ended") {
    return <Note>{w.delivery_type === "automated" ? "On-demand webinars have no date, so calendar links stay hidden." : "Set the session date to show calendar links."}</Note>;
  }
  return (
    <div className="wpb-stack wpb-actions">
      {label.trim() ? <p className="wp-label">{label}</p> : null}
      <CalendarButtons event={event} />
    </div>
  );
}

function ShareView({ label }: { label: string }) {
  const { w } = usePage();
  const url = usePublicUrl(w);
  if (!url) return null;
  const u = encodeURIComponent(url);
  const links = [
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ["X", `https://twitter.com/intent/tweet?url=${u}&text=${encodeURIComponent(w.title)}`],
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
  ];
  return (
    <div className="wpb-stack wpb-actions">
      {label.trim() ? <p className="wp-label">{label}</p> : null}
      <div className="wp-cal-row">
        {links.map(([name, href]) => (
          <a key={name} className="wp-cal-btn" href={href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${name}`}>
            {name}
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Watch room ────────────────────────────────────────────────────────────

/** The logo (or brand name) bar at the top of the watch room. */
function BrandBar({ w }: { w: Webinar }) {
  const [broken, setBroken] = useState<string | null>(null);
  const label = w.brand_name.trim() || w.presenter_name.trim();
  const logo = Boolean(w.logo_url) && broken !== w.logo_url;
  if (!logo && !label) return null;
  return (
    <header style={{ borderBottom: "1px solid var(--line)" }}>
      <div className="wp-wrap" style={{ display: "flex", alignItems: "center", minHeight: 64 }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="wp-logo" src={w.logo_url} alt={label || "Logo"} onError={() => setBroken(w.logo_url)} />
        ) : (
          <span className="wp-brand-name">{label}</span>
        )}
      </div>
    </header>
  );
}

const WATCH_CARD: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  padding: "clamp(20px, 5cqi, 40px)",
  display: "grid",
  gap: "0.9rem",
  justifyItems: "center",
  textAlign: "center",
};

function countdownText(c: { days: number; hours: number; minutes: number; seconds: number }): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${c.days ? `${c.days}d ` : ""}${pad(c.hours)}h ${pad(c.minutes)}m ${pad(c.seconds)}s`;
}

/**
 * The watch-player block, the heart of both the standard and a custom watch room:
 *
 *   live, upcoming   waiting text, countdown, the time in the viewer's zone
 *   live, live       "your join link is in your confirmation email"; a join
 *                    button only for the browser that just registered
 *   live, ended      a link to the replay if there is a recording, else "ended"
 *   automated        the video (free) or "comes with your purchase" (paid)
 */
function WatchPlayerView() {
  const { w, mode, phase, mounted, countdown, when } = usePage();
  const [rid, setRid] = useState<string | null>(null);
  const [joinState, setJoinState] = useState<"idle" | "busy" | "failed">("idle");
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const joinRef = useRef<HTMLAnchorElement>(null);
  // The button the visitor pressed is replaced by the link; keep their focus on it.
  useEffect(() => {
    if (joinUrl) joinRef.current?.focus();
  }, [joinUrl]);
  // Never in the editor: the preview makes no network calls.
  useEffect(() => {
    setRid(mode === "live" ? recentRegistrant(w.id) : null);
  }, [mode, w.id]);

  const paid = w.access_type === "paid";

  async function join() {
    if (!rid) return;
    setJoinState("busy");
    const url = await fetchJoinUrl(w.id, rid);
    // A real link, not window.open: after an await the click no longer counts, so popup blockers would stop it.
    setJoinUrl(url);
    setJoinState(url ? "idle" : "failed");
  }

  if (w.delivery_type === "automated") {
    if (paid) return <p className="wp-sub">The video link comes with your purchase. Check your checkout confirmation.</p>;
    // The iframe address is rebuilt from the parsed video id only.
    const embed = videoEmbedUrl(w.video_url);
    return embed ? <Player src={embed} title={w.title || "Webinar video"} /> : <p className="wp-sub">The video for this webinar isn&apos;t available yet.</p>;
  }
  if (!mounted) return null; // clock and timezone only after mount
  if (phase === "none") return <p className="wp-sub">The date for this webinar hasn&apos;t been announced yet.</p>;
  if (phase === "upcoming") {
    return (
      <div style={WATCH_CARD}>
        <p className="wp-sub">{w.watch_room.waiting_text}</p>
        <p role="timer" aria-label="Time until the webinar starts" style={{ fontSize: "clamp(1.6rem, 6cqi, 2.6rem)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {countdownText(countdown)}
        </p>
        {when ? <p className="wp-fine">{`${when.date}, ${when.time}`}</p> : null}
      </div>
    );
  }
  if (phase === "live") {
    return (
      <div style={WATCH_CARD}>
        <p className="wp-sub">The webinar is on now.</p>
        <p className="wp-fine">{paid ? "Your join link comes with your purchase." : "Your join link is in your confirmation email."}</p>
        {rid && !paid ? (
          <>
            {joinUrl ? (
              <a ref={joinRef} className="wp-btn" style={{ maxWidth: 320 }} href={joinUrl} target="_blank" rel="noopener noreferrer">
                Open your join link
              </a>
            ) : (
              <button type="button" className="wp-btn" style={{ maxWidth: 320 }} onClick={() => void join()} disabled={joinState === "busy"}>
                {joinState === "busy" ? "Getting your link…" : "Join the webinar"}
              </button>
            )}
            {joinState === "failed" ? (
              <p role="alert" className="wp-fine">
                We couldn&apos;t fetch your link just now. Please use the one in your email.
              </p>
            ) : null}
          </>
        ) : null}
        {!paid ? <Note>Someone who signed up on this browser in the last 2 hours also sees a Join button here.</Note> : null}
      </div>
    );
  }
  const end = sessionEnd(w);
  return (
    <div style={WATCH_CARD}>
      <p className="wp-sub">This session has ended{end ? ` (${new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long" }).format(end)})` : ""}.</p>
      {w.replay_url ? (
        <a className="wp-btn" style={{ maxWidth: 320 }} href={viewUrl(w, "replay")}>
          Watch the replay
        </a>
      ) : null}
    </div>
  );
}
