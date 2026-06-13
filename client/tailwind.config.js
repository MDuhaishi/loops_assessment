/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-orange': '#FF9B53',
        'brand-teal': '#073B4C',
        'brand-orange-soft': '#FFF1E7',
        'brand-teal-soft': '#E8F1F3',
        surface: '#FFFFFF',
        background: '#F7F8F8',
        'text-primary': '#102A32',
        muted: '#60757C',
        success: '#2E8B70',
        warning: '#D9902F',
        danger: '#C95B5B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 4px 0 rgba(7, 59, 76, 0.08)',
        'card-hover': '0 4px 16px 0 rgba(7, 59, 76, 0.12)',
      },
    },
  },
  plugins: [],
};
