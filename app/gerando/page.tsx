'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFigurinhaStore, formatBirthDate } from '@/lib/store'

const MESSAGES = [
  { at: 0,  text: '⚡ Processando a foto do craque...' },
  { at: 10, text: '🎨 Aplicando camiseta da Seleção Brasileira...' },
  { at: 25, text: '✂️ Removendo o fundo da foto...' },
  { at: 40, text: '🏆 Aplicando design Panini Copa 2026...' },
  { at: 55, text: '✨ Finalizando os detalhes da figurinha...' },
  { at: 70, text: '📦 Quase pronto! Um instante...' },
]

export default function GerandoPage() {
  const router = useRouter()
  const store = useFigurinhaStore()
  const [progress, setProgress] = useState(0)
  const [msgIndex, setMsgIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const called = useRef(false)

  useEffect(() => {
    if (!store.name || !store.photo) {
      router.replace('/criar')
      return
    }
    if (called.current) return
    called.current = true

    const startTime = Date.now()

    // Fake progress ticker while API runs
    const ticker = setInterval(() => {
      const secs = Math.floor((Date.now() - startTime) / 1000)
      setElapsed(secs)
      // Soft-cap at 88% until we get the real response
      const pct = secs <= 25 ? (secs / 25) * 55
        : secs <= 60 ? 55 + ((secs - 25) / 35) * 33
        : Math.min(88, 88)
      setProgress(pct)
      const idx = MESSAGES.reduce((acc, m, i) => (secs >= m.at ? i : acc), 0)
      setMsgIndex(idx)
    }, 500)

    async function callApi() {
      try {
        const birthDate = formatBirthDate(store.birthDay, store.birthMonth, store.birthYear)
        const heightM = store.height
          ? (parseFloat(store.height) / 100).toFixed(2).replace('.', ',') + ' m'
          : ''
        const weightKg = store.weight ? store.weight + ' kg' : ''

        // Convert base64 data URL to Blob
        const dataUrl = store.photo!
        const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/)
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
        const base64Data = dataUrl.split(',')[1]
        const byteChars = atob(base64Data)
        const byteArr = new Uint8Array(byteChars.length)
        for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i)
        const blob = new Blob([byteArr], { type: mimeType })

        const fd = new FormData()
        fd.append('photo', blob, 'photo.jpg')
        fd.append('nome', store.name.toUpperCase())
        fd.append('data', birthDate)
        fd.append('altura', heightM)
        fd.append('peso', weightKg)
        fd.append('clube', store.club)
        fd.append('watermark', 'true')

        const res = await fetch('/api/gerar', { method: 'POST', body: fd })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Erro ao gerar figurinha' }))
          throw new Error(err.error || 'Erro ao gerar figurinha')
        }

        const imgBlob = await res.blob()
        const url = URL.createObjectURL(imgBlob)

        clearInterval(ticker)
        setProgress(100)

        store.setStickerUrl(url)

        setTimeout(() => router.push('/sua-figurinha'), 700)
      } catch (err) {
        clearInterval(ticker)
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      }
    }

    callApi()
    return () => clearInterval(ticker)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const displayPct = Math.round(progress)

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
          <button
            className="btn-primary"
            onClick={() => router.push('/criar')}
          >
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
      {/* Top accent */}
      <div
        className="w-full flex-shrink-0"
        style={{
          height: 4,
          background: 'linear-gradient(90deg, #009B3A, #FFD500, #009B3A)',
          backgroundSize: '200% 100%',
          animation: 'shimmerSlide 2s linear infinite',
        }}
      />

      <div className="flex-1 flex flex-col justify-between max-w-mobile w-full px-4 py-8" style={{ margin: '0 auto' }}>

        {/* Header */}
        <div className="text-center mb-6">
          <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 38, color: '#FFD500', letterSpacing: 2, lineHeight: 1 }}>
            GERANDO SUA FIGURINHA
          </div>
          <p style={{ fontFamily: 'var(--font-barlow)', fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginTop: 6 }}>
            Não saia dessa tela — pode levar até 2 minutos ⏱
          </p>
        </div>

        {/* Visual area */}
        <div
          className="rounded-3xl overflow-hidden flex flex-col items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            minHeight: 280,
            padding: '28px 20px',
          }}
        >
          <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 16, filter: 'drop-shadow(0 8px 24px rgba(255,213,0,0.25))', animation: 'starSpin 8s linear infinite' }}>
            ⚽
          </div>

          <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 64, color: '#FFD500', lineHeight: 1, letterSpacing: 2, filter: 'drop-shadow(0 4px 16px rgba(255,213,0,0.4))' }}>
            {displayPct}%
          </div>

          <div style={{ fontFamily: 'var(--font-barlow)', fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
            {elapsed}s decorridos
          </div>

          <div
            key={msgIndex}
            className="mt-6 text-center animate-fade-in"
            style={{ fontFamily: 'var(--font-barlow)', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.8)', minHeight: 22 }}
          >
            {MESSAGES[msgIndex].text}
          </div>

          <div className="flex gap-2 mt-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-full"
                style={{ width: 8, height: 8, background: '#FFD500', animation: `pulse 1.2s ease-in-out infinite ${i * 0.2}s`, opacity: 0.6 }}
              />
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="vsl-progress-track">
            <div className="vsl-progress-fill" style={{ width: `${displayPct}%`, transition: 'width 0.5s ease' }} />
          </div>
          <div className="flex items-center justify-between mt-2" style={{ fontFamily: 'var(--font-barlow)', fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>
            <span>{elapsed}s</span>
            <span>{displayPct}%</span>
          </div>
        </div>

        {/* FOMO Banner */}
        <div
          className="rounded-2xl text-center mt-5"
          style={{ background: 'linear-gradient(135deg, rgba(0,155,58,0.18), rgba(0,155,58,0.08))', border: '1.5px solid rgba(0,155,58,0.3)', padding: '14px 18px' }}
        >
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
