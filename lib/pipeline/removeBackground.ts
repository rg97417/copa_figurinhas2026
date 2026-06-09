import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

const exec = promisify(execFile)

// Em dev (sem REPLICATE_API_KEY): usa rembg local (Python, birefnet-general)
// Em prod: usa Replicate API (birefnet-general, ~R$0,01-0,03 por imagem)
export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  if (process.env.REPLICATE_API_KEY) {
    return rembgReplicate(imageBuffer)
  }
  return rembgLocal(imageBuffer)
}

async function rembgReplicate(imageBuffer: Buffer): Promise<Buffer> {
  const base64 = imageBuffer.toString('base64')

  // Cria predição — Prefer: wait=60 torna a chamada síncrona na maioria dos casos
  const res = await fetch('https://api.replicate.com/v1/models/cjwbw/rembg/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.REPLICATE_API_KEY!}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=60',
    },
    body: JSON.stringify({
      input: {
        image: `data:image/jpeg;base64,${base64}`,
        model: 'birefnet-general',
      },
    }),
  })

  if (!res.ok) throw new Error(`Replicate HTTP ${res.status}: ${await res.text()}`)

  let prediction = await res.json() as {
    status: string
    output: string | null
    error: string | null
    urls: { get: string }
  }

  // Polling de fallback caso não termine dentro dos 60s do wait
  let attempts = 0
  while ((prediction.status === 'starting' || prediction.status === 'processing') && attempts < 30) {
    await new Promise((r) => setTimeout(r, 2000))
    const poll = await fetch(prediction.urls.get, {
      headers: { Authorization: `Bearer ${process.env.REPLICATE_API_KEY!}` },
    })
    prediction = await poll.json()
    attempts++
  }

  if (prediction.status === 'failed' || !prediction.output) {
    throw new Error(`Replicate falhou: ${prediction.error ?? 'sem output'}`)
  }

  const imgRes = await fetch(prediction.output)
  if (!imgRes.ok) throw new Error('Falha ao baixar imagem do Replicate')
  return Buffer.from(await imgRes.arrayBuffer())
}

async function rembgLocal(imageBuffer: Buffer): Promise<Buffer> {
  const tmp = os.tmpdir()
  const inFile  = path.join(tmp, `rembg_in_${Date.now()}.jpg`)
  const outFile = path.join(tmp, `rembg_out_${Date.now()}.png`)

  await fs.writeFile(inFile, imageBuffer)

  const script = `
import sys
from rembg import remove, new_session
from PIL import Image
import io, numpy as np

session = new_session('birefnet-general')
inp = open(sys.argv[1], 'rb').read()
out = remove(inp, session=session)

img = Image.open(io.BytesIO(out)).convert('RGBA')
arr = np.array(img, dtype=np.float32)
a   = arr[:,:,3] / 255.0
teal = np.array([99, 188, 205], dtype=np.float32)
for c in range(3):
    arr[:,:,c] = arr[:,:,c] * a + teal[c] * (1.0 - a)
Image.fromarray(arr.astype('uint8'), 'RGBA').save(sys.argv[2])
`
  const scriptFile = path.join(tmp, `rembg_${Date.now()}.py`)
  await fs.writeFile(scriptFile, script)

  await exec('python3', [scriptFile, inFile, outFile])
  const result = await fs.readFile(outFile)

  await Promise.all([fs.unlink(inFile), fs.unlink(outFile), fs.unlink(scriptFile)])
  return result
}
