import { useEffect, useState } from 'react'

export const MOBILE_VIEWPORT_QUERY = '(max-width: 768px)'
export const TOUCH_POINTER_QUERY = '(hover: none), (pointer: coarse)'

export function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_VIEWPORT_QUERY).matches
}

export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(TOUCH_POINTER_QUERY).matches
}

export function isMobileExperience(): boolean {
  return isMobileViewport() || isTouchDevice()
}

export function useMobileExperience(): boolean {
  const [mobile, setMobile] = useState(isMobileExperience)

  useEffect(() => {
    const viewport = window.matchMedia(MOBILE_VIEWPORT_QUERY)
    const touch = window.matchMedia(TOUCH_POINTER_QUERY)
    const update = () => setMobile(viewport.matches || touch.matches)

    viewport.addEventListener('change', update)
    touch.addEventListener('change', update)
    update()

    return () => {
      viewport.removeEventListener('change', update)
      touch.removeEventListener('change', update)
    }
  }, [])

  return mobile
}
