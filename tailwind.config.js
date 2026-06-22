/** @type {import('tailwindcss').Config} */
module.exports = {
  // Dark-mode opt-in by ancestor "dark" class. The v1 site renders dark by
  // default via the body classes in pages/_document.tsx; a light-mode toggle
  // is out of scope for Sprint 28 and revisited in the Strategy doc's
  // Open Questions (dark/light parity audit).
  darkMode: "class",

  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{md,mdx}",
  ],

  theme: {
    extend: {
      // FramePath palette — graphite + warm ember accent. Matches the
      // in-app design language called out in US-154 ("graphite + warm
      // accents"). Both scales are full 50 -> 950 ramps so dark and
      // light variants can be wired without changing component classes.
      colors: {
        graphite: {
          50: "#f6f6f7",
          100: "#e6e6e9",
          200: "#cdcdd2",
          300: "#a3a3ab",
          400: "#71717a",
          500: "#52525b",
          600: "#3f3f46",
          700: "#27272a",
          800: "#1c1c21",
          900: "#111114",
          950: "#0a0a0c",
        },
        ember: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
      },

      fontFamily: {
        // System font stack — no font-CDN cost for Lighthouse Performance.
        // Real custom fonts can be reintroduced via next/font/local later.
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },

      // Slightly larger and tighter rhythm for the hero / feature copy.
      letterSpacing: {
        "extra-tight": "-0.025em",
      },
    },
  },

  plugins: [require("@tailwindcss/typography")],
};
