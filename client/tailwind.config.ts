import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        stamp: ['"Boldonse"', "Impact", "sans-serif"],
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        typewriter: ['"Courier Prime"', "Courier", "monospace"],
        sans: ['"Inter Tight"', "system-ui", "sans-serif"],
      },
      colors: {
        wine: {
          950: "#10050A",
          900: "#1E0810",
          800: "#2A1019",
          700: "#3A1825",
          600: "#4D2231",
        },
        paper: {
          DEFAULT: "#F0E6D0",
          dark: "#E5D8B8",
          aged: "#D9CBA3",
          light: "#F7EFD8",
        },
        ink: {
          DEFAULT: "#14110D",
          soft: "#3A322A",
          faded: "#6A5E50",
        },
        vermillion: {
          DEFAULT: "#C8392F",
          dark: "#9B2A22",
          light: "#E8554A",
        },
        marine: {
          DEFAULT: "#1F3A82",
          dark: "#152858",
        },
        gold: {
          DEFAULT: "#B89150",
          dark: "#8A6A3A",
        },
        cream: "#E8DDC4",
      },
      keyframes: {
        "stamp-slam": {
          "0%": { transform: "scale(3) rotate(-12deg)", opacity: "0" },
          "60%": { transform: "scale(0.85) rotate(-6deg)", opacity: "1" },
          "80%": { transform: "scale(1.05) rotate(-9deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(-8deg)", opacity: "1" },
        },
        "paper-fall": {
          "0%": { transform: "translateY(-100vh) rotate(-15deg)", opacity: "0" },
          "100%": { transform: "translateY(0) rotate(-2deg)", opacity: "1" },
        },
        gavel: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "20%": { transform: "rotate(-25deg)" },
          "40%": { transform: "rotate(0deg)" },
        },
        drumroll: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-2px)" },
          "40%": { transform: "translateX(2px)" },
          "60%": { transform: "translateX(-1px)" },
          "80%": { transform: "translateX(1px)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        ticker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "47%, 49%": { opacity: "0.7" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "stamp-slam": "stamp-slam 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "paper-fall": "paper-fall 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        gavel: "gavel 0.5s ease-in-out",
        drumroll: "drumroll 0.1s linear infinite",
        marquee: "marquee 40s linear infinite",
        ticker: "ticker 1s ease-in-out infinite",
        flicker: "flicker 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
