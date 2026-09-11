import { useEffect } from 'react'
import { useSound } from '../lib/sound/SoundContext'
import { getWindowProximity } from '../lib/sound/roomListener'

/**
 * Opens and closes the window on the ear as the camera moves.
 *
 * This used to synthesise wind — brown noise through a swept lowpass, in an
 * AudioContext of its own. Two things were wrong with that. The listener is sitting
 * *inside* a room, where wind is not a sound that exists; and a second AudioContext
 * meant the site's mute did not reach it. Both beds are now real recordings owned by
 * SoundProvider, under the one master gain, so muting mutes everything and film mode
 * ducks the room with a single ramp.
 *
 * The component itself no longer makes any sound. It does one job: read the
 * proximity the archive's frame commit publishes and hand it to the audio graph.
 * `setAmbienceLevel` glides, so this can write every frame without stepping.
 */
/** The outside is never quite shut out — a room with an opening in it still has an
 *  outside, even from the far wall. */
const WINDOW_FLOOR = 0.12
const WINDOW_CEILING = 1

export default function RoomAmbience() {
  const { enabled, setAmbienceLevel } = useSound()

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    let frame = 0
    let last = -1
    const tick = () => {
      frame = requestAnimationFrame(tick)
      const level = WINDOW_FLOOR + (WINDOW_CEILING - WINDOW_FLOOR) * getWindowProximity()
      // A GainNode automation event per frame for a value that has not moved is
      // pure cost; the ear cannot resolve a hundredth of a gain step anyway.
      if (Math.abs(level - last) < 0.01) return
      last = level
      setAmbienceLevel('window', level)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [enabled, setAmbienceLevel])

  return null
}
