import { GoogleGenerativeAI } from '@google/generative-ai'
import { JERSEY_PROMPT, GEMINI_MODEL } from './config'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function generateJerseyPhoto(photoBase64: string, mimeType: string): Promise<Buffer> {
  const model = genai.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { responseModalities: ['image', 'text'] } as never,
  })

  const result = await model.generateContent([
    { inlineData: { mimeType, data: photoBase64 } },
    { text: JERSEY_PROMPT },
  ])

  const parts = result.response.candidates?.[0]?.content?.parts ?? []
  for (const part of parts) {
    if ((part as never as { inlineData?: { mimeType: string; data: string } }).inlineData) {
      const { data } = (part as never as { inlineData: { data: string } }).inlineData
      return Buffer.from(data, 'base64')
    }
  }
  throw new Error('Gemini não retornou imagem')
}
