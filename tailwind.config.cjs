/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './components/**/*.{vue,ts,js}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{ts,js}',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#d0252b',
          secondary: '#ef767b',
          dark: '#a31c21',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: '12px',
      },
    },
  },
  plugins: [],
}
