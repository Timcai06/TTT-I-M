/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STUDIO_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
