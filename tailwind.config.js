/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  darkMode: "class",
  content: [
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        'golden': '#d3bc8e',
        
        // Hardcoded Hex values for Universal compatibility (Dark Mode defaults)
        border: "#374151",      // gray-700
        input: "#374151",
        ring: "#22d3ee",        // cyan-400
        background: "#000000",  // black
        foreground: "#ffffff",  // white
        
        primary: {
          DEFAULT: "#22d3ee",   // cyan-400
          foreground: "#000000",
        },
        secondary: {
          DEFAULT: "#1f2937",   // gray-800
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "#ef4444",   // red-500
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#374151",   // gray-700
          foreground: "#9ca3af", // gray-400
        },
        accent: {
          DEFAULT: "#1f2937",   // gray-800
          foreground: "#ffffff",
        },
        popover: {
          DEFAULT: "#111827",   // gray-900
          foreground: "#ffffff",
        },
        card: {
          DEFAULT: "#111827",   // gray-900
          foreground: "#ffffff",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}