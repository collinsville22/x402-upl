module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Professional dark theme colors
        x402: {
          bg: '#0A0A0A',
          surface: '#111111',
          'surface-hover': '#1A1A1A',
          border: '#2A2A2A',
          accent: '#00FF88',
          'accent-hover': '#00DD77',
        },
      },
    },
  },
  plugins: [],
};
