module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        text: "var(--color-text)",
        accent: "var(--color-accent)",
        secondary: "var(--color-secondary)",
        code: "var(--color-code)",
      },
      fontFamily: {
        headline: ["Cinzel", "serif"],
        body: ["Inter", "sans-serif"],
        mono: ["Source Code Pro", "monospace"],
      },
      transitionProperty: {
        'height': 'height',
        'transform': 'transform'
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};