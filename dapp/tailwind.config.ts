import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'kraft': '#f5f1e7',
        'verde-600': '#1f6440',
        'verde-500': '#2f8f52',
        'ouro': '#b8912a',
        'cafe-700': '#4a2f1c',
        'texto-1': '#1e2a22',
        'texto-2': '#495649',
        'dark-header': '#0b1d12',
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
