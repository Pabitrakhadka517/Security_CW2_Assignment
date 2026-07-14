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
    keyframes: {
      'fade-in': {
        '0%': { opacity: '0', transform: 'translateY(6px)' },
        '100%': { opacity: '1', transform: 'translateY(0)' },
      },
      shake: {
        '10%, 90%': { transform: 'translateX(-1px)' },
        '20%, 80%': { transform: 'translateX(2px)' },
        '30%, 50%, 70%': { transform: 'translateX(-4px)' },
        '40%, 60%': { transform: 'translateX(4px)' },
      },
    },
    animation: {
      'fade-in': 'fade-in 0.25s ease-out',
      shake: 'shake 0.4s ease-in-out',
    },
    },
  },
  plugins: [],
}