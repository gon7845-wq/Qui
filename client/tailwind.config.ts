import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        sans: ['"Geist"', "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          950: "#06060c",
          900: "#0a0a14",
          800: "#10101c",
          700: "#1a1a2a",
          600: "#262638",
          500: "#3a3a52",
          300: "#9494a8",
          100: "#e6e6f2",
          50: "#f7f7fb",
        },
        pearl: "#F4F1FF",
        iris: {
          sky: "#9ED3FF",
          lavender: "#DDA0FF",
          rose: "#FFB8E1",
          mint: "#B8FFE1",
          butter: "#FFE9B8",
          silver: "#C6C6E0",
        },
        chrome: "#D6D6E4",
      },
      keyframes: {
        "blob-1": {
          "0%, 100%": { transform: "translate(-10%, -20%) scale(1) rotate(0deg)" },
          "50%": { transform: "translate(20%, 15%) scale(1.2) rotate(40deg)" },
        },
        "blob-2": {
          "0%, 100%": { transform: "translate(20%, 30%) scale(1.1) rotate(0deg)" },
          "50%": { transform: "translate(-20%, -15%) scale(0.95) rotate(-30deg)" },
        },
        "blob-3": {
          "0%, 100%": { transform: "translate(0%, 0%) scale(1) rotate(0deg)" },
          "50%": { transform: "translate(10%, -20%) scale(1.15) rotate(60deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        sparkle: {
          "0%, 100%": { transform: "scale(0.6) rotate(0deg)", opacity: "0.3" },
          "50%": { transform: "scale(1.1) rotate(180deg)", opacity: "1" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        ticker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
      },
      animation: {
        "blob-1": "blob-1 22s ease-in-out infinite",
        "blob-2": "blob-2 28s ease-in-out infinite",
        "blob-3": "blob-3 18s ease-in-out infinite",
        shimmer: "shimmer 6s linear infinite",
        sparkle: "sparkle 3s ease-in-out infinite",
        marquee: "marquee 30s linear infinite",
        ticker: "ticker 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
