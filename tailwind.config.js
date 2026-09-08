export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        uh: {
          navy: "rgb(var(--uh-navy) / <alpha-value>)",
          gold: "rgb(var(--uh-gold) / <alpha-value>)",
          paper: "rgb(var(--uh-paper) / <alpha-value>)",
          ink: "rgb(var(--uh-ink) / <alpha-value>)",
          stone: "rgb(var(--uh-stone) / <alpha-value>)",
          emerald: "rgb(var(--uh-emerald) / <alpha-value>)",
          red: "rgb(var(--uh-red) / <alpha-value>)",
        },
      },
      boxShadow: {
        paper: "0 14px 50px rgba(12, 18, 32, 0.10)",
        float: "0 12px 26px rgba(12, 18, 32, 0.14)",
      },
    },
  },
  plugins: [],
};
