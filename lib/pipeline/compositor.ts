import sharp from 'sharp'
import { createCanvas, GlobalFonts, SKRSContext2D } from '@napi-rs/canvas'
import * as path from 'path'
import * as fs from 'fs'

const ASSETS = path.join(process.cwd(), 'public/assets')

function registerFonts() {
  const bold    = path.join(ASSETS, 'Barlow-Bold.ttf')
  const semi    = path.join(ASSETS, 'Barlow-SemiBold.ttf')
  const regular = path.join(ASSETS, 'Barlow-Regular.ttf')
  if (fs.existsSync(bold) && !GlobalFonts.has('Barlow')) {
    GlobalFonts.registerFromPath(bold,    'Barlow')
    GlobalFonts.registerFromPath(semi,    'BarlowSemi')
    GlobalFonts.registerFromPath(regular, 'BarlowRegular')
  }
}

// Layout
const W = 1016, H = 1350
const FOTO_X2 = 800, FOTO_Y2 = 1115
const FADE_START = Math.round(FOTO_Y2 * 0.78)

const PILL_X1  = 60,  PILL1_X2 = 760, PILL2_X2 = 703
const P1_Y1 = 1058, P1_Y2 = 1198
const P2_Y1 = 1215, P2_Y2 = 1308
const PILL_R = 26

// Fallback — usado se a detecção falhar
const BADGE_CX_DEFAULT = 400
const BADGE_CY_DEFAULT = 640

export interface UserData {
  nome: string
  data: string
  altura: string
  peso: string
  clube: string
  watermark?: boolean
}

async function detectBadgePosition(fotoResized: Buffer): Promise<{ cx: number; cy: number }> {
  try {
    const { info } = await sharp(fotoResized)
      .trim({ threshold: 10 })
      .toBuffer({ resolveWithObject: true })
    const personLeft = -Math.round((info as { trimOffsetLeft?: number }).trimOffsetLeft ?? 0)
    const personTop  = -Math.round((info as { trimOffsetTop?: number }).trimOffsetTop  ?? 0)
    const personW    = info.width
    const personH    = info.height
    // Badge no centro X da pessoa, ~52% da altura (peito superior)
    return {
      cx: personLeft + Math.round(personW / 2),
      cy: personTop  + Math.round(personH * 0.52),
    }
  } catch {
    return { cx: BADGE_CX_DEFAULT, cy: BADGE_CY_DEFAULT }
  }
}

function autoFit(ctx: SKRSContext2D, text: string, targetSize: number, fontFamily: string, maxW: number): number {
  for (let s = targetSize; s >= 12; s--) {
    ctx.font = `${s}px "${fontFamily}"`
    if (ctx.measureText(text).width <= maxW) return s
  }
  return 12
}

export async function compositeSticker(personPng: Buffer, data: UserData): Promise<Buffer> {
  registerFonts()

  // ── 1. Redimensionar e fadear foto ────────────────────────────────────────
  const meta = await sharp(personPng).metadata()
  const pw = meta.width!, ph = meta.height!

  const rSrc = pw / ph, rDst = FOTO_X2 / FOTO_Y2
  let newW: number, newH: number
  if (rSrc > rDst) { newH = FOTO_Y2; newW = Math.round(newH * rSrc) }
  else              { newW = FOTO_X2; newH = Math.round(newW / rSrc) }

  const cx = Math.round((newW - FOTO_X2) / 2)

  const fotoResized = await sharp(personPng)
    .resize(newW, newH)
    .extract({ left: cx, top: 0, width: FOTO_X2, height: FOTO_Y2 })
    .png()
    .toBuffer()

  const fadeMap: number[] = []
  for (let y = 0; y < FOTO_Y2; y++) {
    for (let x = 0; x < FOTO_X2; x++) {
      if (y < FADE_START) {
        fadeMap.push(255, 255, 255, 255)
      } else {
        const t = (y - FADE_START) / (FOTO_Y2 - FADE_START)
        const alpha = Math.round(255 * (1 - t * 0.97))
        fadeMap.push(255, 255, 255, alpha)
      }
    }
  }
  const fadeMask = await sharp(Buffer.from(fadeMap), {
    raw: { width: FOTO_X2, height: FOTO_Y2, channels: 4 },
  }).png().toBuffer()

  const fotoFaded = await sharp(fotoResized)
    .composite([{ input: fadeMask, blend: 'dest-in' }])
    .png()
    .toBuffer()

  // ── 2. Compositar foto sobre o template ──────────────────────────────────
  const composited = await sharp(path.join(ASSETS, 'template.png'))
    .composite([{ input: fotoFaded, top: 0, left: 0 }])
    .png()
    .toBuffer()

  // ── 3. Overlay do badge CBF — usa arquivo oficial, ignora badge gerado pela IA
  const badgePos = await detectBadgePosition(fotoResized)
  const badgePng = fs.readFileSync(path.join(ASSETS, 'cbf_badge_clean.png'))
  const BADGE_W = 130, BADGE_H = 214
  const withBadge = await sharp(composited)
    .composite([{
      input: badgePng,
      left: Math.max(0, Math.min(W - BADGE_W, Math.round(badgePos.cx - BADGE_W / 2))),
      top:  Math.max(0, Math.min(H - BADGE_H, Math.round(badgePos.cy - BADGE_H / 2))),
    }])
    .png()
    .toBuffer()

  // ── 4. Canvas: pills + texto + watermark ─────────────────────────────────
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  function pill(x1: number, y1: number, x2: number, y2: number) {
    ctx.beginPath()
    ctx.roundRect(x1, y1, x2 - x1, y2 - y1, PILL_R)
    ctx.fillStyle = 'rgba(6,121,134,0.98)'
    ctx.fill()
  }
  pill(PILL_X1, P1_Y1, PILL1_X2, P1_Y2)
  pill(PILL_X1, P2_Y1, PILL2_X2, P2_Y2)

  const p1h = P1_Y2 - P1_Y1
  const p1cx = (PILL_X1 + PILL1_X2) / 2
  const p1cw = PILL1_X2 - PILL_X1 - 48

  const nomeUpper     = data.nome.toUpperCase()
  const [dd, mm, yy]  = data.data.split('/')
  const dataFormatada = `${parseInt(dd)}-${parseInt(mm)}-${yy}`
  const statsText     = `${dataFormatada} | ${data.altura} | ${data.peso}`

  const NAME_TARGET = Math.round(p1h * 0.33 / 0.72)
  const nameSize    = autoFit(ctx, nomeUpper, NAME_TARGET, 'Barlow', p1cw)
  const statSize    = autoFit(ctx, statsText, Math.round(nameSize / 1.577), 'BarlowRegular', p1cw)

  ctx.font = `${nameSize}px "Barlow"`
  const nm = ctx.measureText(nomeUpper)
  const nameH = nm.actualBoundingBoxAscent + nm.actualBoundingBoxDescent

  ctx.font = `${statSize}px "BarlowRegular"`
  const sm = ctx.measureText(statsText)
  const statH = sm.actualBoundingBoxAscent + sm.actualBoundingBoxDescent

  const GAP    = Math.round(p1h * 0.04)
  const blockH = nameH + GAP + statH
  const baseY  = P1_Y1 + (p1h - blockH) / 2 + nameH

  ctx.textAlign    = 'center'
  ctx.textBaseline = 'alphabetic'

  ctx.font      = `${nameSize}px "Barlow"`
  ctx.fillStyle = '#ffffff'
  ctx.fillText(nomeUpper, p1cx, baseY)

  ctx.font      = `${statSize}px "BarlowRegular"`
  ctx.fillStyle = 'rgba(255,255,255,0.90)'
  ctx.fillText(statsText, p1cx, baseY + GAP + statH)

  const p2h  = P2_Y2 - P2_Y1
  const p2cx = (PILL_X1 + PILL2_X2) / 2
  const p2cw = PILL2_X2 - PILL_X1 - 48

  const clubeUpper  = data.clube.toUpperCase()
  const CLUB_TARGET = Math.round(nameSize * (27 / 45.9))
  const clubSize    = autoFit(ctx, clubeUpper, CLUB_TARGET, 'Barlow', p2cw)

  ctx.font = `${clubSize}px "Barlow"`
  const cm = ctx.measureText(clubeUpper)
  const clubH = cm.actualBoundingBoxAscent + cm.actualBoundingBoxDescent
  const clubY = P2_Y1 + (p2h - clubH) / 2 + clubH + 6

  ctx.fillStyle = '#ffffff'
  ctx.fillText(clubeUpper, p2cx, clubY)

  if (data.watermark) {
    ctx.save()
    ctx.globalAlpha = 0.22
    ctx.fillStyle   = '#ffffff'
    ctx.font        = 'bold 52px "Barlow"'
    ctx.textAlign   = 'center'
    ctx.translate(W / 2, H / 2)
    ctx.rotate(-Math.PI / 5)
    for (let y = -600; y < 600; y += 130) {
      ctx.fillText('PRÉVIA  •  PRÉVIA  •  PRÉVIA', 0, y)
    }
    ctx.restore()
  }

  const overlayPng = canvas.toBuffer('image/png')

  // ── 5. Compositar overlay final ───────────────────────────────────────────
  const finalBuffer = await sharp(withBadge)
    .composite([{ input: overlayPng }])
    .png()
    .toBuffer()

  return finalBuffer
}
