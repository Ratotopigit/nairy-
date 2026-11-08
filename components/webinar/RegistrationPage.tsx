"use client";

/**
 * The public registration page, in whichever template the host picked.
 *
 * Content, brand, colours and fonts come from the webinar; composition and
 * defaults from the template (lib/webinar-templates.ts). This component owns
 * what must behave the same everywhere: the clock, the form, validation and
 * the success state. Layouts (page-layouts.tsx) only arrange the parts.
 *
 *   upcoming  countdown + form
 *   live      "Happening now" + form (late joiners get the link by email)
 *   ended     "This session has ended", form closed
 *   closed    a week after the end: a short "finished" notice
 *
 * A paid webinar has no form and is never "done": its panel links to checkout,
 * because a registrant would be emailed the private join link. An automated
 * webinar has no session, and shows its video once someone has signed up.
 */
import "@/components/webinar/registration.css";
import {
  AgendaLayout,
  AsymmetricLayout,
  BentoLayout,
  CardLayout,
  EditorialLayout,
  HostLayout,
  LetterLayout,
  MinimalLayout,
  PhotoLayout,
  PosterLayout,
  SplitLayout,
  TrainingLayout,
  TrainingThanksPage,
} from "@/components/webinar/page-layouts";
import { BrandMark, Headline, PageProvider, ctaText } from "@/components/webinar/page-parts";
import { BlockList } from "@/components/webinar/blocks/BlockPage";
import { useRegistration } from "@/components/webinar/blocks/registration-state";
import { sessionEnd, type RegistrationResult, type Webinar } from "@/lib/webinars";

type Props = {
  webinar: Webinar;
  /**
   * "preview" renders inside the editor: the form shows the success state
   * without writing a registration, so the host can check both screens.
   */
  mode: "live" | "preview";
  onRegister?: (name: string, email: string) => Promise<RegistrationResult | void>;
  /** Gallery thumbnail: the clock is frozen so a grid of pages doesn't tick every second. */
  frozen?: boolean;
  /** Start on the thank-you screen (the thank-you template's gallery thumbnail). */
  startDone?: boolean;
  /** Told whenever the page switches between the sign-up and thank-you screens, so a preview can keep its switch in step. */
  onDoneChange?: (done: boolean) => void;
};

const LAYOUTS = {
  editorial: EditorialLayout,
  photo: PhotoLayout,
  minimal: MinimalLayout,
  host: HostLayout,
  asymmetric: AsymmetricLayout,
  split: SplitLayout,
  poster: PosterLayout,
  letter: LetterLayout,
  bento: BentoLayout,
  agenda: AgendaLayout,
  card: CardLayout,
  training: TrainingLayout,
} as const;

export function RegistrationPage({ webinar: w, mode, onRegister, frozen = false, startDone = false, onDoneChange }: Props) {
  // Pages built in the page builder replace the template; an empty page keeps it.
  const regBlocks = w.pages?.registration ?? [];
  const thanksBlocks = w.pages?.thanks ?? [];
  const { state, vars, dataAttrs, done, phase, mounted, showThanks, t, formVisible, jumpToForm } = useRegistration({
    webinar: w,
    mode,
    onRegister,
    frozen,
    startDone,
    onDoneChange,
    blockThanks: thanksBlocks.length > 0,
  });

  // A week after the session: the page says so and nothing more.
  if (phase === "closed") {
    const ended = sessionEnd(w);
    return (
      <div className="wp-root" style={vars}>
        <div className="wp" {...dataAttrs}>
          <PageProvider value={state}>
            <div className="wp-wrap" style={{ paddingBlock: "clamp(40px, 10cqi, 120px)", display: "grid", gap: "1.25rem", maxWidth: "46rem" }}>
              <BrandMark />
              <Headline />
              <p className="wp-sub">
                This webinar has finished
                {ended && mounted ? ` (it ended ${new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long" }).format(ended)})` : ""}. Registration is closed.
              </p>
              {mode === "preview" ? (
                <p className="wp-fine" style={{ textAlign: "left" }}>
                  This is what visitors see now. Set a new date to open registration again; the same link keeps working.
                </p>
              ) : null}
            </div>
          </PageProvider>
        </div>
      </div>
    );
  }

  // The full thank-you page replaces the whole page once someone has registered.
  const Layout = showThanks ? TrainingThanksPage : LAYOUTS[t.layout];
  const open = phase !== "ended";
  // Without thank-you blocks, a block page's own form block shows the success state in place.
  const blocks =
    done && thanksBlocks.length
      ? { page: "thanks" as const, list: thanksBlocks }
      : regBlocks.length && !showThanks
        ? { page: "registration" as const, list: regBlocks }
        : null;

  return (
    <div className="wp-root" style={vars}>
      <div className="wp" {...dataAttrs}>
        <PageProvider value={state}>
          {blocks ? <BlockList page={blocks.page} blocks={blocks.list} /> : <Layout />}
        </PageProvider>
      </div>
      {mode === "live" && !done && open && !formVisible ? (
        <div className="wp-sticky">
          <button type="button" className="wp-btn" onClick={jumpToForm}>
            {ctaText(w)}
          </button>
        </div>
      ) : null}
    </div>
  );
}
