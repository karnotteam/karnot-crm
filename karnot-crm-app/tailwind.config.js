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
  // ------------------------------------------------------------------
  safelist: [
    {
      // Matches: bg/border/text/ring - [color] - [shade]
      // This includes all the color variations needed by the StatBadge component
      pattern: /(bg|border|text|ring)-(orange|teal|blue|purple|pink|gray)-(100|200|400|500|600|800)/,
      variants: ['hover'],
    },
    // Safelisting classes used by the bulk action bar for entrance animation
    'animate-in', 'fade-in', 'slide-in-from-bottom-4' 
  ],
  // ------------------------------------------------------------------
  
  plugins: [],
}
