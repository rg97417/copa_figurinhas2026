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

// Layout — idêntico ao gerar_final.py
const W = 1016, H = 1350
const FOTO_X2 = 800, FOTO_Y2 = 1115
const FADE_START = Math.round(FOTO_Y2 * 0.78)

const PILL_X1  = 60,  PILL1_X2 = 760, PILL2_X2 = 703
const P1_Y1 = 1058, P1_Y2 = 1198
const P2_Y1 = 1215, P2_Y2 = 1308
const PILL_R = 26

export interface UserData {
  nome: string
  data: string
  altura: string
  peso: string
  clube: string
  watermark?: boolean
}

function autoFit(ctx: SKRSContext2D, text: string, targetSize: number, fontFamily: string, maxW: number): number {
  for (let s = targetSize; s >= 12; s--) {
    ctx.font = `${s}px "${fontFamily}"`
    if (ctx.measureText(text).width <= maxW) return s
  }
  return 12
}

function drawStar(ctx: SKRSContext2D, cx: number, cy: number, outerR: number, innerR: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI / 5) - Math.PI / 2
    const r = i % 2 === 0 ? outerR : innerR
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

function drawCBFBadge(ctx: SKRSContext2D, cx: number, cy: number, bh: number) {
  const sw = bh * 0.80   // shield width
  const sh = bh * 0.80   // shield height
  const sx = cx - sw / 2
  const sy = cy - bh * 0.05

  // ── Shield shape ──────────────────────────────────────────────────────────
  ctx.beginPath()
  ctx.moveTo(sx + sw * 0.12, sy)
  ctx.lineTo(sx + sw * 0.88, sy)
  ctx.quadraticCurveTo(sx + sw, sy, sx + sw, sy + sh * 0.13)
  ctx.lineTo(sx + sw, sy + sh * 0.60)
  ctx.bezierCurveTo(sx + sw, sy + sh * 0.84, cx + sw * 0.12, sy + sh * 0.97, cx, sy + sh)
  ctx.bezierCurveTo(cx - sw * 0.12, sy + sh * 0.97, sx, sy + sh * 0.84, sx, sy + sh * 0.60)
  ctx.lineTo(sx, sy + sh * 0.13)
  ctx.quadraticCurveTo(sx, sy, sx + sw * 0.12, sy)
  ctx.closePath()
  ctx.fillStyle = '#0058A8'
  ctx.fill()
  ctx.strokeStyle = '#F5D020'
  ctx.lineWidth = bh * 0.022
  ctx.stroke()

  // ── Yellow horizontal band ────────────────────────────────────────────────
  const bandY = sy + sh * 0.53
  const bandH = sh * 0.13
  ctx.save()
  ctx.clip()   // keep inside shield shape
  ctx.beginPath()
  ctx.moveTo(sx + sw * 0.12, sy)
  ctx.lineTo(sx + sw * 0.88, sy)
  ctx.quadraticCurveTo(sx + sw, sy, sx + sw, sy + sh * 0.13)
  ctx.lineTo(sx + sw, sy + sh * 0.60)
  ctx.bezierCurveTo(sx + sw, sy + sh * 0.84, cx + sw * 0.12, sy + sh * 0.97, cx, sy + sh)
  ctx.bezierCurveTo(cx - sw * 0.12, sy + sh * 0.97, sx, sy + sh * 0.84, sx, sy + sh * 0.60)
  ctx.lineTo(sx, sy + sh * 0.13)
  ctx.quadraticCurveTo(sx, sy, sx + sw * 0.12, sy)
  ctx.closePath()
  ctx.fillStyle = '#F5D020'
  ctx.fillRect(sx, bandY, sw, bandH)
  ctx.restore()

  // ── White cross (Cruz de Cristo) ──────────────────────────────────────────
  const crossCx = cx
  const crossCy = sy + sh * 0.36
  const ca = sw * 0.19  // arm thickness
  const cl = sw * 0.37  // arm half-length
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(crossCx - ca / 2, crossCy - cl, ca, cl * 2)
  ctx.fillRect(crossCx - cl, crossCy - ca / 2, cl * 2, ca)

  // ── CBF text inside cross ──────────────────────────────────────────────────
  ctx.font      = `bold ${bh * 0.115}px "Barlow"`
  ctx.fillStyle = '#0058A8'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('CBF', crossCx, crossCy + bh * 0.01)

  // ── 5 stars above shield ──────────────────────────────────────────────────
  const starR  = bh * 0.062
  const starRi = starR * 0.42
  const starY  = sy - bh * 0.065
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, cx + (i - 2) * sw * 0.195, starY, starR, starRi, '#119C4A')
  }

  // ── BRASIL text below shield ──────────────────────────────────────────────
  ctx.font      = `bold ${bh * 0.17}px "Barlow"`
  ctx.fillStyle = '#119C4A'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('BRASIL', cx, sy + sh + bh * 0.04)
}

export async function compositeSticker(personPng: Buffer, data: UserData): Promise<Buffer> {
  registerFonts()

  // ── 1. Redimensionar e fadear foto via sharp ──────────────────────────────
  const meta = await sharp(personPng).metadata()
  const pw = meta.width!, ph = meta.height!

  const rSrc = pw / ph, rDst = FOTO_X2 / FOTO_Y2
  let newW: number, newH: number
  if (rSrc > rDst) { newH = FOTO_Y2; newW = Math.round(newH * rSrc) }
  else              { newW = FOTO_X2; newH = Math.round(newW / rSrc) }

  const cx = Math.round((newW - FOTO_X2) / 2)

  // Redimensiona e centraliza
  const fotoResized = await sharp(personPng)
    .resize(newW, newH)
    .extract({ left: cx, top: 0, width: FOTO_X2, height: FOTO_Y2 })
    .png()
    .toBuffer()

  // Máscara de fade vertical (alpha vai de 255 → 0 da parte de baixo)
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

  // Aplica fade na foto (multiplica alpha)
  const fotoFaded = await sharp(fotoResized)
    .composite([{ input: fadeMask, blend: 'dest-in' }])
    .png()
    .toBuffer()

  // ── 2. Compositar foto sobre o template via sharp ─────────────────────────
  const composited = await sharp(path.join(ASSETS, 'template.png'))
    .composite([{ input: fotoFaded, top: 0, left: 0 }])
    .png()
    .toBuffer()

  // ── 3. Canvas: pills + texto em overlay transparente ─────────────────────
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  // Pills
  function pill(x1: number, y1: number, x2: number, y2: number) {
    ctx.beginPath()
    ctx.roundRect(x1, y1, x2 - x1, y2 - y1, PILL_R)
    ctx.fillStyle = 'rgba(6,121,134,0.98)'
    ctx.fill()
  }
  pill(PILL_X1, P1_Y1, PILL1_X2, P1_Y2)
  pill(PILL_X1, P2_Y1, PILL2_X2, P2_Y2)

  // Texto pill 1 — nome + stats
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

  // Texto pill 2 — clube
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

  // ── Escudo CBF sobre a camiseta ──────────────────────────────────────────
  // Posição estimada para retrato frontal padrão (busto): chest center ≈ (370, 650)
  drawCBFBadge(ctx, 370, 655, 172)

  // Watermark
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

  // ── 4. Compositar overlay (pills+texto) sobre a imagem ───────────────────
  const finalBuffer = await sharp(composited)
    .composite([{ input: overlayPng }])
    .png()
    .toBuffer()

  return finalBuffer
}
