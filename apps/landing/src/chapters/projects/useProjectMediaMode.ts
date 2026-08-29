import { useEffect, useState } from 'react'

const MOBILE_MEDIA_QUERY = '(max-width: 768px), (pointer: coarse)'

export function useMobileProjectMedia(): boolean {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const query = window.matchMedia(MOBILE_MEDIA_QUERY)
    const sync = () => setMobile(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  return mobile
}

