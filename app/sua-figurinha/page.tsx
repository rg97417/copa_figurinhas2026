'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useFigurinhaStore, formatBirthDate, getPlayerNumber } from '@/lib/store'
import { FigurinhaCard } from '@/components/FigurinhaCard'
import { Testimonials } from '@/components/Testimonials'

const CHECKOUT_URL = 'https://pay.onprofit.com.br/SEU-LINK-AQUI'

const TRUST_ITEMS = [
  { icon: '⚡', text: 'ACESSO LIBERADO NA HORA' },
  { icon: '📧', text: 'RECEBA POR E-MAIL' },
  { icon: '🖨️', text: 'ARQUIVO PARA IMPRESSÃO' },
  { icon: '🔒', text: 'PAGAMENTO 100% SEGURO' },
]

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 32 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: ['#FFD500', '#009B3A', '#0D1B4B', '#fff', '#FF6B35'][Math.floor(Math.random() * 5)],
      size: Math.random() * 10 + 6,
      delay: Math.random() * 1.2,
      duration: Math.random() * 1.5 + 1.5,
      rotation: Math.random() * 360,
    }))
  )

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: -20,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.id % 3 === 0 ? '50%' : 2,
            rotate: p.rotation,
          }}
          animate={{
            y: ['0vh', '115vh'],
            rotate: [p.rotation, p.rotation + 360 * (Math.random() > 0.5 ? 1 : -1)],
            opacity: [1, 1, 0],
          }}
          transition={{
            delay: p.delay,
            duration: p.duration,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  )
}

export default function SuaFigurinhaPage() {
  const router = useRouter()
  const store = useFigurinhaStore()
  const [showConfetti, setShowConfetti] = useState(false)
  const [gooollVisible, setGooollVisible] = useState(false)
  const [cardVisible, setCardVisible] = useState(false)

  const birthDate = formatBirthDate(store.birthDay, store.birthMonth, store.birthYear)
  const playerNumber = getPlayerNumber(store.name)

  useEffect(() => {
    // Redirect if no data
    if (!store.name) {
      router.replace('/')
      return
    }

    setShowConfetti(true)
    setTimeout(() => setGooollVisible(true), 200)
    setTimeout(() => setCardVisible(true), 700)
    setTimeout(() => setShowConfetti(false), 4000)
  }, [store.name, router])

  const handleShare = useCallback(async () => {
    const shareData = {
      title: 'Figurinha Copa 2026',
      text: `🏆 Olha a figurinha personalizada da Copa 2026 que eu criei! Cria a tua também — é incrível! ⚽`,
      url: typeof window !== 'undefined' ? window.location.origin : '',
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`)
        alert('Link copiado! Compartilhe com seus amigos 😊')
      }
    } catch {
      // user cancelled
    }
  }, [])

  const handleCheckout = useCallback(() => {
    window.location.href = CHECKOUT_URL
  }, [])

  if (!store.name) return null

  return (
    <main className="min-h-screen bg-hero bg-hero-mesh">
      {/* Confetti */}
      <AnimatePresence>{showConfetti && <Confetti />}</AnimatePresence>

      {/* Top accent bar */}
      <div
        className="w-full"
        style={{
          height: 5,
          background: 'linear-gradient(90deg, #009B3A 0%, #FFD500 50%, #009B3A 100%)',
        }}
      />

      <div className="max-w-mobile px-4 py-8" style={{ margin: '0 auto' }}>

        {/* ══════════════════ GOOOLL! ══════════════════ */}
        <AnimatePresence>
          {gooollVisible && (
            <motion.div
              className="text-center mb-2"
              initial={{ scale: 0.3, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            >
              <div
                className="goooll-text"
                style={{
                  fontFamily: 'var(--font-bebas)',
                  fontSize: 'clamp(72px, 22vw, 100px)',
                  lineHeight: 0.9,
                  letterSpacing: 3,
                }}
              >
                GOOOLL!
              </div>
              <div style={{ fontSize: 32, marginTop: 4 }}>🎉⚽🏆</div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {cardVisible && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* ── Subheadline ── */}
              <div className="text-center mb-6">
                <h2
                  style={{
                    fontFamily: 'var(--font-bebas)',
                    fontSize: 32,
                    color: '#0D1B4B',
                    letterSpacing: 1,
                    lineHeight: 1,
                  }}
                >
                  SUA FIGURINHA ESTÁ PRONTA!
                </h2>
                <p
                  style={{
                    fontFamily: 'var(--font-barlow)',
                    fontSize: 14,
                    color: 'rgba(13,27,75,0.6)',
                    fontWeight: 500,
                    marginTop: 5,
                    lineHeight: 1.5,
                  }}
                >
                  Receba o arquivo digital para impressão e participe do sorteio.{' '}
                  <strong>Leia o regulamento no seu e-mail.</strong>
                </p>
              </div>

              {/* ── Sticker preview with watermark ── */}
              <div className="flex justify-center mb-3">
                <div className="relative" style={{ filter: 'drop-shadow(0 24px 60px rgba(0,0,0,0.35))' }}>
                  <FigurinhaCard
                    name={store.name}
                    photo={store.photo}
                    birthDate={birthDate}
                    height={store.height ? (parseFloat(store.height) / 100).toFixed(2).replace('.', ',') : ''}
                    weight={store.weight}
                    club={store.club}
                    number={playerNumber}
                    showWatermark
                    size="lg"
                  />
                </div>
              </div>

              {/* Preview note */}
              <p
                className="text-center mb-6"
                style={{
                  fontFamily: 'var(--font-barlow)',
                  fontSize: 12,
                  color: 'rgba(13,27,75,0.4)',
                  fontWeight: 500,
                }}
              >
                🔒 A versão sem marca d'água é liberada após o pagamento
              </p>

              {/* ── PRICE ── */}
              <div className="card-glass p-5 mb-4 text-center">
                <div
                  style={{
                    fontFamily: 'var(--font-barlow)',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'rgba(13,27,75,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                    marginBottom: 4,
                  }}
                >
                  Arquivo Digital HD para impressão
                </div>

                {/* Strikethrough price */}
                <div
                  style={{
                    fontFamily: 'var(--font-barlow)',
                    fontSize: 16,
                    color: 'rgba(13,27,75,0.35)',
                    fontWeight: 600,
                    textDecoration: 'line-through',
                  }}
                >
                  De R$ 29,90
                </div>

                {/* Real price */}
                <div
                  className="price-text"
                  style={{
                    fontFamily: 'var(--font-bebas)',
                    fontSize: 72,
                    letterSpacing: 2,
                    lineHeight: 1,
                    marginBottom: 2,
                  }}
                >
                  R$ 12,90
                </div>

                <div
                  style={{
                    fontFamily: 'var(--font-barlow)',
                    fontSize: 12.5,
                    color: 'rgba(13,27,75,0.45)',
                    fontWeight: 600,
                    marginBottom: 16,
                  }}
                >
                  🏆 + Concorre a R$ 1.000 no dia 11/06/2026
                </div>

                {/* CTA */}
                <button
                  className="btn-verde"
                  onClick={handleCheckout}
                  style={{ fontSize: 19, letterSpacing: 0.8 }}
                >
                  <span>RECEBER MINHA FIGURINHA</span>
                  <span>⚽</span>
                </button>

                {/* Trust icons */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {TRUST_ITEMS.map(({ icon, text }) => (
                    <div
                      key={text}
                      className="flex items-center gap-2 rounded-xl"
                      style={{
                        background: 'rgba(0,155,58,0.07)',
                        border: '1px solid rgba(0,155,58,0.15)',
                        padding: '8px 10px',
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{icon}</span>
                      <span
                        style={{
                          fontFamily: 'var(--font-barlow)',
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: '#009B3A',
                          lineHeight: 1.3,
                        }}
                      >
                        {text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Share button ── */}
              <button
                onClick={handleShare}
                className="btn-secondary mb-6"
                style={{ borderColor: '#009B3A', color: '#009B3A' }}
              >
                📲 COMPARTILHAR COM AMIGOS
              </button>

              {/* ── FOMO Banner ── */}
              <div
                className="rounded-2xl text-center mb-8"
                style={{
                  background: 'linear-gradient(135deg, #0D1B4B, #1B2E5E)',
                  padding: '16px 20px',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-barlow)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.75)',
                    lineHeight: 1.5,
                    marginBottom: 6,
                  }}
                >
                  ⏰ Compre <strong style={{ color: '#FFD500' }}>ANTES</strong> do início da Copa e concorra a
                </p>
                <div
                  style={{
                    fontFamily: 'var(--font-bebas)',
                    fontSize: 44,
                    color: '#FFD500',
                    letterSpacing: 2,
                    lineHeight: 1,
                    filter: 'drop-shadow(0 2px 12px rgba(255,213,0,0.4))',
                  }}
                >
                  R$ 1.000
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-barlow)',
                    fontSize: 12.5,
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: 4,
                    fontWeight: 500,
                  }}
                >
                  Sorteio em 11/06/2026 — Início dos jogos
                </p>
              </div>

              {/* ── Testimonials ── */}
              <div className="mb-8">
                <h3
                  className="text-center mb-4"
                  style={{
                    fontFamily: 'var(--font-bebas)',
                    fontSize: 30,
                    color: '#0D1B4B',
                    letterSpacing: 1,
                  }}
                >
                  DEPOIMENTO DE CLIENTES:
                </h3>
                <Testimonials />
              </div>

              {/* ── Second CTA ── */}
              <button
                className="btn-verde mb-4"
                onClick={handleCheckout}
                style={{ fontSize: 19 }}
              >
                QUERO MINHA FIGURINHA — R$ 12,90 ⚽
              </button>

              <p
                className="text-center"
                style={{
                  fontFamily: 'var(--font-barlow)',
                  fontSize: 12,
                  color: 'rgba(13,27,75,0.4)',
                  fontWeight: 500,
                }}
              >
                🔒 Checkout seguro · Acesso liberado na hora · Garantia de satisfação
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer
        style={{
          background: '#0D1B4B',
          padding: '20px 16px',
          textAlign: 'center',
          marginTop: 16,
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-barlow)',
            fontSize: 11.5,
            color: 'rgba(255,255,255,0.3)',
            lineHeight: 1.6,
          }}
        >
          © 2026 Figurinha Copa 2026 · Produto digital para impressão · Todos os direitos reservados<br />
          Ao comprar você concorda com os termos do sorteio disponíveis no e-mail de confirmação.
        </p>
      </footer>
    </main>
  )
}
