import sharp from 'sharp'
import { createCanvas, GlobalFonts, Image as CanvasImage, SKRSContext2D } from '@napi-rs/canvas'
import * as path from 'path'
import * as fs from 'fs'

const ASSETS = path.join(process.cwd(), 'public/assets')

// Registra fontes Barlow
function registerFonts() {
  const bold = path.join(ASSETS, 'Barlow-Bold.ttf')
  const semi = path.join(ASSETS, 'Barlow-SemiBold.ttf')
  if (fs.existsSync(bold) && !GlobalFonts.has('Barlow')) {
    GlobalFonts.registerFromPath(bold, 'Barlow')
    GlobalFonts.registerFromPath(semi, 'BarlowSemi')
  }
}

// Layout — idêntico ao gerar_final.py
const W = 1016, H = 1350
const FOTO_X2 = 800, FOTO_Y2 = 1115
const FADE_START = Math.round(FOTO_Y2 * 0.78)

const PILL_X1  = 60,  PILL1_X2 = 760, PILL2_X2 = 703
const P1_Y1 = 1058, P1_Y2 = 1198   // pill 1 — 140px
const P2_Y1 = 1215, P2_Y2 = 1308   // pill 2 — 93px
const PILL_R = 26
const PILL_COLOR = 'rgba(6,121,134,0.98)'
const WHITE = '#ffffff'
const WHITE_SOFT = 'rgba(255,255,255,0.90)'

interface UserData {
  nome: string
  data: string
  altura: string
  peso: string
  clube: string
  watermark?: boolean
}

function autoFit(ctx: SKRSContext2D, text: string, targetSize: number, fontFamily: string, maxW: number): number {
  for (let s = targetSize; s >= 12; s--) {
    ctx.font = `${s}px ${fontFamily}`
    if (ctx.measureText(text).width <= maxW) return s
  }
  return 12
}

export async function compositeSticker(personPng: Buffer, data: UserData): Promise<Buffer> {
  registerFonts()

  // 1. Template
  const template = await sharp(path.join(ASSETS, 'template.png')).toBuffer()

  // 2. Redimensionar e fadear foto
  const personSharp = sharp(personPng)
  const meta = await personSharp.metadata()
  const pw = meta.width!, ph = meta.height!

  const rSrc = pw / ph, rDst = FOTO_X2 / FOTO_Y2
  let newW: number, newH: number
  if (rSrc > rDst) { newH = FOTO_Y2; newW = Math.round(newH * rSrc) }
  else              { newW = FOTO_X2; newH = Math.round(newW / rSrc) }

  const cx = Math.round((newW - FOTO_X2) / 2)
  const fotoResized = await personSharp
    .resize(newW, newH)
    .extract({ left: cx, top: 0, width: FOTO_X2, height: FOTO_Y2 })
    .toBuffer()

  // Aplicar fade vertical
  const fadeCanvas = createCanvas(FOTO_X2, FOTO_Y2)
  const fCtx = fadeCanvas.getContext('2d')
  const grad = fCtx.createLinearGradient(0, FADE_START, 0, FOTO_Y2)
  grad.addColorStop(0, 'rgba(0,0,0,1)')
  grad.addColorStop(1, 'rgba(0,0,0,0.05)')
  fCtx.fillStyle = grad
  fCtx.fillRect(0, 0, FOTO_X2, FOTO_Y2)
  const fadeMask = fadeCanvas.toBuffer('image/png')

  const fotoFaded = await sharp(fotoResized)
    .composite([{ input: fadeMask, blend: 'dest-in' }])
    .toBuffer()

  // 3. Compositar foto no template
  let composite = await sharp(template)
    .composite([{ input: fotoFaded, top: 0, left: 0 }])
    .toBuffer()

  // 4. Desenhar pills + texto com canvas
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  // Carregar composite como imagem
  const bg = new CanvasImage()
  bg.src = composite
  ctx.drawImage(bg, 0, 0)

  // Pills
  function pill(x1: number, y1: number, x2: number, y2: number) {
    ctx.beginPath()
    ctx.roundRect(x1, y1, x2 - x1, y2 - y1, PILL_R)
    ctx.fillStyle = PILL_COLOR
    ctx.fill()
  }
  pill(PILL_X1, P1_Y1, PILL1_X2, P1_Y2)
  pill(PILL_X1, P2_Y1, PILL2_X2, P2_Y2)

  // Texto pill 1
  const p1h = P1_Y2 - P1_Y1         // 140px
  const p1cx = (PILL_X1 + PILL1_X2) / 2
  const p1cw = PILL1_X2 - PILL_X1 - 48

  const NAME_TARGET = Math.round(p1h * 0.33 / 0.72)   // ~64
  const nomeUpper = data.nome.toUpperCase()
  const nameSize  = autoFit(ctx, nomeUpper, NAME_TARGET, 'Barlow', p1cw)
  const statSize  = autoFit(ctx, `${data.data} | ${data.altura} | ${data.peso}`, Math.round(nameSize / 1.577), 'BarlowSemi', p1cw)
  const statsText = `${data.data} | ${data.altura} | ${data.peso}`

  ctx.font = `${nameSize}px Barlow`
  const nameH = ctx.measureText(nomeUpper).actualBoundingBoxAscent + ctx.measureText(nomeUpper).actualBoundingBoxDescent
  ctx.font = `${statSize}px BarlowSemi`
  const statH = ctx.measureText(statsText).actualBoundingBoxAscent + ctx.measureText(statsText).actualBoundingBoxDescent
  const GAP = Math.round(p1h * 0.04)
  const blockH = nameH + GAP + statH
  const blockY = P1_Y1 + (p1h - blockH) / 2 + nameH

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  ctx.font = `${nameSize}px Barlow`
  ctx.fillStyle = WHITE
  ctx.fillText(nomeUpper, p1cx, blockY)

  ctx.font = `${statSize}px BarlowSemi`
  ctx.fillStyle = WHITE_SOFT
  ctx.fillText(statsText, p1cx, blockY + nameH + GAP + statH)  // wait, reuse statH

  // Texto pill 2
  const p2h = P2_Y2 - P2_Y1         // 93px
  const p2cx = (PILL_X1 + PILL2_X2) / 2
  const p2cw = PILL2_X2 - PILL_X1 - 48

  const clubeUpper = data.clube.toUpperCase()
  const CLUB_TARGET = Math.round(nameSize * (27 / 45.9))
  const clubSize  = autoFit(ctx, clubeUpper, CLUB_TARGET, 'Barlow', p2cw)

  ctx.font = `${clubSize}px Barlow`
  const clubH = ctx.measureText(clubeUpper).actualBoundingBoxAscent + ctx.measureText(clubeUpper).actualBoundingBoxDescent
  const clubY = P2_Y1 + (p2h - clubH) / 2 + clubH + 6

  ctx.fillStyle = WHITE
  ctx.fillText(clubeUpper, p2cx, clubY)

  // 5. Watermark (preview)
  if (data.watermark) {
    ctx.save()
    ctx.globalAlpha = 0.22
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 52px Barlow'
    ctx.textAlign = 'center'
    ctx.translate(W / 2, H / 2)
    ctx.rotate(-Math.PI / 5)
    for (let y = -600; y < 600; y += 130) {
      ctx.fillText('PRÉVIA  •  PRÉVIA  •  PRÉVIA', 0, y)
    }
    ctx.restore()
  }

  return canvas.toBuffer('image/png')
}
