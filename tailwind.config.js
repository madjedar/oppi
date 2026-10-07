/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'Inter', 'sans-serif'],
      },
      colors: {
        // OPPI Theme (Dark Navy, Vibrant Orange, Crisp White)
        brand: {
          navy: '#0B1528',
          navyDark: '#070E1A',
          navyLight: '#142544',
          navyMuted: '#1E355B',
          orange: '#FF6422',
          orangeLight: '#FF7D45',
          orangeDark: '#E64E0F',
          orangeSubtle: '#FFF4ED',
          cream: '#F8FAFC',
          creamDark: '#F1F5F9',
          brown: '#0B1528',
          brownLight: '#475569',
          border: '#E2E8F0',
          surface: '#FFFFFF'
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
