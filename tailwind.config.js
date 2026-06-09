/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",

  theme: {
    extend: {
      fontFamily: {
        sans: ["NotoSansMyanmar-Regular", "sans-serif"],
        display: ["Torus-SemiBold", "sans-serif"],
        notosansmyanmar: ["NotoSansMyanmar-Regular", "sans-serif"],
        roboto: ["Roboto-Bold", "sans-serif"],
        torus: ["Torus-SemiBold", "sans-serif"],
      },

      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
        xs: ["0.75rem", { lineHeight: "1.125rem" }],
        sm: ["0.875rem", { lineHeight: "1.375rem" }],
        base: ["1rem", { lineHeight: "1.6rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.875rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.375rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.75rem" }],
        "5xl": ["3rem", { lineHeight: "1.15" }],
        "6xl": ["3.75rem", { lineHeight: "1.1" }],
        "fluid-sm": ["0.875rem", { lineHeight: "1.5" }],
        "fluid-base": ["1rem", { lineHeight: "1.6" }],
        "fluid-lg": ["1.125rem", { lineHeight: "1.65" }],
        "fluid-xl": ["1.25rem", { lineHeight: "1.5" }],
        "fluid-2xl": ["1.5rem", { lineHeight: "1.3" }],
        "fluid-3xl": ["1.875rem", { lineHeight: "1.2" }],
        "fluid-hero": ["2.5rem", { lineHeight: "1.1" }],
      },

      colors: {
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
      },

      transitionDuration: {
        DEFAULT: "200ms",
      },
    },
  },
  plugins: [],
};
