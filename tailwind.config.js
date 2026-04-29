/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Sora", "sans-serif"],
        display: ['"Cabinet Grotesk"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },

      colors: {
        brand: {
          light: "#e0e9ff",
          dark: "#312e81",
          50: "#f0f4ff",
          100: "#e0e9ff",
          200: "#c7d7fe",
          300: "#a5b9fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },

        accent: {
          400: "#f472b6",
          500: "#ec4899",
          600: "#db2777",
        },
      },

      boxShadow: {
        glow: "0 0 20px rgba(99,102,241,0.35)",
        glowLg: "0 0 40px rgba(99,102,241,0.4)",
        message: "0 2px 8px rgba(0,0,0,0.08)",
        card: "0 4px 24px rgba(0,0,0,0.06)",
      },

      backdropBlur: {
        xs: "2px",
      },

      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },

      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
