'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useFigurinhaStore, formatBirthDate, getPlayerNumber } from '@/lib/store'
import { FigurinhaCard } from '@/components/FigurinhaCard'
import { Testimonials } from '@/components/Testimonials'
import { readUTM, appendUTMToUrl } from '@/lib/utm'
import { pixelEvent } from '@/lib/pixel'

const CHECKOUT_BASE = 'https://pay.kiwify.com.br/yRmTtd1'

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

function ConfirmNovaModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', maxWidth: 320, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔄</div>
        <p style={{ fontFamily: 'var(--font-bebas)', fontSize: 22, color: '#0D1B4B', letterSpacing: 1, marginBottom: 8 }}>GERAR NOVA FIGURINHA?</p>
        <p style={{ fontFamily: 'var(--font-barlow)', fontSize: 13, color: 'rgba(13,27,75,0.6)', lineHeight: 1.5, marginBottom: 20 }}>
          A prévia atual será substituída. Se ainda não comprou, pode perder o acesso a essa figurinha.
        </p>
        <button onClick={onConfirm} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: '#009B3A', color: '#fff', fontFamily: 'var(--font-barlow)', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}>
          Sim, gerar nova
        </button>
        <button onClick={onCancel} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid rgba(13,27,75,0.15)', background: 'transparent', color: 'rgba(13,27,75,0.5)', fontFamily: 'var(--font-barlow)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

export default function SuaFigurinhaPage() {
  const router = useRouter()
  const store = useFigurinhaStore()
  const [showConfetti, setShowConfetti] = useState(false)
  const [gooollVisible, setGooollVisible] = useState(false)
  const [cardVisible, setCardVisible] = useState(false)
  const [showNovaModal, setShowNovaModal] = useState(false)

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

    // Pixel: usuário chegou à página da figurinha = ViewContent
    pixelEvent('ViewContent', { content_name: 'Figurinha Copa 2026', value: 19.90, currency: 'BRL' })
  }, [store.name, router])

  const SHARE_LINK = 'https://www.convocakids.com/?utm_source=whatsapp&utm_medium=referral&utm_campaign=indicacao'
  const [copied, setCopied] = useState(false)

  const handleWhatsApp = useCallback(() => {
    const msg = `⚽🏆 Criei minha figurinha personalizada da Copa do Mundo 2026! Olha só como ficou incrível!\n\nCria a tua também — é rapidinho:\n${SHARE_LINK}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }, [])

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(SHARE_LINK)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback
    }
  }, [])

  const handleCheckout = useCallback(() => {
    pixelEvent('InitiateCheckout', { value: 19.90, currency: 'BRL', num_items: 1 })
    let url = appendUTMToUrl(CHECKOUT_BASE, readUTM())
    // job_id garante que o webhook vincule EXATAMENTE este pedido ao pagamento
    if (store.jobId) {
      const u = new URL(url)
      u.searchParams.set('job_id', store.jobId)
      url = u.toString()
    }
    window.location.href = url
  }, [store.jobId])

  const handleNovaFigurinha = useCallback(() => {
    store.reset()
    router.push('/criar')
  }, [store, router])

  if (!store.name) return null

  return (
    <main className="min-h-screen bg-hero bg-hero-mesh">
      {showNovaModal && (
        <ConfirmNovaModal
          onConfirm={handleNovaFigurinha}
          onCancel={() => setShowNovaModal(false)}
        />
      )}
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
                  Receba o arquivo digital em alta resolução, pronto para imprimir e colecionar.
                </p>
              </div>

              {/* ── Sticker preview with watermark ── */}
              <div className="flex justify-center mb-3">
                <div className="relative" style={{ filter: 'drop-shadow(0 24px 60px rgba(0,0,0,0.35))' }}>
                  {store.stickerUrl ? (
                    <img
                      src={store.stickerUrl}
                      alt="Sua figurinha"
                      style={{ width: '100%', maxWidth: 320, borderRadius: 16, display: 'block' }}
                    />
                  ) : (
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
                  )}
                </div>
              </div>

              {/* Bloco de instrução pós-preview */}
              <div
                className="rounded-2xl mb-5"
                style={{
                  background: 'rgba(13,27,75,0.06)',
                  border: '1.5px solid rgba(13,27,75,0.12)',
                  padding: '16px 18px',
                }}
              >
                <p style={{ fontFamily: 'var(--font-bebas)', fontSize: 16, color: '#009B3A', letterSpacing: 1, marginBottom: 10, textAlign: 'center' }}>
                  ✅ COMO RECEBER SEM MARCA D'ÁGUA:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    ['1.', 'Clique no botão abaixo e finalize o pagamento'],
                    ['2.', 'Receba o link de download no seu e-mail na hora'],
                    ['3.', 'Baixe em 4K sem marca d\'água — pronta para imprimir e colar'],
                  ].map(([num, txt]) => (
                    <div key={num} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontFamily: 'var(--font-bebas)', fontSize: 15, color: '#009B3A', minWidth: 18 }}>{num}</span>
                      <span style={{ fontFamily: 'var(--font-barlow)', fontSize: 13, fontWeight: 600, color: 'rgba(13,27,75,0.7)', lineHeight: 1.4 }}>{txt}</span>
                    </div>
                  ))}
                </div>
              </div>

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
                  De R$ 39,90
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
                  R$ 19,90
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
                  🏆 Edição especial Copa do Mundo 2026
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

              {/* ── Share buttons ── */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                <button
                  onClick={handleWhatsApp}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: '#25D366', color: '#fff', border: 'none', borderRadius: 14,
                    padding: '14px 10px', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                    fontFamily: 'var(--font-barlow)', letterSpacing: 0.5,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  COMPARTILHAR NO WHATSAPP
                </button>
                <button
                  onClick={handleCopyLink}
                  style={{
                    flexShrink: 0, padding: '14px 16px', borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)',
                    color: copied ? '#4ade80' : 'rgba(255,255,255,0.6)',
                    border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.12)'}`,
                    fontFamily: 'var(--font-barlow)',
                  }}
                >
                  {copied ? '✓ Copiado' : '🔗 Link'}
                </button>
              </div>

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
                  ⚽ Deixe seu filho na história da Copa do Mundo 2026
                </p>
                <div
                  style={{
                    fontFamily: 'var(--font-bebas)',
                    fontSize: 36,
                    color: '#FFD500',
                    letterSpacing: 2,
                    lineHeight: 1.1,
                  }}
                >
                  FIGURINHA OFICIAL PERSONALIZADA
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
                  Arquivo digital em alta resolução · Pronto para imprimir
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
                QUERO MINHA FIGURINHA — R$ 19,90 ⚽
              </button>

              <p
                className="text-center mb-6"
                style={{
                  fontFamily: 'var(--font-barlow)',
                  fontSize: 12,
                  color: 'rgba(13,27,75,0.4)',
                  fontWeight: 500,
                }}
              >
                🔒 Checkout seguro · Acesso liberado na hora · Garantia de satisfação
              </p>

              {/* Gerar nova figurinha */}
              <div className="text-center mb-4">
                <button
                  onClick={() => setShowNovaModal(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontFamily: 'var(--font-barlow)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'rgba(13,27,75,0.35)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '8px 16px',
                  }}
                >
                  🔄 Gerar figurinha diferente
                </button>
              </div>
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
          © 2026 Figurinha Copa 2026 · Produto digital para impressão · Todos os direitos reservados
        </p>
      </footer>
    </main>
  )
}
