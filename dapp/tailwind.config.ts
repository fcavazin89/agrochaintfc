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
        // Kraft Paper (Light Backgrounds)
        'kraft': '#f5f1e7',
        'kraft-sup1': '#fffdf8',
        'kraft-sup2': '#f2ecdd',
        'kraft-sup3': '#e8e0cd',
        'kraft-linha': '#e6ddc9',
        'kraft-linha-forte': '#d6c9b0',
        
        // Forest Green (Primary Identity)
        'verde-950': '#071c11',
        'verde-900': '#0d3322',
        'verde-800': '#13422c',
        'verde-700': '#195236',
        'verde-600': '#1f6440',
        'verde-500': '#2f8f52',
        'verde-400': '#4aa06c',
        'verde-300': '#2c7a4e',
        'verde-100': '#e8f2ea',

        // Coffee/Earth (Secondary)
        'cafe-800': '#2f1e10',
        'cafe-700': '#4a2f1c',
        'cafe-600': '#6b4426',
        'cafe-400': '#b07d4f',
        'cafe-300': '#d8b089',

        // Gold Detail
        'ouro': '#b8912a',
        'ouro-claro': '#8a6712',

        // Text
        'texto-1': '#1e2a22',
        'texto-2': '#495649',
        'texto-3': '#7c867a',

        // Semantic Colors
        'positivo': '#15653e',
        'negativo': '#a83226',
        'critico': '#a83226',
        'atencao': '#b26a06',
        'info': '#1f6f9e',
        'especial': '#5f4aa0',

        // Dark Scopes
        'dark-fundo': '#0b1d12',
        'dark-sup1': '#102519',
        'dark-texto-1': '#f3f7f2',
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
        mono: ['Courier New', 'monospace'],
      },
      spacing: {
        'e-1': '4px',
        'e-2': '8px',
        'e-3': '12px',
        'e-4': '16px',
        'e-5': '24px',
        'e-6': '32px',
      },
      borderRadius: {
        'raio-xs': '7px',
        'raio-sm': '10px',
        'raio': '16px',
        'raio-lg': '22px',
        'raio-pill': '999px',
      },
      boxShadow: {
        'sombra': '0 1px 2px rgba(31,42,34,.06)',
        'sombra-2': '0 1px 2px rgba(31,42,34,.05), 0 12px 28px -20px rgba(19,66,44,.35)',
        'sombra-3': '0 26px 64px -26px rgba(13,51,34,.45)',
        'brilho': 'inset 0 1px 0 rgba(255,255,255,.5)',
      },
      transitionDuration: {
        'rapida': '120ms',
        'media': '220ms',
        'lenta': '420ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(.2,.7,.3,1)',
      },
    },
  },
  plugins: [],
};
export default config;
