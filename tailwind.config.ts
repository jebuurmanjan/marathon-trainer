import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        komoot: {
          bg:       '#F5F3EC',
          surface:  '#EDE9DE',
          surface2: '#F5F4F2',
          surface3: '#E3D2B4',
          orange:   '#EE6B17',
          green:    '#4A5427',
          'green-deep': '#2B3117',
          violet:   '#8879E1',
          tan:      '#E3D2B4',
          text:     '#1E1611',
          muted:    '#4A5427',
          dim:      '#736554',
        },
      },
      fontFamily: {
        display: ['Nohemi', 'Inter', 'system-ui', 'sans-serif'],
        body:    ['Satoshi', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
