'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFigurinhaStore, formatBirthDate } from '@/lib/store'

type Stage =
  | 'flux_start'
  | 'flux_poll'
  | 'rembg_start'
  | 'rembg_poll'
  | 'finishing'
  | 'done'
  | 'error'

const STAGE_MSG: Record<Stage, string> = {
  flux_start:   '⚡ Processando a foto do craque...',
  flux_poll:    '🎽 Aplicando camiseta da Seleção Brasileira...',
  rembg_start:  '✂️ Iniciando remoção do fundo...',
  rembg_poll:   '✂️ Removendo o fundo da foto...',
  finishing:    '🏆 Aplicando design Panini Copa 2026...',
  done:         '✅ Figurinha pronta!',
  error:        '⚠️ Erro',
}

const STAGE_PCT: Record<Stage, number> = {
  flux_start:   5,
  flux_poll:    10,
  rembg_start:  55,
  rembg_poll:   60,
  finishing:    88,
  done:         100,
  error:        0,
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function pollUntilDone(id: string, onProgress?: () => void): Promise<string> {
  for (let i = 0; i < 60; i++) {
    await sleep(3000)
    const res = await fetch(`/api/gerar/poll/${id}`)
    const data = await res.json()
    if (data.status === 'failed') throw new Error(`Predição falhou: ${data.error}`)
    if (data.status === 'succeeded' && data.output) return data.output as string
    onProgress?.()
  }
  throw new Error('Timeout: predição demorou mais de 3 minutos')
}

export default function GerandoPage() {
  const router = useRouter()
  const store  = useFigurinhaStore()
  const called = useRef(false)

  const [stage, setStage]     = useState<Stage>('flux_start')
  const [progress, setProgress] = useState(5)
  const [error, setError]     = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  // Ticker de tempo decorrido
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Anima progresso suavemente entre etapas
  useEffect(() => {
    const target = STAGE_PCT[stage]
    if (progress < target) {
      const t = setInterval(() => {
        setProgress((p) => {
          if (p >= target) { clearInterval(t); return p }
          return Math.min(p + 1, target)
        })
      }, 40)
      return () => clearInterval(t)
    }
  }, [stage, progress])

  useEffect(() => {
    if (!store.name || !store.photo) { router.replace('/criar'); return }
    if (called.current) return
    called.current = true

    async function run() {
      try {
        const birthDate = formatBirthDate(store.birthDay, store.birthMonth, store.birthYear)
        const heightM   = store.height
          ? (parseFloat(store.height) / 100).toFixed(2).replace('.', ',') + ' m'
          : ''
        const weightKg  = store.weight ? store.weight + ' kg' : ''

        // Converte base64 data URL → Blob
        const dataUrl   = store.photo!
        const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/)
        const mimeType  = mimeMatch ? mimeMatch[1] : 'image/jpeg'
        const raw       = atob(dataUrl.split(',')[1])
        const bytes     = new Uint8Array(raw.length)
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
        const blob      = new Blob([bytes], { type: mimeType })

        // 1. Inicia FLUX Kontext
        setStage('flux_start')
        const fd = new FormData()
        fd.append('photo', blob, 'photo.jpg')
        const startRes = await fetch('/api/gerar/start', { method: 'POST', body: fd })
        if (!startRes.ok) throw new Error((await startRes.json()).error)
        const { predictionId: fluxId } = await startRes.json()

        // 2. Polling FLUX
        setStage('flux_poll')
        const jerseyUrl = await pollUntilDone(fluxId, () => {
          setProgress((p) => Math.min(p + 0.5, 52))
        })

        // 3. Inicia rembg
        setStage('rembg_start')
        const rembgRes = await fetch('/api/gerar/rembg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: jerseyUrl }),
        })
        if (!rembgRes.ok) throw new Error((await rembgRes.json()).error)
        const { predictionId: rembgId } = await rembgRes.json()

        // 4. Polling rembg
        setStage('rembg_poll')
        const rembgUrl = await pollUntilDone(rembgId, () => {
          setProgress((p) => Math.min(p + 0.5, 85))
        })

        // 5. Compositor
        setStage('finishing')
        const finishRes = await fetch('/api/gerar/finish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rembgUrl,
            nome:   store.name.toUpperCase(),
            data:   birthDate,
            altura: heightM,
            peso:   weightKg,
            clube:  store.club,
          }),
        })
        if (!finishRes.ok) throw new Error((await finishRes.json()).error)

        const imgBlob = await finishRes.blob()
        const url     = URL.createObjectURL(imgBlob)
        store.setStickerUrl(url)

        setStage('done')
        setProgress(100)
        setTimeout(() => router.push('/sua-figurinha'), 600)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
        setStage('error')
      }
    }

    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: 'linear-gradient(160deg, #0D1B4B 0%, #091830 60%, #050E24 100%)' }}
      >
        <div
          className="max-w-mobile w-full rounded-3xl p-8 text-center"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,80,80,0.3)' }}
        >
          <div style={{ fontSize: 52, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 28, color: '#FFD500', letterSpacing: 1, marginBottom: 12 }}>
            ALGO DEU ERRADO
          </div>
          <p style={{ fontFamily: 'var(--font-barlow)', fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 24, lineHeight: 1.6 }}>
            {error}
          </p>
          <button className="btn-primary" onClick={() => router.push('/criar')}>
            ← TENTAR NOVAMENTE
          </button>
        </div>
      </main>
    )
  }

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #0D1B4B 0%, #091830 60%, #050E24 100%)' }}
    >
      <div className="w-full flex-shrink-0" style={{ height: 4, background: 'linear-gradient(90deg, #009B3A, #FFD500, #009B3A)', backgroundSize: '200% 100%', animation: 'shimmerSlide 2s linear infinite' }} />

      <div className="flex-1 flex flex-col justify-between max-w-mobile w-full px-4 py-8" style={{ margin: '0 auto' }}>

        <div className="text-center mb-6">
          <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 38, color: '#FFD500', letterSpacing: 2, lineHeight: 1 }}>
            GERANDO SUA FIGURINHA
          </div>
          <p style={{ fontFamily: 'var(--font-barlow)', fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginTop: 6 }}>
            Não saia dessa tela — pode levar até 2 minutos ⏱
          </p>
        </div>

        <div
          className="rounded-3xl flex flex-col items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', minHeight: 280, padding: '28px 20px' }}
        >
          <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 16, filter: 'drop-shadow(0 8px 24px rgba(255,213,0,0.25))', animation: 'starSpin 8s linear infinite' }}>
            ⚽
          </div>

          <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 64, color: '#FFD500', lineHeight: 1, letterSpacing: 2, filter: 'drop-shadow(0 4px 16px rgba(255,213,0,0.4))' }}>
            {Math.round(progress)}%
          </div>

          <div style={{ fontFamily: 'var(--font-barlow)', fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
            {elapsed}s decorridos
          </div>

          <div key={stage} className="mt-6 text-center animate-fade-in" style={{ fontFamily: 'var(--font-barlow)', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.8)', minHeight: 22 }}>
            {STAGE_MSG[stage]}
          </div>

          <div className="flex gap-2 mt-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-full" style={{ width: 8, height: 8, background: '#FFD500', animation: `pulse 1.2s ease-in-out infinite ${i * 0.2}s`, opacity: 0.6 }} />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="vsl-progress-track">
            <div className="vsl-progress-fill" style={{ width: `${progress}%`, transition: 'width 0.4s ease' }} />
          </div>
          <div className="flex items-center justify-between mt-2" style={{ fontFamily: 'var(--font-barlow)', fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>
            <span>{elapsed}s</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        <div className="rounded-2xl text-center mt-5" style={{ background: 'linear-gradient(135deg, rgba(0,155,58,0.18), rgba(0,155,58,0.08))', border: '1.5px solid rgba(0,155,58,0.3)', padding: '14px 18px' }}>
          <p style={{ fontFamily: 'var(--font-barlow)', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
            🏆 Adquira sua figurinha <strong style={{ color: '#FFD500' }}>HOJE</strong> e concorra a
          </p>
          <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 38, color: '#009B3A', letterSpacing: 2, lineHeight: 1.1, filter: 'drop-shadow(0 2px 12px rgba(0,155,58,0.5))' }}>
            MIL REAIS
          </div>
          <p style={{ fontFamily: 'var(--font-barlow)', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
            no dia 11/06/2026 — início dos jogos!
          </p>
        </div>

        <p className="text-center mt-5" style={{ fontFamily: 'var(--font-barlow)', fontSize: 11.5, color: 'rgba(255,255,255,0.2)' }}>
          Você será redirecionado automaticamente quando pronto
        </p>
      </div>
    </main>
  )
}
