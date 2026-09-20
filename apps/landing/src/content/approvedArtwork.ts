/** Shared by the DOM and preload queue so both select the same source density. */
export const approvedArtwork = {
  about: {
    src: '/design/approved-2d/about-collage.webp',
    srcSet: '/design/approved-2d/about-collage-640.webp 640w, /design/approved-2d/about-collage.webp 1069w',
    sizes: '(min-width: 901px) 45vw, 90vw', width: 1069, height: 1472,
  },
  stack: {
    src: '/design/approved-2d/stack-art.webp',
    srcSet: '/design/approved-2d/stack-art.webp 1477w',
    sizes: '100vw', width: 1477, height: 1065,
  },
  contact: {
    src: '/design/approved-2d/contact-art.webp',
    srcSet: '/design/approved-2d/contact-art-960.webp 960w, /design/approved-2d/contact-art.webp 1477w',
    sizes: '100vw', width: 1477, height: 1065,
  },
} as const
