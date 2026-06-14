/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STUDIO_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// GLSL shaders imported as strings via vite-plugin-glsl (#include resolved at build).
declare module '*.glsl' {
  const value: string
  export default value
}
declare module '*.vert' {
  const value: string
  export default value
}
declare module '*.frag' {
  const value: string
  export default value
}
