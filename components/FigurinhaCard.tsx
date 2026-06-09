'use client'

import React from 'react'
import clsx from 'clsx'

/*
 * Copa 2026 Official Panini Sticker — exact recreation
 *
 * Layout (portrait, ~1:1.37 ratio):
 *   ┌────────────────────────────────┐
 *   │ [bg: #5CB8E8]                  │
 *   │  ← "2"(giant)   "6"(giant) →  │  deco behind everything
 *   │ ┌──────────────────┐ ┌──────┐ │
 *   │ │   PLAYER PHOTO   │ │ FIFA │ │
 *   │ │   (80% width)    │ │ 🇧🇷  │ │
 *   │ │                  │ │ BRA  │ │
 *   │ └──────────────────┘ └──────┘ │
 *   │  ╭──────────────────────────╮  │
 *   │  │ NOME DO CRAQUE           │  │  dark navy pill (capsule)
 *   │  │ DD/MM/AAAA  |  H m  | W  │  │
 *   │  ╰──────────────────────────╯  │
 *   │  ╭──────────────────────────╮  │
 *   │  │ CLUBE                PANINI│  │  blue pill
 *   │  ╰──────────────────────────╯  │
 *   └────────────────────────────────┘
 */

interface FigurinhaCardProps {
  name?: string
  photo?: string | null
  birthDate?: string
  height?: string   // in meters, e.g. "1,75"
  weight?: string   // in kg
  club?: string
  number?: number
  showWatermark?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  tilt?: 'left' | 'right' | 'none'
}

/* Outer card dimensions (including 2.5px foil border) */
const CARD = {
  xs: { w: 110,  h: 151  },
  sm: { w: 150,  h: 206  },
  md: { w: 208,  h: 285  },
  lg: { w: 268,  h: 367  },
}

/*
 * Proportions relative to INNER card dimensions (outer - 5px for 2.5 padding each side)
 * All distances are fractions of inner width/height
 */
const STRIP_W  = 0.205  // right strip = 20.5% of inner width
const TOP_H    = 0.715  // photo area  = 71.5% of inner height
const PILL1_H  = 0.155  // name pill   = 15.5% of inner height
const PILL2_H  = 0.115  // club pill   = 11.5% of inner height
const PILL_MX  = 0.030  // pill horizontal margin from card edge
const DECO_FS  = 0.720  // "26" font size relative to inner height
const DECO_TOP = 0.036  // "26" top offset
const BORDER_R = 0.054  // border radius relative to inner width

const COPA_BLUE  = '#5CB8E8'
const DECO_COL   = 'rgba(28, 112, 170, 0.64)'
const PILL1_BG   = 'linear-gradient(135deg, #1A3856, #1C4270)'
const PILL2_BG   = 'linear-gradient(135deg, #235690, #286AA8)'
const PANINI_COL = '#FF8800'

/* ── Brazil flag ── */
function BrazilFlag({ d }: { d: number }) {
  return (
    <svg width={d} height={d} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="#009C3B" />
      <polygon points="20,3.5 37.5,20 20,36.5 2.5,20" fill="#FFDF00" />
      <circle cx="20" cy="20" r="12" fill="#002776" />
      <path d="M8,20 Q20,15.5 32,20" stroke="rgba(255,255,255,0.88)" strokeWidth="2.2" fill="none" />
    </svg>
  )
}

/* ── FIFA World Cup 2026 badge ── */
function FifaBadge({ d, nameF }: { d: number; nameF: number }) {
  return (
    <div style={{
      width: d, height: d, borderRadius: '50%',
      background: 'linear-gradient(150deg, #142E52, #0C1E3A)',
      border: '1.5px solid rgba(255,255,255,0.30)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ fontFamily: 'Arial,sans-serif', fontSize: nameF * 0.50, fontWeight: 900, color: 'white', letterSpacing: 0.5, lineHeight: 1 }}>FIFA</span>
      <span style={{ fontFamily: 'Arial,sans-serif', fontSize: nameF * 0.68, fontWeight: 900, color: '#FFD500', letterSpacing: -1, lineHeight: 1 }}>26</span>
    </div>
  )
}

/* ── Player silhouette (when no photo) ── */
function Silhouette({ num }: { num: number }) {
  return (
    <svg viewBox="0 0 100 140" style={{ width: '74%', height: '88%' }} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="137" rx="28" ry="4" fill="rgba(15,75,125,0.25)" />
      <rect x="35" y="103" width="13" height="33" rx="5" fill="#163A62" />
      <rect x="52" y="103" width="13" height="33" rx="5" fill="#163A62" />
      <rect x="31" y="93" width="38" height="17" rx="6" fill="#0D1B4B" />
      <path d="M27 60 Q27 48 41 42 Q48 39 50 39 Q52 39 59 42 Q73 48 73 60 L73 97 L27 97 Z" fill="#009B3A" />
      <path d="M27 60 Q27 48 41 42 Q47 39 50 39 L50 97 L27 97 Z" fill="rgba(255,255,255,0.07)" />
      <text x="50" y="76" textAnchor="middle" fill="rgba(255,215,0,0.9)" fontSize="16" fontWeight="bold" fontFamily="Impact,Arial">{num}</text>
      <rect x="11" y="55" width="16" height="9" rx="4.5" fill="#009B3A" transform="rotate(28,19,59)" />
      <rect x="73" y="55" width="16" height="9" rx="4.5" fill="#009B3A" transform="rotate(-28,81,59)" />
      <rect x="44" y="29" width="12" height="14" rx="5" fill="#C8845E" />
      <ellipse cx="50" cy="21" rx="18" ry="20" fill="#C8845E" />
      <ellipse cx="50" cy="7" rx="19" ry="11" fill="#1a0f00" />
      <ellipse cx="31.5" cy="17" rx="4.5" ry="9" fill="#1a0f00" />
      <ellipse cx="68.5" cy="17" rx="4.5" ry="9" fill="#1a0f00" />
      <circle cx="43" cy="21" r="3" fill="white" />
      <circle cx="57" cy="21" r="3" fill="white" />
      <circle cx="44" cy="22" r="1.8" fill="#1a0f00" />
      <circle cx="58" cy="22" r="1.8" fill="#1a0f00" />
      <path d="M43,30 Q50,37 57,30" stroke="#1a0f00" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/* ════════════════════════════ MAIN COMPONENT ════════════════════════════ */
export function FigurinhaCard({
  name = 'CRAQUE',
  photo,
  birthDate,
  height,
  weight,
  club = '',
  number = 10,
  showWatermark = false,
  size = 'md',
  className,
  tilt = 'none',
}: FigurinhaCardProps) {
  const outer = CARD[size]
  /* inner dimensions (subtract border padding) */
  const iw = outer.w - 5
  const ih = outer.h - 5
  const r = Math.round(iw * BORDER_R)

  const stripW = Math.round(iw * STRIP_W)
  const photoW = iw - stripW
  const topH   = Math.round(ih * TOP_H)
  const pill1H = Math.round(ih * PILL1_H)
  const pill2H = Math.round(ih * PILL2_H)
  const pillMx = Math.round(iw * PILL_MX)
  const pillW  = iw - pillMx * 2

  /* gap after topH before pill1 and between pills */
  const totalPillArea = ih - topH
  const gap1 = Math.max(2, Math.round((totalPillArea - pill1H - pill2H) * 0.38))
  const gap2 = Math.max(2, Math.round((totalPillArea - pill1H - pill2H) * 0.32))

  const decoFS  = Math.round(ih * DECO_FS)
  const decoTop = Math.round(ih * DECO_TOP)

  const nameF  = Math.round(ih * 0.058)
  const statsF = Math.round(ih * 0.037)
  const flagD  = Math.round(stripW * 0.80)
  const fifaD  = Math.round(stripW * 0.72)

  const displayName = (name || 'CRAQUE').toUpperCase()
  const tiltClass = tilt === 'left' ? 'rotate-[-6deg]' : tilt === 'right' ? 'rotate-[6deg]' : ''

  return (
    <div
      className={clsx('relative flex-shrink-0', tiltClass, className)}
      style={{
        width: outer.w,
        height: outer.h,
        borderRadius: r + 3,
        padding: 2.5,
        /* foil border: subtle gradient mimicking holographic Panini edge */
        background: 'linear-gradient(145deg, rgba(220,240,255,0.85), rgba(160,210,240,0.70), rgba(220,240,255,0.80))',
        boxShadow: '0 22px 64px rgba(0,0,0,0.44), 0 4px 18px rgba(0,0,0,0.20)',
      }}
    >
      {/* ── INNER CARD ── */}
      <div
        style={{
          width: iw, height: ih,
          borderRadius: r,
          background: COPA_BLUE,
          position: 'relative',
          overflow: 'hidden',
        }}
      >

        {/* ════ DECORATIVE "2" — left, huge ════ */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: -Math.round(iw * 0.04),
            top: decoTop,
            fontFamily: 'var(--font-bebas), Impact, cursive',
            fontSize: decoFS,
            color: DECO_COL,
            lineHeight: 1,
            userSelect: 'none',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >2</div>

        {/* ════ DECORATIVE "6" — right, huge ════ */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: -Math.round(iw * 0.04),
            top: decoTop,
            fontFamily: 'var(--font-bebas), Impact, cursive',
            fontSize: decoFS,
            color: DECO_COL,
            lineHeight: 1,
            userSelect: 'none',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >6</div>

        {/* ════ PHOTO AREA (left ~80%) ════ */}
        <div
          style={{
            position: 'absolute',
            left: 0, top: 0,
            width: photoW, height: topH,
            overflow: 'hidden',
            zIndex: 1,
          }}
        >
          {photo ? (
            <img
              src={photo}
              alt={displayName}
              draggable={false}
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover',
                objectPosition: 'top center',
                display: 'block',
              }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 2 }}>
              <Silhouette num={number} />
            </div>
          )}
          {/* Bottom fade into pills area */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '22%',
            background: 'linear-gradient(to top, rgba(18,50,86,0.42), transparent)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* ════ RIGHT STRIP (~20%) ════ */}
        <div
          style={{
            position: 'absolute',
            right: 0, top: 0,
            width: stripW, height: topH,
            background: 'rgba(12, 68, 118, 0.22)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-around',
            paddingTop: size === 'xs' ? 5 : 9,
            paddingBottom: size === 'xs' ? 5 : 9,
            zIndex: 2,
          }}
        >
          {/* FIFA 2026 badge */}
          <FifaBadge d={fifaD} nameF={nameF} />

          {/* Brazil flag */}
          <div style={{
            borderRadius: '50%', overflow: 'hidden',
            border: '1.5px solid rgba(255,255,255,0.48)',
            flexShrink: 0,
          }}>
            <BrazilFlag d={flagD} />
          </div>

          {/* BRA text + decorative bars */}
          {size !== 'xs' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <span style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: size === 'sm' ? 7 : 9,
                fontWeight: 900,
                color: 'rgba(255,255,255,0.9)',
                letterSpacing: 1.5,
                textShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}>BRA</span>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: Math.round(stripW * 0.48),
                  height: 2, borderRadius: 99,
                  background: 'rgba(255,255,255,0.42)',
                }} />
              ))}
            </div>
          )}
        </div>

        {/* ════ PILL 1 — NAME + STATS (capsule) ════ */}
        <div
          style={{
            position: 'absolute',
            left: pillMx, top: topH + gap1,
            width: pillW, height: pill1H,
            borderRadius: pill1H / 2,   /* full capsule radius */
            background: PILL1_BG,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingLeft: Math.max(10, Math.round(pill1H * 0.30)),
            paddingRight: Math.max(8, Math.round(pill1H * 0.22)),
            zIndex: 3,
          }}
        >
          <div style={{
            fontFamily: 'var(--font-bebas), Impact, cursive',
            fontSize: nameF,
            color: 'white',
            letterSpacing: 0.4,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {displayName}
          </div>
          {size !== 'xs' && (birthDate || height || weight) && (
            <div style={{
              fontSize: statsF,
              color: 'rgba(255,255,255,0.82)',
              fontFamily: 'Arial, sans-serif',
              fontWeight: 500,
              lineHeight: 1.25,
              display: 'flex',
              gap: 4,
              flexWrap: 'wrap',
              marginTop: 2,
            }}>
              {birthDate && <span>{birthDate}</span>}
              {birthDate && (height || weight) && <span style={{ opacity: 0.4 }}>|</span>}
              {height && <span>{height} m</span>}
              {height && weight && <span style={{ opacity: 0.4 }}>|</span>}
              {weight && <span>{weight} kg</span>}
            </div>
          )}
        </div>

        {/* ════ PILL 2 — CLUB + PANINI (capsule) ════ */}
        <div
          style={{
            position: 'absolute',
            left: pillMx, top: topH + gap1 + pill1H + gap2,
            width: pillW, height: pill2H,
            borderRadius: pill2H / 2,  /* full capsule radius */
            background: PILL2_BG,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: Math.max(10, Math.round(pill2H * 0.38)),
            paddingRight: Math.max(8, Math.round(pill2H * 0.28)),
            zIndex: 3,
          }}
        >
          {size !== 'xs' && (
            <>
              <div style={{
                fontFamily: 'var(--font-bebas), Impact, cursive',
                fontSize: nameF * 0.88,
                color: 'white',
                letterSpacing: 0.5,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
              }}>
                {(club || 'CLUBE').toUpperCase()}
              </div>
              <span style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: statsF * 0.88,
                fontWeight: 900,
                color: PANINI_COL,
                letterSpacing: -0.2,
                flexShrink: 0,
                marginLeft: 4,
              }}>PANINI</span>
            </>
          )}
        </div>

        {/* ════ WATERMARK ════ */}
        {showWatermark && (
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: r,
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: 10,
          }}>
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern
                  id={`wm-${size}-${number}`}
                  x="0" y="0" width="88" height="44"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(-38)"
                >
                  <text x="0" y="28" fontSize={statsF * 1.1}
                    fill="rgba(255,255,255,0.38)" fontWeight="bold"
                    fontFamily="Arial,sans-serif" letterSpacing="2">PREVIEW</text>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#wm-${size}-${number})`} />
            </svg>
          </div>
        )}

        {/* ════ INNER BORDER GLOW ════ */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: r,
          border: '1px solid rgba(255,255,255,0.30)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28)',
          pointerEvents: 'none',
          zIndex: 20,
        }} />
      </div>
    </div>
  )
}
