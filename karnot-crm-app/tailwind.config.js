/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  
  // ------------------------------------------------------------------
  // ✅ CORRECTED: ADDED MISSING 300 SHADE
  // ------------------------------------------------------------------
  safelist: [
    {
      // NOW Matches: (100|200|300|400|500|600|800)
      pattern: /(bg|border|text|ring)-(orange|teal|blue|purple|pink|gray)-(100|200|300|400|500|600|800)/,
      variants: ['hover'],
    },
    'animate-in', 'fade-in', 'slide-in-from-bottom-4' // For the bulk action bar
  ],
  // ------------------------------------------------------------------
  
  plugins: [],
}
