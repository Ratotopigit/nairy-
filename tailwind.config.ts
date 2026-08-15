import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: "#B8E3CD", // Soft Sage Mint (Light mode primary)
          lightSurface: "#E8F7F0",
          dark: "#1B3B2B", // Deep Forest Green (Dark mode primary)
          darkSurface: "#122A1E",
          accent: "#2D6A4F", // Light mode accent
          accentHover: "#40916C", // Dark mode accent
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
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
