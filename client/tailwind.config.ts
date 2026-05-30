import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fredoka"', '"Plus Jakarta Sans"', "sans-serif"],
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      colors: {
        bg: "#FFF6EC",
        card: "#FFFDFA",
        ink: {
          DEFAULT: "#241B33",
          soft: "#6E6480",
          faint: "#ADA3BC",
        },
        accent: {
          DEFAULT: "#FF5E8A",
          2: "#FF9F43",
          deep: "#E03E73",
        },
        warm: { a: "#FFCB45", b: "#FF6FA3" },
        spicy: { a: "#FF4D5E", b: "#8E1C5B" },
        fun: { a: "#3FB6FF", b: "#8B5CF6" },
      },
      borderRadius: {
        "4xl": "28px",
        "5xl": "36px",
      },
      keyframes: {
        "float-up": {
          "0%": { transform: "translateY(0) scale(0.6)", opacity: "0" },
          "15%": { opacity: "1" },
          "100%": { transform: "translateY(-160px) scale(1.1)", opacity: "0" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "70%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
      },
      animation: {
        "float-up": "float-up 1.6s ease-out forwards",
        "pop-in": "pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
        wiggle: "wiggle 0.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
