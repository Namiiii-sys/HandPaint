/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',     // for app directory
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        doulaise: ['var(--font-doulaise)', 'cursive'],
      },
    },
  },
  plugins: [],
}
