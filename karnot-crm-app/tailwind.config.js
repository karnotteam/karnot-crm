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
  // 🛑 CRITICAL FIX: ADD THE SAFELIST BLOCK FOR DYNAMIC CLASSES
  // This solves the StatBadge color issue (UI being broken)
  // ------------------------------------------------------------------
  safelist: [
    {
      // Matches: bg/border/text/ring - [color] - [shade]
      pattern: /(bg|border|text|ring)-(orange|teal|blue|purple|pink|gray)-(100|200|400|500|600|800)/,
      variants: ['hover'],
    },
    'animate-in', 'fade-in', 'slide-in-from-bottom-4' // For the bulk action bar
  ],
  // ------------------------------------------------------------------
  
  plugins: [],
}
