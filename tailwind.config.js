/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        finance: {
          navy: '#14213D',
          blue: '#2563EB',
          blueHover: '#1D4ED8',
          electric: '#38BDF8',
          bg: '#F3F5F9',
          card: '#FFFFFF',
          border: '#E2E8F0',
          warning: '#F59E0B',
          danger: '#EF4444',
          textMain: '#0F172A',
          textMuted: '#64748B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
