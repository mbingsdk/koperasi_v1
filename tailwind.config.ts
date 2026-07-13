import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: '#FBFAF5', 2: '#F0EDE2' },
        ink:   { DEFAULT: '#211F1C', soft: '#6E6760', faint: '#A39B8E' },
        ledger: { DEFAULT: '#3E5FA6', pale: '#E7EDF8', deep: '#1E2C56' },
        margin: { DEFAULT: '#B5392B', pale: '#F6E4E1' },
        flag:   { DEFAULT: '#F2CB4E', pale: '#FBF1D2' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Arial', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: { sm: '2px' },
    },
  },
  plugins: [],
}
export default config
