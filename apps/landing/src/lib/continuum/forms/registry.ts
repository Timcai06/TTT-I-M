import type { SimBehavior } from '../simulation'
import { disintegrateForm } from './disintegrate.ts'
import { stardustForm } from './stardust.ts'

export type ContinuumFormId = 'portrait' | 'disintegrate' | 'stardust'

export interface FormDescriptor {
  id: ContinuumFormId
  fallback: string
  behavior: SimBehavior
  tint: string
}

export const continuumForms = {
  portrait: {
    id: 'portrait',
    fallback: '#hero .hero__portrait-ghost',
    tint: '#d8d2c5',
    behavior: {
      stiffness: 3.4,
      turbulence: 0.18,
      damping: 0.91,
      noiseScale: 0.72,
    },
  },
  disintegrate: disintegrateForm,
  stardust: stardustForm,
} satisfies Record<ContinuumFormId, FormDescriptor>

export function getContinuumForm(id: ContinuumFormId): FormDescriptor {
  return continuumForms[id]
}
