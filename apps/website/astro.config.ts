import { defineConfig, fontProviders } from 'astro/config'

// Placeholder until the Vercel project URL / custom domain is known.
export default defineConfig({
  site: 'https://bp-analyst.vercel.app',
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Syne',
      cssVariable: '--font-display',
      weights: [600, 700, 800],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif']
    },
    {
      provider: fontProviders.google(),
      name: 'Manrope',
      cssVariable: '--font-body',
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif']
    }
  ]
})
