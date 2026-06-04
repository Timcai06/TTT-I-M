import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ViteImageOptimizer({
      test: /\.(jpe?g|png|gif|tiff|webp|svg|avif)$/i,
      exclude: /public\/frame\//,
      includePublic: true,
      logStats: true,
      cache: true,
      cacheLocation: 'node_modules/.cache/vite-image-optimizer',
      png: {
        quality: 80,
      },
      jpeg: {
        quality: 80,
      },
      jpg: {
        quality: 80,
      },
      webp: {
        quality: 80,
      },
      avif: {
        quality: 75,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Split stable framework libs out of the app chunk so a content edit
        // doesn't bust their long-term cache. Precise `/pkg/` paths so we DON'T
        // pull three.js / @react-three / react-reconciler eager — those stay in
        // the lazy ParticlePortrait chunk where they already live.
        manualChunks(id) {
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) {
            return 'react-vendor'
          }
          if (id.includes('/node_modules/gsap/') || id.includes('/node_modules/@gsap/')) {
            return 'gsap-vendor'
          }
          if (id.includes('/node_modules/three/') || id.includes('/node_modules/@react-three/')) {
            return 'three-vendor'
          }
        },
      },
    },
  },
})
