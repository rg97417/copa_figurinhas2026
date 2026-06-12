'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Testimonials } from '@/components/Testimonials'
import stickerSrc from '@/public/assets/sample_figurinha_web.png'

/* Figurinha real gerada — mostra o modelo/produto como preview */
function StickerImg({ size, fluid = false }: { size?: number; fluid?: boolean }) {
  const radius = size ? Math.round(size * 0.054) : 10
  const shadow = '0 16px 48px rgba(0,0,0,0.42), 0 3px 12px rgba(0,0,0,0.22)'

  if (fluid) {
    return (
      <Image
        src={stickerSrc}
        alt="Figurinha Copa 2026"
        draggable={false}
        placeholder="blur"
        sizes="(max-width: 480px) 33vw, 200px"
        style={{ width: '100%', height: 'auto', borderRadius: radius, boxShadow: shadow, display: 'block' }}
      />
    )
  }

  return (
    <Image
      src={stickerSrc}
      alt="Figurinha Copa 2026"
      draggable={false}
      placeholder="blur"
      width={size}
      height={Math.round((size ?? 208) * (1067 / 800))}
      style={{ borderRadius: radius, boxShadow: shadow, display: 'block' }}
    />
  )
}

const HOW_IT_WORKS = [
  { icon: '📸', title: 'Envie a foto', desc: 'Escolha uma foto do rosto do seu craque — de frente, bem iluminada.' },
  { icon: '✏️', title: 'Preencha os dados', desc: 'Nome, clube, peso, altura e data de nascimento para a ficha técnica.' },
  { icon: '⚡', title: 'Figurinha gerada!', desc: 'Em segundos sua figurinha fica pronta, no estilo oficial Panini Copa.' },
  { icon: '💾', title: 'Receba o arquivo', desc: 'Arquivo digital em alta resolução, pronto pra imprimir e colecionar.' },
]

function AnimatedCounter({ target, duration = 1800 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const started = useRef(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const start = Date.now()
          const tick = () => {
            const elapsed = Date.now() - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * target))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  return (
    <span ref={ref}>
      {count.toLocaleString('pt-BR')}
    </span>
  )
}

export default function LandingPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-hero bg-hero-mesh">

      {/* ══════════════════════════════ HERO ══════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Decorative balls */}
        <div
          className="pointer-events-none absolute"
          style={{
            top: -40, right: -40, width: 180, height: 180, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }}
        />
        <div
          className="pointer-events-none absolute"
          style={{
            bottom: 80, left: -60, width: 240, height: 240, borderRadius: '50%',
            background: 'rgba(0,0,0,0.04)',
          }}
        />

        <div className="max-w-mobile px-4 pt-10 pb-6 text-center">
          {/* ── Social proof badge ── */}
          <div className="inline-flex items-center gap-2 badge-proof mb-5 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <span className="animate-star-spin" style={{ fontSize: 14 }}>⭐</span>
            <span
              style={{
                fontFamily: 'var(--font-barlow)',
                fontWeight: 700,
                fontSize: 13.5,
                color: '#0D1B4B',
              }}
            >
              +<AnimatedCounter target={25847} /> figurinhas já criadas
            </span>
          </div>

          {/* ── Main headline ── */}
          <h1
            className="animate-fade-in-up"
            style={{
              fontFamily: 'var(--font-bebas)',
              fontSize: 'clamp(48px, 14vw, 72px)',
              lineHeight: 0.95,
              color: '#0D1B4B',
              letterSpacing: 1,
              animationDelay: '80ms',
            }}
          >
            TRANSFORME SEU FILHO EM UM{' '}
            <span style={{ color: '#009B3A' }}>CRAQUE DA COPA 2026</span>
          </h1>

          {/* ── Subtitle ── */}
          <p
            className="animate-fade-in-up mt-4"
            style={{
              fontFamily: 'var(--font-barlow)',
              fontSize: 16,
              fontWeight: 500,
              color: 'rgba(13,27,75,0.75)',
              lineHeight: 1.55,
              maxWidth: 340,
              margin: '16px auto 0',
              animationDelay: '160ms',
            }}
          >
            Crie uma figurinha personalizada no estilo Panini oficial com a foto, nome e ficha técnica do seu pequeno campeão.
          </p>

          {/* ── Sticker card stack — figurinhas reais ── */}
          <div
            className="animate-fade-in-up my-8"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
              gap: 0,
              height: 280,
              overflow: 'visible',
              animationDelay: '240ms',
              position: 'relative',
            }}
          >
            {/* Left card */}
            <div
              className="animate-float-b"
              style={{
                transform: 'rotate(-8deg) scale(0.82) translateX(20px)',
                transformOrigin: 'center bottom',
                zIndex: 1,
                filter: 'brightness(0.82)',
                flexShrink: 0,
              }}
            >
              <StickerImg size={208} />
            </div>

            {/* Center card */}
            <div
              className="animate-float"
              style={{
                transform: 'scale(1.06)',
                transformOrigin: 'center bottom',
                zIndex: 10,
                flexShrink: 0,
              }}
            >
              <StickerImg size={208} />
            </div>

            {/* Right card */}
            <div
              className="animate-float-c"
              style={{
                transform: 'rotate(8deg) scale(0.82) translateX(-20px)',
                transformOrigin: 'center bottom',
                zIndex: 1,
                filter: 'brightness(0.82)',
                flexShrink: 0,
              }}
            >
              <StickerImg size={208} />
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="animate-fade-in-up" style={{ animationDelay: '320ms' }}>
            <button
              className="btn-primary"
              onClick={() => router.push('/criar')}
              style={{ fontSize: 20, letterSpacing: 1.2 }}
            >
              <span>CRIAR MINHA FIGURINHA</span>
              <span>⚽</span>
            </button>
            <p
              style={{
                fontSize: 12.5,
                color: 'rgba(13,27,75,0.55)',
                fontWeight: 600,
                marginTop: 10,
                fontFamily: 'var(--font-barlow)',
              }}
            >
              ⏱ Leva menos de 2 minutos • Sem cadastro
            </p>
          </div>

          {/* ── Trust bar ── */}
          <div
            className="flex items-center justify-center flex-wrap gap-4 mt-6 animate-fade-in-up"
            style={{ animationDelay: '400ms' }}
          >
            {['✅ Arquivo digital', '📲 Acesso na hora', '🔒 Pagamento seguro'].map((item) => (
              <span key={item} className="trust-item">{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════ HOW IT WORKS ══════════════════════════ */}
      <section className="bg-dark-section py-12">
        <div className="max-w-mobile px-4">
          <h2
            className="text-center mb-8"
            style={{
              fontFamily: 'var(--font-bebas)',
              fontSize: 42,
              color: '#FFD500',
              letterSpacing: 1,
            }}
          >
            COMO FUNCIONA?
          </h2>

          <div className="flex flex-col gap-4">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-4 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '16px 18px',
                }}
              >
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded-2xl"
                  style={{
                    width: 52,
                    height: 52,
                    background: 'linear-gradient(135deg, #FFD500, #E6A000)',
                    fontSize: 24,
                  }}
                >
                  {step.icon}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-bebas)',
                      fontSize: 22,
                      color: '#FFD500',
                      letterSpacing: 0.5,
                      lineHeight: 1.1,
                    }}
                  >
                    {`${i + 1}. ${step.title}`}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-barlow)',
                      fontSize: 14,
                      color: 'rgba(255,255,255,0.65)',
                      lineHeight: 1.5,
                      marginTop: 3,
                    }}
                  >
                    {step.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════ GALLERY ══════════════════════════ */}
      <section className="py-12" style={{ background: 'linear-gradient(160deg, #FFD500 0%, #FFB800 100%)' }}>
        <div className="max-w-mobile px-4">
          <h2
            className="text-center mb-2"
            style={{
              fontFamily: 'var(--font-bebas)',
              fontSize: 38,
              color: '#0D1B4B',
              letterSpacing: 1,
            }}
          >
            FIGURINHAS JÁ CRIADAS
          </h2>
          <p
            className="text-center mb-8"
            style={{
              fontFamily: 'var(--font-barlow)',
              fontSize: 14.5,
              color: 'rgba(13,27,75,0.7)',
              fontWeight: 600,
            }}
          >
            Veja o que outros pais estão fazendo!
          </p>

          {/* Grid de figurinhas reais */}
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}
          >
            {[0,1,2,3,4,5].map((i) => (
              <div
                key={i}
                style={{
                  transform: i % 2 === 0 ? 'rotate(-2deg)' : 'rotate(2deg)',
                }}
              >
                <StickerImg size={undefined} fluid />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════ TESTIMONIALS ══════════════════════════ */}
      <section className="bg-dark-section py-12">
        <div className="max-w-mobile px-4">
          <h2
            className="text-center mb-2"
            style={{
              fontFamily: 'var(--font-bebas)',
              fontSize: 38,
              color: '#FFD500',
              letterSpacing: 1,
            }}
          >
            O QUE AS FAMÍLIAS DIZEM
          </h2>
          <p
            className="text-center mb-6"
            style={{
              fontFamily: 'var(--font-barlow)',
              fontSize: 14,
              color: 'rgba(255,255,255,0.55)',
              fontWeight: 500,
            }}
          >
            Mensagens reais de pais e mães apaixonados
          </p>
          <Testimonials />
        </div>
      </section>

      {/* ══════════════════════════ BOTTOM CTA ══════════════════════════ */}
      <section className="py-12 bg-hero" style={{ textAlign: 'center' }}>
        <div className="max-w-mobile px-4">
          <div
            className="text-center mb-3"
            style={{
              fontFamily: 'var(--font-bebas)',
              fontSize: 18,
              color: 'rgba(13,27,75,0.6)',
              letterSpacing: 2,
            }}
          >
            ⚽ COPA DO MUNDO 2026 ⚽
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-bebas)',
              fontSize: 44,
              lineHeight: 1,
              color: '#0D1B4B',
              marginBottom: 12,
            }}
          >
            SEU FILHO MERECE<br />
            <span style={{ color: '#009B3A' }}>SER UM CRAQUE</span>
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-barlow)',
              fontSize: 15,
              color: 'rgba(13,27,75,0.7)',
              fontWeight: 600,
              marginBottom: 28,
              lineHeight: 1.5,
            }}
          >
            Crie a figurinha personalizada agora e concorra a{' '}
            <strong style={{ color: '#009B3A' }}>R$ 1.000</strong> no dia 11/06!
          </p>
          <button className="btn-primary" onClick={() => router.push('/criar')} style={{ fontSize: 20 }}>
            INICIAR AGORA — É SÓ R$ 12,90 ⚽
          </button>
          <div className="flex items-center justify-center flex-wrap gap-4 mt-5">
            {['✅ Arquivo digital', '📲 Acesso imediato', '🏆 Estilo Panini oficial'].map((item) => (
              <span key={item} className="trust-item">{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: '#0D1B4B',
          padding: '20px 16px',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-barlow)',
            fontSize: 12,
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          © 2026 Figurinha Copa 2026 · Produto digital para impressão · Todos os direitos reservados
        </p>
      </footer>
    </main>
  )
}
