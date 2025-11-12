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
        x402: {
          black: '#0A0A0A',
          surface: '#111111',
          'surface-hover': '#1A1A1A',
          border: '#2A2A2A',
          accent: '#00FF88',
          'accent-hover': '#00DD77',
          'accent-muted': '#00FF8820',
          text: {
            primary: '#FFFFFF',
            secondary: '#CCCCCC',
            tertiary: '#888888',
            muted: '#555555',
          },
          success: '#00FF88',
          warning: '#FFB800',
          error: '#FF4444',
          info: '#00A8FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.02em',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
