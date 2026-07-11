/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
colors: {
      primary: '#0ea5e9', // Sky Blue
      accent: '#fb923c', // Orange
      dark: '#0f172a',   // Navbar
    },
    boxShadow: {
      neumorphic: '5px 5px 10px #d1d9e6, -5px -5px 10px #ffffff',
    },
    },
  },
  plugins: [],
}