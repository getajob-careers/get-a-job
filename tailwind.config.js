/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			// Redesign palette — additive. Consumed via bg-rd-coral,
  			// text-rd-text, border-rd-border, etc. See tasks/redesign.md.
  			// CSS variables live in src/styles/redesignTokens.css; existing
  			// pages don't read these classes until they opt in.
  			rd: {
  				'bg-page': 'var(--rd-bg-page)',
  				'bg-card': 'var(--rd-bg-card)',
  				'bg-sidebar': 'var(--rd-bg-sidebar)',
  				'bg-soft': 'var(--rd-bg-soft)',
  				border: 'var(--rd-border)',
  				'border-subtle': 'var(--rd-border-subtle)',
  				'border-hover': 'var(--rd-border-hover)',
  				text: 'var(--rd-text)',
  				'text-secondary': 'var(--rd-text-secondary)',
  				'text-tertiary': 'var(--rd-text-tertiary)',
  				'text-eyebrow': 'var(--rd-text-eyebrow)',
  				coral: 'var(--rd-coral)',
  				'coral-dark': 'var(--rd-coral-dark)',
  				'coral-tint': 'var(--rd-coral-tint)',
  				teal: 'var(--rd-teal)',
  				'teal-dark': 'var(--rd-teal-dark)',
  				'teal-tint': 'var(--rd-teal-tint)',
  				golden: 'var(--rd-golden)',
  				'golden-dark': 'var(--rd-golden-dark)',
  				'golden-tint': 'var(--rd-golden-tint)',
  				peach: 'var(--rd-peach)',
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		fontFamily: {
  			// Redesign display font — Rokkitt slab serif for headings.
  			// Body keeps the platform default (system stack). Loaded via
  			// <link> in index.html.
  			display: ['Rokkitt', 'Georgia', 'serif'],
  		},
  		boxShadow: {
  			rd: 'var(--rd-shadow)',
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}