import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'
import glsl from 'vite-plugin-glsl'
import {
  HTML_IN_CANVAS_ORIGIN_TRIAL_ENV,
  htmlInCanvasOriginTrial,
} from './config/htmlInCanvasOriginTrial.ts'

function deploymentMetadata() {
  const candidate = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? ''
  const commit = /^[a-f\d]{7,40}$/i.test(candidate) ? candidate.toLowerCase() : 'local'
  return {
    name: 'deployment-metadata',
    generateBundle(this: { emitFile: (asset: { type: 'asset'; fileName: string; source: string }) => void }) {
      this.emitFile({
        type: 'asset',
        fileName: 'build-meta.json',
        source: JSON.stringify({ application: 'landing', commit }),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '')
  const originTrialToken =
    process.env[HTML_IN_CANVAS_ORIGIN_TRIAL_ENV]
    ?? fileEnv[HTML_IN_CANVAS_ORIGIN_TRIAL_ENV]

  return {
    plugins: [
      deploymentMetadata(),
      htmlInCanvasOriginTrial(originTrialToken),
      react(),
      // GLSL `#include` support for authored shader modules.
      glsl({ warnDuplicatedImports: true, removeDuplicatedImports: true }),
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
      // Three's upstream ESM core is one indivisible ~694 KB minified module.
      // The build guard below enforces its materially relevant gzip ceiling
      // (plus a total-JS ceiling), while this limit keeps Vite from reporting the
      // already-audited raw-size warning after Fiber has been split away.
      chunkSizeWarningLimit: 720,
      rollupOptions: {
        output: {
          // Split stable framework libs out of the app chunk so a content edit
          // doesn't bust their long-term cache. Precise `/pkg/` paths so we DON'T
          // pull Three or React Three into the generic React cache layer; Hero's
          // accepted ParticlePortrait preloads the two dedicated chunks below.
          codeSplitting: {
            groups: [
              {
                name: 'react-vendor',
                test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
                priority: 40,
              },
              {
                name: 'gsap-vendor',
                test: /node_modules[\\/](?:gsap|@gsap)[\\/]/,
                priority: 40,
              },
              {
                name: 'three-core',
                test: /node_modules[\\/]three[\\/]/,
                priority: 30,
              },
              {
                name: 'react-three-fiber',
                test: /node_modules[\\/]@react-three[\\/]fiber[\\/]/,
                priority: 20,
              },
              {
                name: 'react-three-vendor',
                test: /node_modules[\\/]@react-three[\\/]/,
                priority: 10,
              },
            ],
          },
        },
      },
    },
  }
})
