import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

/**
 * Production telemetry is intentionally isolated from the visual app shell.
 * It loads immediately after React commits, but it cannot add SDK bootstrap
 * code to the render-critical entry chunk or delay the Loader/Hero handshake.
 */
export default function ProductionTelemetry() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
