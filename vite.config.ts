import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/talent-arena-agenda-2026/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Pre-cache all build assets (JS, CSS, HTML, icons)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
      manifest: {
        name: 'Talent Arena 2026 — Agenda',
        short_name: 'TA Agenda',
        description: 'Talent Arena 2026 conference agenda',
        theme_color: '#0d0d12',
        background_color: '#0d0d12',
        display: 'standalone',
        scope: '/talent-arena-agenda-2026/',
        start_url: '/talent-arena-agenda-2026/',
        icons: [
          {
            src: 't-icon.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
