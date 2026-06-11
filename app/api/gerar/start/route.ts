import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { storeImage } from '@/lib/imageCache'
import fs from 'fs'
import path from 'path'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const PROMPT =
  'The first image is Neymar wearing the Brazil national team jersey. ' +
  'The second image is a different person. ' +
  'Replace Neymar in the first image with the person from the second image. ' +
  'Keep everything else exactly the same: jersey, pose, framing, lighting and background. ' +
  'The face and identity must match the second image exactly — do not change anything about their appearance.'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const photo = formData.get('photo') as File | null
    if (!photo) return NextResponse.json({ error: 'Foto obrigatória' }, { status: 400 })

    const photoBuffer = Buffer.from(await photo.arrayBuffer())
    const personMime  = (photo.type || 'image/jpeg').split('/')[1]

    const jerseyPath   = path.join(process.cwd(), 'public', 'assets', 'jersey_reference.png')
    const jerseyBase64 = fs.readFileSync(jerseyPath).toString('base64')
    const personBase64 = photoBuffer.toString('base64')

    // Responses API (gpt-4o) — mesmo pipeline que o ChatGPT web usa
    const resp = await (openai.responses.create as Function)({
      model: 'gpt-4o',
      stream: false,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_image', image_url: `data:image/png;base64,${jerseyBase64}` },
            { type: 'input_image', image_url: `data:image/${personMime};base64,${personBase64}` },
            { type: 'input_text',  text: PROMPT },
          ],
        },
      ],
      tools: [{ type: 'image_generation' }],
    }) as { output: Array<{ type: string; result?: string | null }> }

    const imageCall = resp.output.find(o => o.type === 'image_generation_call')
    const b64 = imageCall?.result
    if (!b64) throw new Error('gpt-4o não retornou imagem')

    const cacheId = storeImage(b64)
    return NextResponse.json({ predictionId: `mock_openai_${cacheId}` })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('[start/route] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
