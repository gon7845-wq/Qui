import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Anton"', "Impact", "sans-serif"],
        serif: ['"Old Standard TT"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        sans: ['"Inter Tight"', "system-ui", "sans-serif"],
      },
      colors: {
        wood: {
          950: "#0E0703",
          900: "#1A0C08",
          800: "#2B160E",
          700: "#3A1F15",
        },
        felt: {
          DEFAULT: "#4D1820",
          dark: "#3A1018",
          light: "#5E2128",
        },
        gold: {
          DEFAULT: "#C8A23F",
          dark: "#8C6F22",
          light: "#E9CB6F",
        },
        cream: {
          DEFAULT: "#F0E5D0",
          dim: "#D8CBB1",
        },
        bone: "#E8DDC4",
        ink: "#14110D",
        ruby: "#C8392F",
        ruby_dark: "#7A1E18",
      },
      keyframes: {
        "chip-glide": {
          "0%": { transform: "translate(var(--from-x), var(--from-y)) scale(0.6)", opacity: "0" },
          "30%": { opacity: "1" },
          "100%": { transform: "translate(var(--to-x), var(--to-y)) scale(1)", opacity: "1" },
        },
        "spot-pulse": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.08)" },
        },
        "plaque-slam": {
          "0%": { transform: "scale(3) rotate(-12deg)", opacity: "0" },
          "55%": { transform: "scale(0.9) rotate(-5deg)", opacity: "1" },
          "75%": { transform: "scale(1.05) rotate(-8deg)" },
          "100%": { transform: "scale(1) rotate(-6deg)", opacity: "1" },
        },
        "card-flip-in": {
          "0%": { transform: "rotateY(-180deg) scale(0.4)", opacity: "0" },
          "100%": { transform: "rotateY(0deg) scale(1)", opacity: "1" },
        },
        "drumroll-shake": {
          "0%, 100%": { transform: "translate(0,0)" },
          "20%": { transform: "translate(-2px, 1px)" },
          "40%": { transform: "translate(2px, -1px)" },
          "60%": { transform: "translate(-1px, -2px)" },
          "80%": { transform: "translate(1px, 2px)" },
        },
        "ring-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        ticker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
      animation: {
        "spot-pulse": "spot-pulse 2s ease-in-out infinite",
        "plaque-slam": "plaque-slam 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "card-flip-in": "card-flip-in 0.7s cubic-bezier(0.34, 1.36, 0.64, 1) forwards",
        "drumroll-shake": "drumroll-shake 0.12s linear infinite",
        "ring-spin": "ring-spin 12s linear infinite",
        ticker: "ticker 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
