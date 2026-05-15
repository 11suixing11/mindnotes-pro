/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#B07D6E',
        secondary: '#C4B5D8',
        monet: {
          lavender: '#C4B5D8',
          rose: '#D4A0A0',
          sage: '#A8C4A0',
          sky: '#A0BCD4',
          gold: '#D4C098',
          water: '#B8D4E8',
          warm: '#E8D4C0',
          blush: '#E0C4B8',
        },
      },
    },
  },
  plugins: [],
}
