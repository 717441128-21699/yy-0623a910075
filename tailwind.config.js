/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        dental: {
          50: '#effcfc',
          100: '#c8f5f5',
          200: '#9eedec',
          300: '#6bdfe0',
          400: '#3dc9cb',
          500: '#0D7377',
          600: '#0a5c5f',
          700: '#084648',
          800: '#053031',
          900: '#031b1b',
        },
        accent: {
          50: '#fff5ed',
          100: '#ffe8d4',
          200: '#ffd0a8',
          300: '#ffb073',
          400: '#ff8c3a',
          500: '#E8843C',
          600: '#cc6a22',
          700: '#a85218',
          800: '#843d14',
          900: '#6c2f12',
        },
        surface: {
          50: '#F5F6FA',
          100: '#ECEEF4',
          200: '#D8DBE6',
          300: '#B8BCCF',
          400: '#9298B3',
          500: '#73799A',
          600: '#5D6280',
          700: '#4A4E67',
          800: '#3D4055',
          900: '#1E293B',
        },
      },
      fontFamily: {
        display: ['"Noto Sans SC"', 'sans-serif'],
        body: ['"Noto Sans SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
