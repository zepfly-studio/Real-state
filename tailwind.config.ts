import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-2": "var(--bg-2)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        line: "var(--line)",
        "line-soft": "var(--line-soft)",
        txt: "var(--txt)",
        "txt-dim": "var(--txt-dim)",
        "txt-faint": "var(--txt-faint)",
        gold: "var(--gold)",
        "gold-bright": "var(--gold-bright)",
        "gold-soft": "var(--gold-soft)",
        green: "var(--green)",
        red: "var(--red)",
        blue: "var(--blue)",
        purple: "var(--purple)",
      },
      fontFamily: {
        display: ["var(--font-sora)", "system-ui", "sans-serif"],
        body: ["var(--font-space)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        card: "var(--radius)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "grow-bar": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
      animation: {
        "fade-in": "fade-in .35s ease both",
        "slide-in": "slide-in .28s cubic-bezier(.2,.8,.2,1) both",
        "grow-bar": "grow-bar .8s cubic-bezier(.2,.8,.2,1) both",
        "spin-slow": "spin-slow 6s linear infinite",
        shimmer: "shimmer 2s infinite linear",
      },
    },
  },
  plugins: [],
};

export default config;
