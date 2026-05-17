import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Instrument Serif"', "serif"],
        mono: ['"Geist Mono"', "ui-monospace", "monospace"],
        sans: ['"Geist"', "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          950: "#08080a",
          900: "#0c0c10",
          800: "#15151b",
          700: "#1f1f27",
          600: "#2a2a34",
          500: "#3a3a47",
          300: "#8b8b96",
          100: "#e9e9ec",
          50: "#fafafa",
        },
        acid: "#DBFF00",
        cherry: "#FF3366",
        cyan: "#00E5FF",
      },
      keyframes: {
        "grain-shift": {
          "0%, 100%": { transform: "translate(0,0)" },
          "10%": { transform: "translate(-5%,-10%)" },
          "20%": { transform: "translate(-15%, 5%)" },
          "30%": { transform: "translate(7%,-25%)" },
          "40%": { transform: "translate(-5%,25%)" },
          "50%": { transform: "translate(-15%,10%)" },
          "60%": { transform: "translate(15%,0%)" },
          "70%": { transform: "translate(0%,15%)" },
          "80%": { transform: "translate(3%,35%)" },
          "90%": { transform: "translate(-10%,10%)" },
        },
        "blob-1": {
          "0%, 100%": { transform: "translate(-10%, -20%) scale(1)" },
          "50%": { transform: "translate(15%, 10%) scale(1.15)" },
        },
        "blob-2": {
          "0%, 100%": { transform: "translate(20%, 30%) scale(1.1)" },
          "50%": { transform: "translate(-15%, -10%) scale(0.95)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        ticker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.2" },
        },
      },
      animation: {
        "grain-shift": "grain-shift 8s steps(10) infinite",
        "blob-1": "blob-1 18s ease-in-out infinite",
        "blob-2": "blob-2 22s ease-in-out infinite",
        marquee: "marquee 30s linear infinite",
        ticker: "ticker 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
