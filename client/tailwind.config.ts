import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        court: {
          ink: "#0b0a0e",
          oak: "#2a1810",
          oakLight: "#4a2c1c",
          brass: "#c9a35a",
          parchment: "#e8dcb0",
          parchmentDark: "#c7b683",
          blood: "#8a1c2a",
          accuse: "#ff3b3b",
        },
      },
      fontFamily: {
        title: ['"Cinzel"', "serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
        gavel: ['"Bebas Neue"', "sans-serif"],
      },
      boxShadow: {
        court: "0 30px 80px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)",
        spotlight: "0 0 120px 40px rgba(232,220,176,0.25)",
      },
      animation: {
        "gavel-shake": "gavel-shake 0.4s cubic-bezier(.36,.07,.19,.97) both",
        spotlight: "spotlight 1.6s ease-out both",
      },
      keyframes: {
        "gavel-shake": {
          "10%, 90%": { transform: "translate3d(-1px, 0, 0)" },
          "20%, 80%": { transform: "translate3d(2px, 0, 0)" },
          "30%, 50%, 70%": { transform: "translate3d(-4px, 0, 0)" },
          "40%, 60%": { transform: "translate3d(4px, 0, 0)" },
        },
        spotlight: {
          "0%": { opacity: "0", transform: "scale(0.5)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
