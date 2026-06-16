import sharp from 'sharp'
import * as path from 'path'
import * as fs from 'fs'

// Dynamic import so a native-module load failure is caught inside the async function
// (static import would crash the Lambda before any try-catch can act)
type CanvasModule = typeof import('@napi-rs/canvas')
let _canvas: CanvasModule | null = null
async function getCanvas(): Promise<CanvasModule> {
  if (!_canvas) _canvas = await import('@napi-rs/canvas')
  return _canvas
}

const ASSETS = path.join(process.cwd(), 'public/assets')

function registerFonts(GlobalFonts: CanvasModule['GlobalFonts']) {
  const bold    = path.join(ASSETS, 'Barlow-Bold.ttf')
  const semi    = path.join(ASSETS, 'Barlow-SemiBold.ttf')
  const regular = path.join(ASSETS, 'Barlow-Regular.ttf')
  if (fs.existsSync(bold) && !GlobalFonts.has('Barlow')) {
    GlobalFonts.registerFromPath(bold,    'Barlow')
    GlobalFonts.registerFromPath(semi,    'BarlowSemi')
    GlobalFonts.registerFromPath(regular, 'BarlowRegular')
  }
}

// Layout do card
const W = 1016, H = 1350

const FOTO_W     = 800
const FOTO_H     = 1115
const FOTO_LEFT  = 0
const FADE_START = Math.round(FOTO_H * 0.78)


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

function autoFit(ctx: { font: string; measureText(t: string): { width: number } }, text: string, targetSize: number, fontFamily: string, maxW: number): number {
  for (let s = targetSize; s >= 12; s--) {
    ctx.font = `${s}px "${fontFamily}"`
    if (ctx.measureText(text).width <= maxW) return s
  }
  return 12
}

export async function compositeSticker(personPng: Buffer, data: UserData): Promise<Buffer> {
  const { createCanvas, GlobalFonts } = await getCanvas()
  registerFonts(GlobalFonts)

  // ── 1. Redimensionar e fadear foto ────────────────────────────────────────
  const meta = await sharp(personPng).metadata()
  const pw = meta.width!, ph = meta.height!

  const rSrc = pw / ph, rDst = FOTO_W / FOTO_H
  let newW: number, newH: number
  if (rSrc > rDst) { newH = FOTO_H; newW = Math.round(newH * rSrc) }
  else              { newW = FOTO_W; newH = Math.round(newW / rSrc) }

  const cx = Math.round((newW - FOTO_W) / 2)

  const fotoResized = await sharp(personPng)
    .resize(newW, newH)
    .extract({ left: cx, top: 0, width: FOTO_W, height: FOTO_H })
    .png()
    .toBuffer()

  const fadeMap: number[] = []
  for (let y = 0; y < FOTO_H; y++) {
    for (let x = 0; x < FOTO_W; x++) {
      if (y < FADE_START) {
        fadeMap.push(255, 255, 255, 255)
      } else {
        const t = (y - FADE_START) / (FOTO_H - FADE_START)
        const alpha = Math.round(255 * (1 - t * 0.97))
        fadeMap.push(255, 255, 255, alpha)
      }
    }
  }
  const fadeMask = await sharp(Buffer.from(fadeMap), {
    raw: { width: FOTO_W, height: FOTO_H, channels: 4 },
  }).png().toBuffer()

  const fotoFaded = await sharp(fotoResized)
    .composite([{ input: fadeMask, blend: 'dest-in' }])
    .png()
    .toBuffer()

  // ── 2. Compositar foto centralizada sobre o template ─────────────────────
  const composited = await sharp(path.join(ASSETS, 'template.png'))
    .composite([{ input: fotoFaded, top: 0, left: FOTO_LEFT }])
    .png()
    .toBuffer()

  // ── 3. Badge gerado pela IA junto com a camiseta ─────────────────────────
  const withBadge = composited

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
    // Camada escura semi-transparente para degradar a imagem
    ctx.save()
    ctx.globalAlpha = 0.38
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, W, H)
    ctx.restore()

    // Texto diagonal denso e legível
    ctx.save()
    ctx.globalAlpha = 0.72
    ctx.fillStyle   = '#ffffff'
    ctx.font        = 'bold 58px sans-serif'
    ctx.textAlign   = 'center'
    ctx.translate(W / 2, H / 2)
    ctx.rotate(-Math.PI / 5)
    for (let y = -700; y < 700; y += 110) {
      ctx.fillText('PRÉVIA  •  PRÉVIA  •  PRÉVIA', 0, y)
    }
    ctx.restore()
  }

  const overlayPng = canvas.toBuffer('image/png')

  // ── 5. Compositar overlay final (sem resize aqui para não quebrar as dimensões)
  const composited2 = await sharp(withBadge)
    .composite([{ input: overlayPng }])
    .png()
    .toBuffer()

  // ── 6. Resize final para 768×1024 (etapa separada)
  const finalBuffer = await sharp(composited2)
    .resize(768, 1024, { fit: 'fill' })
    .png()
    .toBuffer()

  return finalBuffer
}
