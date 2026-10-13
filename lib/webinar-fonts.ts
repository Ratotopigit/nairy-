/**
 * Fonts for the registration page templates. Self-hosted by next/font at
 * build time (no request to Google from visitors). Nothing is preloaded: the
 * browser only downloads the faces the chosen template actually renders.
 */
import {
  Anton,
  Archivo_Black,
  Cormorant_Garamond,
  DM_Serif_Display,
  Fraunces,
  Inter,
  Lora,
  Manrope,
  Nunito,
  Playfair_Display,
  Sora,
  Space_Grotesk,
} from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"] });
const manrope = Manrope({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700", "800"] });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"] });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false, weight: ["500", "600", "700", "800"] });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], display: "swap", preload: false, weight: ["400"] });
const lora = Lora({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"] });
const archivoBlack = Archivo_Black({ subsets: ["latin"], display: "swap", preload: false, weight: ["400"] });
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "600", "700", "800"] });
const sora = Sora({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700", "800"] });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], display: "swap", preload: false, weight: ["500", "600", "700"] });
const nunito = Nunito({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "600", "700", "800"] });
const anton = Anton({ subsets: ["latin"], display: "swap", preload: false, weight: ["400"] });

export const TEMPLATE_FONTS = {
  inter: inter.style.fontFamily,
  manrope: manrope.style.fontFamily,
  spaceGrotesk: spaceGrotesk.style.fontFamily,
  playfair: playfair.style.fontFamily,
  dmSerif: dmSerif.style.fontFamily,
  lora: lora.style.fontFamily,
  archivoBlack: archivoBlack.style.fontFamily,
  fraunces: fraunces.style.fontFamily,
  sora: sora.style.fontFamily,
  cormorant: cormorant.style.fontFamily,
  nunito: nunito.style.fontFamily,
  anton: anton.style.fontFamily,
} as const;

export type TemplateFont = keyof typeof TEMPLATE_FONTS;
