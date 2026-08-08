/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ============================================
      // SAFFRON HOUSE LIGHT MODE PALETTE
      // Warm Cream • Crisp White • Dark Charcoal Text • Saffron Gold • Forest Green
      // ============================================
      colors: {
        brand: {
          50:  '#fdfbf7',
          100: '#f7f2e6',
          200: '#ede2cd',
          300: '#dfcca5',
          400: '#cfb27b',
          500: '#c9a84c',   // Main Saffron Gold
          600: '#aa8838',
          700: '#86682b',
          800: '#644b21',
          900: '#463319',
          950: '#261b0c',
        },
        forest: {
          50:  '#f2f7f2',
          100: '#e1ede1',
          200: '#c2dac2',
          300: '#97c097',
          400: '#699f69',
          500: '#2d5a2d',   // Deep Forest Green CTA
          600: '#224822',
          700: '#193619',
          800: '#112511',
          900: '#0a170a',
          950: '#040b04',
        },
        saffron: {
          50:  '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#c9a84c',   // Saffron Gold
          600: '#b8962e',
          700: '#9a7a1e',
          800: '#7a6018',
          900: '#5c4812',
          950: '#3d3009',
        },
        // Warm Cream backgrounds
        cream: {
          50:  '#ffffff',
          100: '#fdfbf7',   // Main Light Body Background
          200: '#f7f2e6',   // Card Surface
          300: '#eee5d3',   // Muted Card / Input Fill
          400: '#decfae',
          500: '#cbb384',
        },
        // Text & Contrast (Dark Charcoal)
        charcoal: {
          950: '#1c1917',   // Primary Text
          900: '#292524',   // Heading Text
          800: '#44403c',   // Body Text
          700: '#57534e',   // Secondary Text
          600: '#78716c',   // Muted Icons
          500: '#a8a29e',
        }
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        serif:   ['Cormorant Garamond', 'Georgia', 'serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
        mono:    ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'light-card': '0 4px 20px -2px rgba(41, 37, 36, 0.06), 0 2px 6px -1px rgba(41, 37, 36, 0.04)',
        'light-hover': '0 12px 32px -4px rgba(41, 37, 36, 0.12), 0 4px 12px -2px rgba(41, 37, 36, 0.08)',
        'gold-glow': '0 4px 20px rgba(201, 168, 76, 0.25)',
        'forest-glow': '0 4px 20px rgba(45, 90, 45, 0.25)',
      }
    },
  },
  plugins: [],
}
