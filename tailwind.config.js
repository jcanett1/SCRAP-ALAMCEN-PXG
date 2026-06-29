/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        brand: {
          50:  "#e6f4ff",
          100: "#bae3ff",
          200: "#7cc4fa",
          300: "#47a3f3",
          400: "#2186eb",
          500: "#0967d2",
          600: "#0552b5",
          700: "#03449e",
          800: "#01337d",
          900: "#002159",
        },
      },
      animation: {
        "slide-up": "slideUp 0.25s cubic-bezier(0.23,1,0.32,1)",
        "fade-in":  "fadeIn 0.2s ease-out",
      },
      keyframes: {
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
