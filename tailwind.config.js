/** @type {import('tailwindcss').Config} */
module.exports = {
  // 1. Apply the NativeWind preset (Crucial for Mobile)
  presets: [require("nativewind/preset")],

  darkMode: "class",
  
  // 2. Scan all files in 'src' for classes
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
      // Provide hardcoded hex fallbacks for Mobile
      border: Platform.OS === 'web' ? "hsl(var(--border))" : "#374151", 
      background: Platform.OS === 'web' ? "hsl(var(--background))" : "#000000",
      foreground: Platform.OS === 'web' ? "hsl(var(--foreground))" : "#ffffff",
      primary: {
        DEFAULT: Platform.OS === 'web' ? "hsl(var(--primary))" : "#22d3ee",
        foreground: Platform.OS === 'web' ? "hsl(var(--primary-foreground))" : "#000000",
      },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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