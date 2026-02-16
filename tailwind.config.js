/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./*.html', './src/**/*.html', './js/**/*.js'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        'primary-soft': 'var(--color-primary-soft)',
        'bg-main': 'var(--color-bg-main)',
        'bg-section': 'var(--color-bg-section)',
        'bg-card': 'var(--color-bg-card)',
        'text-main': 'var(--color-text-main)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'text-inverse': 'var(--color-text-inverse)',
        border: 'var(--color-border)',
        divider: 'var(--color-divider)',
        success: 'var(--color-success)'
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)'
      },
      keyframes: {
        pulseSoft: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.12)', opacity: '0.62' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        equalize: {
          '0%': { transform: 'scaleY(0.4)' },
          '30%': { transform: 'scaleY(1)' },
          '60%': { transform: 'scaleY(0.5)' },
          '100%': { transform: 'scaleY(0.8)' }
        },
        quoteCycle: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '8%': { opacity: '1', transform: 'translateY(0)' },
          '30%': { opacity: '1', transform: 'translateY(0)' },
          '38%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '0' }
        }
      },
      animation: {
        'pulse-soft': 'pulseSoft 1.8s infinite',
        equalize: 'equalize 1.8s ease-in-out infinite',
        'quote-cycle': 'quoteCycle 12s infinite'
      }
    }
  },
  plugins: []
};
