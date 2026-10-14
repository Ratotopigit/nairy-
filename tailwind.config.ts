import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        "accent-soft": "var(--accent-soft)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        input: "var(--input)",
        ring: "var(--ring)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        "ink-foreground": "var(--ink-foreground)",
        clay: "var(--clay)",
        "clay-foreground": "var(--clay-foreground)",
        ochre: "var(--ochre)",
        brand: {
          light: "#F0F6FF",
          lightSurface: "#FFFFFF",
          accent: "#3478F6",
          accentHover: "#2563EB",
        },
      },
      fontFamily: {
        // Was var(--font-inter), a leftover from the Next.js starter that was
        // never defined. An undefined var() invalidates the WHOLE font-family
        // declaration, fallbacks included, so every page rendered in the
        // browser default serif (Times New Roman). This is the stack
        // globals.css already declares as the house font.
        sans: ['"Avenir Next"', '"Helvetica Neue"', "ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s ease-out both",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
