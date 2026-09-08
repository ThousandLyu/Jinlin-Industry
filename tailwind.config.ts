import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#F5F0E8',
        gold: '#C49A2B',
        brown: '#4A3728',
        'brown-light': '#6B5340',
        'brown-dark': '#2D1F12',
        red: '#8B1A2B',
        'red-dark': '#6B1220',
        'red-light': '#A82A3B',
        'card-bg': '#FDFBF7',
        border: '#E8DCC8',
        ink: '#4A3728',
        'ink-soft': '#7C6A5A',
        paper: '#FDFBF7',
      },
      boxShadow: {
        archive: '0 12px 35px rgba(74, 55, 40, 0.10)',
        panel: '0 1px 0 rgba(74, 55, 40, 0.06), 0 16px 45px rgba(74, 55, 40, 0.08)',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', 'SimSun', 'serif'],
        sans: ['"Noto Sans SC"', '"Source Han Sans SC"', '"Microsoft YaHei"', 'Arial', 'sans-serif'],
      },
      backgroundImage: {
        'hero-pattern': "linear-gradient(135deg, rgba(74,55,40,0.92) 0%, rgba(43,31,18,0.88) 100%)",
        'card-gradient': "linear-gradient(135deg, #FDFBF7 0%, #F5F0E8 100%)",
        'gold-gradient': 'linear-gradient(135deg, #C49A2B 0%, #D4A84B 100%)',
        'brown-gradient': 'linear-gradient(180deg, #4A3728 0%, #2D1F12 100%)',
      },
      keyframes: {
        'card-enter': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'skeleton-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'card-enter': 'card-enter 0.4s ease-out',
        'skeleton-pulse': 'skeleton-pulse 1.6s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
export default config
