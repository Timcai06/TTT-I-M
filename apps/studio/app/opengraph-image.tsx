import { ImageResponse } from 'next/og'

export const alt = 'Tim Cai Studio'
export const contentType = 'image/png'
export const size = {
  width: 1200,
  height: 630,
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          color: '#f0f0f0',
          background: '#0a0a0a',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#7890a8' }}>
          Tim Cai Studio
        </div>
        <div style={{ maxWidth: 860, fontSize: 82, lineHeight: 0.95, letterSpacing: '-0.055em' }}>
          Quiet content beside the cinematic landing.
        </div>
      </div>
    ),
    size
  )
}
