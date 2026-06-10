import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { toFile } from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// Prompt focado em colocar a camiseta da Seleção Brasileira de forma limpa
const JERSEY_PROMPT = [
  'The person in the photo is wearing the official Brazil national soccer team jersey.',
  'The jersey is bright yellow with a V-shaped green collar.',
  'The official CBF (Confederação Brasileira de Futebol) badge is on the left chest.',
  'A small Nike logo is on the right chest.',
  'The word BRASIL appears at the bottom of the jersey.',
  'Four stars are above the CBF badge.',
  'Keep the face, skin tone, and hair exactly as in the original photo.',
  'The person should be facing forward with a confident pose, upper body visible.',
  'Clean, white or neutral studio background.',
  'Photorealistic, high quality.',
].join(' ')

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const photo = formData.get('photo') as File | null
    if (!photo) return NextResponse.json({ error: 'Foto obrigatória' }, { status: 400 })

    const photoBuffer = Buffer.from(await photo.arrayBuffer())
    const mimeType = (photo.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

    // Converte para File object que o OpenAI SDK aceita
    const imageFile = await toFile(photoBuffer, 'photo.png', { type: mimeType })

    const response = await openai.images.edit({
      model: 'gpt-image-1',
      image: imageFile,
      prompt: JERSEY_PROMPT,
      n: 1,
      size: '1024x1024',
    })

    // gpt-image-1 retorna base64 diretamente
    const b64 = response.data?.[0]?.b64_json
    if (!b64) throw new Error('OpenAI não retornou imagem')

    // Encodamos o base64 em base64url para usar como mock ID no poll
    const mockId = `mock_openai_${Buffer.from(b64).toString('base64url')}`
    return NextResponse.json({ predictionId: mockId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
