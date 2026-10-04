import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--kg-canvas) / <alpha-value>)",
        surface: "rgb(var(--kg-surface) / <alpha-value>)",
        sand: "rgb(var(--kg-sand) / <alpha-value>)",
        muted: "rgb(var(--kg-muted) / <alpha-value>)",
        line: "rgb(var(--kg-line) / <alpha-value>)",
        control: "rgb(var(--kg-control) / <alpha-value>)",
        strong: "rgb(var(--kg-strong) / <alpha-value>)",
        body: "rgb(var(--kg-body) / <alpha-value>)",
        subtle: "rgb(var(--kg-subtle) / <alpha-value>)",
        accent: { DEFAULT: "rgb(var(--kg-accent) / <alpha-value>)", hover: "rgb(var(--kg-accent-hover) / <alpha-value>)", soft: "rgb(var(--kg-accent-soft) / <alpha-value>)" },
        sage: "rgb(var(--kg-sage) / <alpha-value>)",
        positive: "rgb(var(--kg-positive) / <alpha-value>)",
        warning: "rgb(var(--kg-warning) / <alpha-value>)",
        danger: "rgb(var(--kg-danger) / <alpha-value>)",
        "on-accent": "rgb(var(--kg-on-accent) / <alpha-value>)",
        // Compatibility for server-authored answer HTML, not application UI tokens.
        ink: { 950: "rgb(var(--kg-canvas) / <alpha-value>)", 900: "rgb(var(--kg-surface) / <alpha-value>)", 800: "rgb(var(--kg-muted) / <alpha-value>)", 700: "rgb(var(--kg-line) / <alpha-value>)", 600: "rgb(var(--kg-subtle) / <alpha-value>)", 500: "rgb(var(--kg-subtle) / <alpha-value>)", 400: "rgb(var(--kg-subtle) / <alpha-value>)", 300: "rgb(var(--kg-body) / <alpha-value>)", 200: "rgb(var(--kg-body) / <alpha-value>)", 100: "rgb(var(--kg-strong) / <alpha-value>)", 50: "rgb(var(--kg-strong) / <alpha-value>)" },
        moss: { 700: "rgb(var(--kg-accent) / <alpha-value>)", 600: "rgb(var(--kg-positive) / <alpha-value>)", 500: "rgb(var(--kg-positive) / <alpha-value>)", 400: "rgb(var(--kg-positive) / <alpha-value>)", 300: "rgb(var(--kg-positive) / <alpha-value>)" },
        ember: { 500: "rgb(var(--kg-accent) / <alpha-value>)", 400: "rgb(var(--kg-warning) / <alpha-value>)", 300: "rgb(var(--kg-warning) / <alpha-value>)"},
      },
      fontFamily: {
        display: ["var(--font-geist)", "system-ui", "sans-serif"],
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: { sm: "8px" },
      keyframes: {
        "fade-up": { "0%": { opacity: "0.85", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "fade-up": "fade-up 240ms cubic-bezier(0.16,1,0.3,1) both",
        "fade-up-delay": "fade-up 240ms cubic-bezier(0.16,1,0.3,1) both",
        "soft-pulse": "none",
      },
    },
  },
  plugins: [],
};
export default config;
