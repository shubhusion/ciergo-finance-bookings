import type { Config } from "tailwindcss";

/**
 * Tokens lifted from the Figma file (Finance – Bookings).
 * Only values that actually appear in the design are declared here; everything
 * else falls back to the Tailwind defaults.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F5F3FF",
          100: "#EDE9FE",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
        },
        canvas: "#F4F4F6",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
