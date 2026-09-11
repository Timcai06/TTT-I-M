import { useEffect } from 'react'
import { useSound } from '../lib/sound/SoundContext'

/**
 * The air outside the window, synthesised rather than sampled.
 *
 * Wind is broadband noise shaped by a slowly moving filter, so generating it costs
 * a two-second buffer and two oscillators instead of a looping file — and a loop of
 * that length always announces its seam. It also means the room has ambience
 * without waiting on an asset that does not exist yet.
 *
 * Its own AudioContext, deliberately: SoundProvider owns a complete cue engine and
 * does not expose its context, and a bed that runs for the whole visit should not
 * be able to disturb the cross-fades of something that plays for eight seconds.
 * Created on the toggle, which is a real gesture, so autoplay policy is satisfied.
 */
const BUFFER_SECONDS = 2
const BED_GAIN = .055

export default function RoomAmbience() {
  const { enabled } = useSound()

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) return

    let context: AudioContext | null = null
    try { context = new AudioContextClass() } catch { return }
    const ctx = context

    const frames = Math.floor(ctx.sampleRate * BUFFER_SECONDS)
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
    const channel = buffer.getChannelData(0)
    // Brown-ish noise: integrating white noise tilts the spectrum downward, which
    // is what separates wind from hiss.
    let last = 0
    for (let i = 0; i < frames; i++) {
      const white = Math.random() * 2 - 1
      last = (last + white * .02) / 1.02
      channel[i] = last * 3.2
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true

    const band = ctx.createBiquadFilter()
    band.type = 'lowpass'
    band.frequency.value = 480
    band.Q.value = .7

    const bed = ctx.createGain()
    bed.gain.value = 0

    // Gusts: one slow sweep of the filter, one slower swell of level, at different
    // periods so they never line up into an audible cycle.
    const sweep = ctx.createOscillator()
    sweep.frequency.value = .041
    const sweepDepth = ctx.createGain()
    sweepDepth.gain.value = 240
    sweep.connect(sweepDepth).connect(band.frequency)

    const swell = ctx.createOscillator()
    swell.frequency.value = .027
    const swellDepth = ctx.createGain()
    swellDepth.gain.value = BED_GAIN * .45
    swell.connect(swellDepth).connect(bed.gain)

    source.connect(band).connect(bed).connect(ctx.destination)

    const now = ctx.currentTime
    bed.gain.setValueAtTime(0, now)
    bed.gain.linearRampToValueAtTime(BED_GAIN, now + 3.5)

    try { source.start(); sweep.start(); swell.start() } catch { /* already started */ }
    void ctx.resume().catch(() => undefined)

    return () => {
      const end = ctx.currentTime
      bed.gain.cancelScheduledValues(end)
      bed.gain.setValueAtTime(bed.gain.value, end)
      bed.gain.linearRampToValueAtTime(0, end + .4)
      window.setTimeout(() => {
        try { source.stop(); sweep.stop(); swell.stop() } catch { /* already stopped */ }
        void ctx.close().catch(() => undefined)
      }, 500)
    }
  }, [enabled])

  return null
}
