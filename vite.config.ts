import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/personal-life-os/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'Personal Life OS',
        short_name: 'Life OS',
        description: 'Your personal command centre for productivity, fitness, finance, and self-development.',
        theme_color: '#06060f',
        background_color: '#06060f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/personal-life-os/',
        start_url: '/personal-life-os/',
        categories: ['productivity', 'lifestyle', 'health', 'finance'],
        icons: [
          { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png' },
          { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('recharts')) return 'vendor-charts';
          if (id.includes('dexie')) return 'vendor-db';
          if (id.includes('zustand')) return 'vendor-state';
          if (id.includes('date-fns')) return 'vendor-utils';
          if (id.includes('node_modules')) return 'vendor-react';
        },
      },
    },
    target: 'esnext',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'dexie', 'dexie-react-hooks', 'zustand', 'recharts', 'lucide-react', 'date-fns'],
  },
})
