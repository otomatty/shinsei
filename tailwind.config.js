/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{rs,html}",
  ],
  darkMode: 'class', // classベースのダークモード
  theme: {
    extend: {
      colors: {
        // Lichtblickのカスタムカラーパレット（ダークモード）
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#9480ed', // DEFAULT
          600: '#7a6bc4',
          700: '#6d5fb0',
          800: '#5a4d93',
          900: '#4c4177',
          DEFAULT: '#9480ed',
          dark: '#7a6bc4',
          light: '#b5a5f0',
        },
        secondary: {
          DEFAULT: '#b1b1b1',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#f54966', // DEFAULT
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          DEFAULT: '#f54966',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#eba800', // DEFAULT
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          DEFAULT: '#eba800',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#92c353', // DEFAULT
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          DEFAULT: '#92c353',
        },
        info: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#29bee7', // DEFAULT
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          DEFAULT: '#29bee7',
        },
        // 背景色（ダークモード）
        background: {
          default: '#15151a',
          paper: '#27272b',
          menu: '#35363a',
        },
        // テキスト色
        text: {
          primary: '#e1e1e4',
          secondary: '#a7a6af',
        },
        // グレースケール
        grey: {
          50: '#121217',
          100: '#16161b',
          200: '#212127',
          300: '#27272b',
          400: '#2d2d33',
          500: '#2f2f35',
          600: '#33333a',
          700: '#35353d',
          800: '#3b3b44',
          900: '#45474d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

