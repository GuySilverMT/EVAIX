/* eslint-disable no-undef */
/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: [
      './src/**/*.{ts,tsx}',
      './node_modules/flyonui/dist/js/*.js',
    ],
    safelist: [
      'border-t-2', 'border-l-2', 'border-b-2', 'border-r-2',
      'border-cyan-400', 'border-lime-400', 'bg-zinc-950',
      {
        pattern: /bg-(red|green|blue|yellow|purple|pink|amber|cyan|slate|gray|zinc|neutral|stone|orange|lime|emerald|teal|sky|violet|fuchsia|rose)-(100|200|300|400|500|600|700|800|900)/,
      },
      {
        pattern: /from-(red|green|blue|yellow|purple|pink|amber|cyan|slate|gray|zinc|neutral|stone|orange|lime|emerald|teal|sky|violet|fuchsia|rose)-(100|200|300|400|500|600|700|800|900)/,
      },
      {
        pattern: /to-(red|green|blue|yellow|purple|pink|amber|cyan|slate|gray|zinc|neutral|stone|orange|lime|emerald|teal|sky|violet|fuchsia|rose)-(100|200|300|400|500|600|700|800|900)/,
      },
    ],
    theme: {
        extend: {
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)'
                },
                colors: {
                        // FIX: Use variables directly without hsl() wrapper since they are HEX
                        background: 'var(--color-background)', 
                        foreground: 'var(--color-text)',
                        
                        primary: {
                                DEFAULT: 'var(--color-primary)',
                                foreground: '#000000'
                        },
                        secondary: {
                                DEFAULT: 'var(--color-secondary)',
                                foreground: '#ffffff'
                        },
                        accent: {
                                DEFAULT: 'var(--color-accent)',
                                foreground: '#000000'
                        },
                        muted: {
                                DEFAULT: 'var(--color-background-secondary)',
                                foreground: 'var(--color-text-secondary)'
                        },
                        border: 'var(--color-border)',
                        input: 'var(--color-border)',
                        
                        // Semantic Maps
                        success: 'var(--color-success)',
                        warning: 'var(--color-warning)',
                        error: 'var(--color-error)',
                        info: 'var(--color-info)',
                        
                        card: {
                                DEFAULT: 'var(--color-background-secondary)',
                                foreground: 'var(--color-text)'
                        }
                }
        }
    },
    plugins: [
      require("tailwindcss-animate"),
      require("flyonui")
    ],
}
