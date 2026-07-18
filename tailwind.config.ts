import type { Config } from 'tailwindcss';

// Design language: light "Fluent × Hex" — off-white planes, soft layered depth,
// generous radii. Chart colors live in components/charts/palette.ts (validated
// against the card surface); these tokens are UI chrome only.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#f4f3ef',
        card: '#fcfcfb',
        'card-strong': '#ffffff',
        ink: {
          DEFAULT: '#0b0b0b',
          secondary: '#52514e',
          muted: '#898781',
        },
        line: {
          DEFAULT: '#e1e0d9',
          strong: '#c3c2b7',
        },
        accent: {
          DEFAULT: '#4a3aa7',
          soft: '#eeebfb',
          hover: '#3d2f92',
        },
        aqua: { DEFAULT: '#1baf7a', soft: '#e4f6ef' },
        amber: { DEFAULT: '#eda100', soft: '#fdf3dd' },
        coral: { DEFAULT: '#eb6834', soft: '#fdeee7' },
        blue: { DEFAULT: '#2a78d6', soft: '#e7f0fb' },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        // Fluent-style layered depth ramp
        'depth-4': '0 1px 2px rgba(27, 25, 20, 0.06), 0 2px 6px rgba(27, 25, 20, 0.05)',
        'depth-8': '0 2px 4px rgba(27, 25, 20, 0.06), 0 8px 20px rgba(27, 25, 20, 0.07)',
        'depth-16': '0 4px 8px rgba(27, 25, 20, 0.05), 0 16px 40px rgba(27, 25, 20, 0.10)',
        'depth-glow': '0 8px 32px rgba(74, 58, 167, 0.16), 0 2px 8px rgba(74, 58, 167, 0.08)',
      },
      fontFamily: {
        sans: [
          'var(--font-sans)',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-14px) rotate(2deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'float-slow': 'float-slow 7s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
