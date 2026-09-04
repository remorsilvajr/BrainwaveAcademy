import { ImageResponse } from 'next/og'

// Shared default social-share image for every route that doesn't define its
// own opengraph-image — Next resolves the file conventions per segment, so
// this root one is the fallback for the whole site. Generated with plain
// divs/text rather than the logo SVG (ImageResponse's renderer, Satori,
// doesn't reliably render arbitrary external SVGs), using the same brand
// colors/copy already established on the landing page hero.
export const alt = 'Brainwave Preschool Academy — Nurturing Young Learners in Their Most Formative Years'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0b1b62 0%, #16226e 100%)',
          padding: 80,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 20px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.1)',
          }}
        >
          <span style={{ fontSize: 22, color: '#76c828', fontWeight: 600 }}>
            Est. June 23, 2005 • Tagum City
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 40,
            fontSize: 68,
            fontWeight: 800,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.15,
          }}
        >
          Brainwave Preschool Academy
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 24,
            fontSize: 32,
            color: '#bac3ff',
            textAlign: 'center',
          }}
        >
          Nurturing Young Learners in Their Most Formative Years
        </div>
      </div>
    ),
    { ...size }
  )
}
