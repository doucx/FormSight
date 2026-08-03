/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          bg: '#FFFFFF',
          border: '#EEEEEE',
          dot: '#000000',
          grid: '#888888',
          highlight: '#00AA00',
          error: '#FF0000',
        }
      }
    },
  },
  plugins: [],
}