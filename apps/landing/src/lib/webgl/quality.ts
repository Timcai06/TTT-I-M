import { isMobileExperience } from '../device'

export type GLQualityTier = 'high' | 'medium' | 'low'

export interface GLQualityProfile {
  tier: GLQualityTier
  dprMax: number
  optionalContextLimit: number
  portraitSegments: number
  textSampleGap: number
  textMaxTargets: number
  transitionParticles: number
}

interface NavigatorWithDeviceHints extends Navigator {
  deviceMemory?: number
}

function detectTier(): GLQualityTier {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return 'medium'

  const hints = navigator as NavigatorWithDeviceHints
  const memory = hints.deviceMemory ?? 8
  const cores = navigator.hardwareConcurrency ?? 8
  const mobile = isMobileExperience()

  if (memory <= 4 || cores <= 4 || (mobile && memory <= 6)) return 'low'
  if (memory <= 6 || cores <= 6 || mobile) return 'medium'
  return 'high'
}

export function getGLQualityProfile(): GLQualityProfile {
  const tier = detectTier()

  if (tier === 'low') {
    return {
      tier,
      dprMax: 1.15,
      optionalContextLimit: 1,
      portraitSegments: 150,
      textSampleGap: 8,
      textMaxTargets: 2400,
      transitionParticles: 0,
    }
  }

  if (tier === 'medium') {
    return {
      tier,
      dprMax: 1.35,
      optionalContextLimit: 2,
      portraitSegments: 220,
      textSampleGap: 6,
      textMaxTargets: 4200,
      transitionParticles: 160,
    }
  }

  return {
    tier,
    dprMax: 1.5,
    optionalContextLimit: 3,
    portraitSegments: 260,
    textSampleGap: 5,
    textMaxTargets: 6000,
    transitionParticles: 260,
  }
}
