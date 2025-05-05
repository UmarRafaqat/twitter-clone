/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'twitter-blue': '#1DA1F2',
        'twitter-dark': '#14171A',
        'twitter-light': '#AAB8C2',
        'twitter-lighter': '#E1E8ED',
        'twitter-lightest': '#F5F8FA',
      },
    },
  },
  plugins: [],
}
