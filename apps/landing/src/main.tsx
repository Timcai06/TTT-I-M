import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (@fontsource, unicode-range subsets, font-display: swap).
// Replaces the render-blocking Google Fonts stylesheet — fonts.googleapis.com
// is unreachable from mainland China, which left the first paint waiting on a
// dead third-party request. Same families/weights as the old <link>; hashed
// font files ride Vercel's immutable asset cache. The loader still gates on
// document.fonts.ready, which now resolves from same-origin files.
import '@fontsource/playfair-display/400.css'
import '@fontsource/playfair-display/500.css'
import '@fontsource/playfair-display/400-italic.css'
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/noto-serif-sc/300.css'
import '@fontsource/noto-serif-sc/400.css'
import '@fontsource/noto-serif-sc/600.css'
import '@fontsource/jetbrains-mono/300.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './styles/global.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
