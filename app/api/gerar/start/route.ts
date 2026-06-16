import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { rateLimit } from '@/lib/rateLimit'
import { getSupabaseAdmin } from '@/lib/supabase'
import { randomBytes } from 'crypto'
import fs from 'fs'
import path from 'path'

export const maxDuration = 300

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const PROMPT =
  'The first image is Neymar wearing the Brazil national team jersey. ' +
  'The second image is a different person. ' +
  'Replace Neymar with the person from the second image. ' +
  'Keep everything else exactly the same: jersey, pose, framing, lighting and background. ' +
  'Preserve the exact face, skin tone, hair and age from the second image.'

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    const allowed = await rateLimit(`start:${ip}`, 5, 3600)
    if (!allowed) {
      return NextResponse.json({ error: 'Muitas tentativas. Tente novamente em 1 hora.' }, { status: 429 })
    }

    const formData = await req.formData()
    const photo = formData.get('photo') as File | null
    if (!photo) return NextResponse.json({ error: 'Foto obrigatória' }, { status: 400 })

    if (photo.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Foto muito grande (máx 10 MB)' }, { status: 413 })
    }

    const photoBuffer = Buffer.from(await photo.arrayBuffer())

    const magic = photoBuffer.subarray(0, 4)
    const isJpeg = magic[0] === 0xFF && magic[1] === 0xD8
    const isPng  = magic[0] === 0x89 && magic[1] === 0x50 && magic[2] === 0x4E && magic[3] === 0x47
    const isWebp = magic[0] === 0x52 && magic[1] === 0x49 && magic[2] === 0x46 && magic[3] === 0x46
    if (!isJpeg && !isPng && !isWebp) {
      return NextResponse.json({ error: 'Formato de imagem inválido. Use JPEG, PNG ou WebP.' }, { status: 415 })
    }
    const mimeType = isJpeg ? 'image/jpeg' : isPng ? 'image/png' : 'image/webp'

    const jerseyPath = path.join(process.cwd(), 'public', 'assets', 'jersey_reference.png')
    const jerseyFile = await toFile(fs.readFileSync(jerseyPath), 'jersey.png', { type: 'image/png' })
    const personFile = await toFile(photoBuffer, 'person.png', { type: mimeType })

    const response = await openai.images.edit({
      model: 'gpt-image-2',
      image: [jerseyFile, personFile],
      prompt: PROMPT,
      n: 1,
      size: '1024x1024',
    })

    const b64 = response.data?.[0]?.b64_json
    if (!b64) throw new Error('gpt-image-2 não retornou imagem')

    // Salva em Supabase Storage em vez de memória — garante acesso cross-Lambda
    const imgBuffer = Buffer.from(b64, 'base64')
    const tempId    = randomBytes(16).toString('hex')
    const tempPath  = `temp/${tempId}.png`
    const sb        = getSupabaseAdmin()
    await sb.storage.from('persons').upload(tempPath, imgBuffer, { contentType: 'image/png', upsert: true })

    return NextResponse.json({ predictionId: `mock_openai_${tempId}` })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('[start/route] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
