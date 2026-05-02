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
          bg:       '#FFFFFF',
          surface:  '#F6F7F9',
          surface2: '#FAFAFA',
          surface3: '#E5E7EA',
          blue:     '#2563EB',
          green:    '#2F9461',
          error:    '#F34141',
          warning:  '#FBBC55',
          violet:   '#8879E1',
          text:     '#24292E',
          muted:    '#9EA5AD',
          dim:      '#676E76',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Nohemi', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
