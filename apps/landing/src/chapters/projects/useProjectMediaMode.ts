import { useSyncExternalStore } from 'react'
import { createMediaQueryStore } from '../../lib/mediaQueryStore'

const MOBILE_MEDIA_QUERY = '(max-width: 768px), (pointer: coarse)'
const mobileProjectMediaStore = createMediaQueryStore(MOBILE_MEDIA_QUERY)

export function useMobileProjectMedia(): boolean {
  return useSyncExternalStore(
    mobileProjectMediaStore.subscribe,
    mobileProjectMediaStore.getSnapshot,
    mobileProjectMediaStore.getServerSnapshot,
  )
}
