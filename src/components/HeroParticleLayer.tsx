import { lazy, Suspense } from 'react'

const ParticlePortrait = lazy(() => import('./ParticlePortrait'))

export default function HeroParticleLayer() {
  return (
    <Suspense fallback={null}>
      <ParticlePortrait />
    </Suspense>
  )
}
