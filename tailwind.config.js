/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}", // Scans your Next.js app folder
    // Add "./components/**/*.{js,ts,jsx,tsx}" if you use a components folder
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  plugins: [require('@tailwindcss/typography')],
  theme: {
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
    },
  }
  
};
