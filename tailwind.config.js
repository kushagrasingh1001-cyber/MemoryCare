/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        care: {
          50: '#f4fbf9',
          100: '#e1f5ef',
          200: '#bfe9dc',
          500: '#2f8f78',
          600: '#247461',
          700: '#1e5d50',
        },
        skycare: {
          50: '#f3f8ff',
          100: '#e4efff',
          500: '#3f7fc4',
          700: '#28588d',
        },
        warning: '#b7791f',
        danger: '#b42318',
        ink: '#18312d',
      },
      fontFamily: {
        sans: ['Inter', 'Nunito', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        body: ['1.125rem', { lineHeight: '1.75rem' }],
        title: ['1.75rem', { lineHeight: '2.2rem' }],
      },
      keyframes: {
        softPop: {
          '0%': { transform: 'scale(.96)', opacity: '.6' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        softPop: 'softPop .25s ease-out',
      },
    },
  },
  plugins: [],
};
