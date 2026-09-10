import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'
import glsl from 'vite-plugin-glsl'
import {
  HTML_IN_CANVAS_ORIGIN_TRIAL_ENV,
  HTML_IN_CANVAS_ORIGIN_TRIAL_ORIGIN_ENV,
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
      htmlInCanvasOriginTrial(originTrialToken, {
        expectedOrigin: process.env[HTML_IN_CANVAS_ORIGIN_TRIAL_ORIGIN_ENV]
          ?? fileEnv[HTML_IN_CANVAS_ORIGIN_TRIAL_ORIGIN_ENV],
        deploymentEnvironment: process.env.VERCEL_ENV,
        deploymentOrigin: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
      }),
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
      // Never base64-inline font files. Vite's 4096-byte default inlined 21 of
      // the @fontsource subsets as `data:font/...` URIs, and the production CSP
      // in vercel.json sets `font-src 'self'` with no `data:`. Every inlined face
      // was blocked, went to status 'error', and made the critical `fonts:document`
      // preload task throw — which is what put the "还有部分内容未能准备好" retry
      // panel on the intro on every production load. Keeping fonts as real files
      // also matches what index.html already claims: they are self-hosted.
      assetsInlineLimit: (filePath: string) => (/\.(?:woff2?|ttf|otf|eot)$/i.test(filePath) ? false : undefined),
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
