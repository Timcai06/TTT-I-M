export const CANVAS_UI_SOURCE = {
  repository: 'https://github.com/DavidHDev/canvas-ui',
  license: 'MIT + Commons Clause',
  licenseFile: './vendor/LICENSE.md',
  imports: {
    decryptReveal: {
      commit: 'a4b40d03ad92a6210af114df7a1900a2675fe288',
      source: 'src/lib/DecryptReveal/DecryptRevealVanilla.ts',
    },
    glass: {
      commit: 'a4b40d03ad92a6210af114df7a1900a2675fe288',
      source: 'src/lib/Glass/GlassVanilla.ts',
    },
  },
} as const
