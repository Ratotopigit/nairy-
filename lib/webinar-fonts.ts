/**
 * Fonts for the registration page, as curated heading + body pairings.
 *
 * Self-hosted by next/font at build time (visitors never contact Google).
 * Nothing is preloaded, so a visitor only downloads the faces the chosen
 * pairing actually renders. All are variable fonts: one file covers every
 * weight, which keeps a page to a few small requests.
 *
 * Hosts pick a pairing by name ("Editorial", "Warm Serif"…), never by
 * font name, because the pairings are what is known to look right together.
 */
import {
  Bricolage_Grotesque,
  Cormorant_Garamond,
  DM_Sans,
  DM_Serif_Display,
  Fraunces,
  Inter,
  Instrument_Serif,
  Libre_Bodoni,
  Lora,
  Manrope,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Public_Sans,
  Raleway,
} from "next/font/google";
import type { FontPairId } from "@/lib/webinar-templates";

const bodoni = Libre_Bodoni({ subsets: ["latin"], display: "swap", preload: false, style: ["normal", "italic"] });
const publicSans = Public_Sans({ subsets: ["latin"], display: "swap", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false, style: ["normal", "italic"] });
const inter = Inter({ subsets: ["latin"], display: "swap", preload: false });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], display: "swap", preload: false, style: ["normal", "italic"] });
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", preload: false, style: ["normal", "italic"] });
const lora = Lora({ subsets: ["latin"], display: "swap", preload: false, style: ["normal", "italic"] });
const raleway = Raleway({ subsets: ["latin"], display: "swap", preload: false });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], display: "swap", preload: false, weight: "400", style: ["normal", "italic"] });
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", preload: false });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", preload: false });
const manrope = Manrope({ subsets: ["latin"], display: "swap", preload: false });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], display: "swap", preload: false });
const instrument = Instrument_Serif({ subsets: ["latin"], display: "swap", preload: false, weight: "400", style: ["normal", "italic"] });

type Family = { fontFamily: string };
const fam = (f: { style: Family }) => f.style.fontFamily;

export type LoadedFontPair = {
  heading: string;
  body: string;
  headingWeight: number;
  tracking: string;
};

export const FONT_PAIRS: Record<FontPairId, LoadedFontPair> = {
  "bodoni-public": { heading: fam(bodoni), body: fam(publicSans), headingWeight: 500, tracking: "-0.02em" },
  "playfair-inter": { heading: fam(playfair), body: fam(inter), headingWeight: 600, tracking: "-0.02em" },
  "playfair-bold": { heading: fam(playfair), body: fam(inter), headingWeight: 800, tracking: "-0.02em" },
  "instrument-inter": { heading: fam(instrument), body: fam(inter), headingWeight: 400, tracking: "-0.015em" },
  "cormorant-inter": { heading: fam(cormorant), body: fam(inter), headingWeight: 600, tracking: "-0.015em" },
  "fraunces-inter": { heading: fam(fraunces), body: fam(inter), headingWeight: 500, tracking: "-0.025em" },
  "lora-raleway": { heading: fam(lora), body: fam(raleway), headingWeight: 500, tracking: "-0.015em" },
  "dmserif-dmsans": { heading: fam(dmSerif), body: fam(dmSans), headingWeight: 400, tracking: "-0.01em" },
  "jakarta-inter": { heading: fam(jakarta), body: fam(inter), headingWeight: 700, tracking: "-0.035em" },
  "manrope-inter": { heading: fam(manrope), body: fam(inter), headingWeight: 700, tracking: "-0.035em" },
  "bricolage-inter": { heading: fam(bricolage), body: fam(inter), headingWeight: 700, tracking: "-0.035em" },
};
