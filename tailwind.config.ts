import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-primary": "rgb(var(--color-bg-primary) / <alpha-value>)",
        "bg-surface": "rgb(var(--color-bg-surface) / <alpha-value>)",
        "bg-elevated": "rgb(var(--color-bg-elevated) / <alpha-value>)",
        "accent-blue": "rgb(var(--color-accent-blue) / <alpha-value>)",
        "accent-green": "rgb(var(--color-accent-green) / <alpha-value>)",
        "accent-amber": "rgb(var(--color-accent-amber) / <alpha-value>)",
        "accent-red": "rgb(var(--color-accent-red) / <alpha-value>)",
        "text-primary": "rgb(var(--color-text-primary) / <alpha-value>)",
        "text-muted": "rgb(var(--color-text-muted) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 12px 40px rgba(0, 0, 0, 0.24)"
      }
    }
  },
  plugins: []
};

export default config;
