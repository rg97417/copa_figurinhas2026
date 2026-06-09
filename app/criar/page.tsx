'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useFigurinhaStore, formatBirthDate } from '@/lib/store'

const CLUBES = [
  'Flamengo','Palmeiras','Corinthians','São Paulo',
  'Grêmio','Fluminense','Internacional','Santos',
]

/* ─── Dropdown de clube customizado ─── */
function ClubSelect({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? CLUBES.filter((c) => c.toLowerCase().includes(query.toLowerCase()))
    : CLUBES.slice(0, 3)

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  const select = (club: string) => {
    setQuery(club)
    onChange(club)
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        className={`copa-input ${error ? 'error' : ''}`}
        type="text"
        placeholder="Digite o nome do clube..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); if (!open) setOpen(true) }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        autoCorrect="off"
      />
      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
              background: '#fff', borderRadius: 16,
              border: '2px solid rgba(13,27,75,0.13)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.13)',
              zIndex: 200, overflow: 'hidden',
            }}
          >
            {filtered.map((club, i) => (
              <button
                key={club}
                onMouseDown={(e) => { e.preventDefault(); select(club) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '13px 18px',
                  background: club === value ? 'rgba(13,27,75,0.06)' : 'transparent',
                  border: 'none',
                  borderBottom: i < filtered.length - 1 ? '1px solid rgba(13,27,75,0.07)' : 'none',
                  fontFamily: 'var(--font-barlow)', fontSize: 15, fontWeight: 600,
                  color: '#0D1B4B', cursor: 'pointer',
                }}
              >
                {club}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Step transitions ─── */
const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? '30%' : '-30%', opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
  exit: (dir: number) => ({ x: dir > 0 ? '-30%' : '30%', opacity: 0, transition: { duration: 0.2 } }),
}

/* ─── Progress bar ─── */
function StepProgress({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="px-4 pt-5 pb-2 max-w-mobile" style={{ margin: '0 auto' }}>
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontFamily: 'var(--font-barlow)', fontSize: 13, fontWeight: 700, color: 'rgba(13,27,75,0.55)' }}>
          Passo {current} de {total}
        </span>
        <span style={{ fontFamily: 'var(--font-bebas)', fontSize: 20, color: '#0D1B4B', letterSpacing: 1 }}>
          {pct}%
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-2.5">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`step-dot ${i + 1 < current ? 'done' : i + 1 === current ? 'active' : ''}`} />
        ))}
      </div>
    </div>
  )
}

/* ─── Modal de aviso ANTES do upload ─── */
function AvisoModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="card-glass max-w-mobile w-full p-6"
        initial={{ scale: 0.82, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 260 } }}
        exit={{ scale: 0.88, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Exemplo visual */}
        <div className="flex justify-center mb-4">
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '4px solid #E8EAF0',
              background: 'linear-gradient(135deg,#5CB8E8,#3A8EC0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 64,
            }}
          >
            😊
          </div>
        </div>

        <div
          className="text-center mb-2"
          style={{ fontFamily: 'var(--font-bebas)', fontSize: 26, color: '#0D1B4B', letterSpacing: 1 }}
        >
          ⚠️ AVISO IMPORTANTE
        </div>

        <p className="text-center mb-5" style={{ fontFamily: 'var(--font-barlow)', fontSize: 15, color: '#0D1B4B', lineHeight: 1.6 }}>
          A foto precisa ser <strong>somente do rosto da pessoa</strong>, sem outras pessoas no enquadramento.
          <br />
          <span style={{ color: 'rgba(13,27,75,0.6)', fontSize: 13, fontWeight: 500 }}>
            Certifique-se que o rosto está bem visível e bem iluminado para melhor resultado.
          </span>
        </p>

        <div className="flex flex-col gap-3">
          <button className="btn-primary" onClick={onConfirm}>
            ✅ ENTENDI — ESCOLHER FOTO
          </button>
          <button
            onClick={onClose}
            style={{
              fontFamily: 'var(--font-barlow)', fontSize: 13, fontWeight: 600,
              color: 'rgba(13,27,75,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 8,
            }}
          >
            cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Loading photo (com preview URL correto) ─── */
const LOADING_MSGS = [
  'Esse tem cara de jogador caro hein... 🤑',
  'Hmm, essa foto tem energia de artilheiro! ⚽',
  'Processando o craque — pode ser titular! 🏆',
  'Analisando o talento... nota 10 garantida! ⭐',
  'Que figurinha vai ficar incrível essa! 🔥',
]

function PhotoLoading({ previewUrl }: { previewUrl: string }) {
  const [progress, setProgress] = useState(0)
  const [msgIdx] = useState(() => Math.floor(Math.random() * LOADING_MSGS.length))

  React.useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(timer); return 100 }
        return Math.min(p + Math.random() * 14 + 5, 100)
      })
    }, 110)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="card-glass p-5 text-center">
      <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 26, color: '#0D1B4B', letterSpacing: 1, marginBottom: 14 }}>
        CARREGANDO FOTO...
      </div>
      <div
        className="mx-auto mb-4 overflow-hidden rounded-2xl"
        style={{ width: 120, height: 120, border: '3px solid #E8EAF0' }}
      >
        {/* previewUrl is always a valid object URL here */}
        <img src={previewUrl} alt="Carregando" className="w-full h-full" style={{ objectFit: 'cover', objectPosition: 'top center' }} />
      </div>
      <p style={{ fontFamily: 'var(--font-barlow)', fontSize: 14, fontWeight: 600, color: '#0D1B4B', marginBottom: 14, fontStyle: 'italic' }}>
        {LOADING_MSGS[msgIdx]}
      </p>
      <div className="progress-track" style={{ height: 8, borderRadius: 99 }}>
        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%`, borderRadius: 99 }} />
      </div>
      <div style={{ fontFamily: 'var(--font-barlow)', fontSize: 11.5, color: 'rgba(13,27,75,0.45)', marginTop: 5, fontWeight: 600 }}>
        Carregando... {Math.min(Math.round(progress), 100)}%
      </div>
    </div>
  )
}

/* ════════════════════════════════════════ MAIN ════════════════════════════════════════ */
export default function CriarPage() {
  const router = useRouter()
  const store = useFigurinhaStore()

  const [step, setStep] = useState(1)
  const [dir, setDir] = useState(1)

  const [name, setName] = useState(store.name)
  const [photo, setPhoto] = useState<string | null>(store.photo)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)  // object URL for loading screen

  /* ── Modal state ── */
  const [showAviso, setShowAviso] = useState(false)
  const [pendingUpload, setPendingUpload] = useState<'gallery' | 'camera' | null>(null)
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false)

  const [birthDay, setBirthDay] = useState(store.birthDay)
  const [birthMonth, setBirthMonth] = useState(store.birthMonth)
  const [birthYear, setBirthYear] = useState(store.birthYear)
  const [email, setEmail] = useState(store.email)

  const [club, setClub] = useState(store.club)
  const [weight, setWeight] = useState(store.weight)
  const [height, setHeight] = useState(store.height)

  const [errors, setErrors] = useState<Record<string, string>>({})

  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  /* ── User clicks upload button → show aviso first ── */
  const handleUploadClick = (type: 'gallery' | 'camera') => {
    setPendingUpload(type)
    setShowAviso(true)
  }

  /* ── After aviso "Entendi" → open file picker ── */
  const handleAvisoConfirm = () => {
    setShowAviso(false)
    if (pendingUpload === 'gallery') galleryRef.current?.click()
    else if (pendingUpload === 'camera') cameraRef.current?.click()
    setPendingUpload(null)
  }

  /* ── File selected → loading with valid object URL ── */
  const handleFile = useCallback((file: File) => {
    const objectUrl = URL.createObjectURL(file)
    setPhotoPreview(objectUrl)   // valid URL, safe for <img src>
    setIsLoadingPhoto(true)
    setErrors((p) => ({ ...p, photo: '' }))

    const reader = new FileReader()
    reader.onload = (e) => {
      const b64 = e.target?.result as string
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
        setPhoto(b64)
        setPhotoPreview(null)
        setIsLoadingPhoto(false)
      }, 1900)
    }
    reader.readAsDataURL(file)
  }, [])

  /* ── Navigation ── */
  const goTo = (next: number) => {
    setDir(next > step ? 1 : -1)
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const validate1 = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Digite o nome do craque'
    if (!photo) e.photo = 'Envie a foto do craque'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validate2 = () => {
    const e: Record<string, string> = {}
    if (!birthDay) e.birthDay = 'x'
    if (!birthMonth) e.birthMonth = 'x'
    if (!birthYear) e.birthYear = 'x'
    if (!email.trim()) e.email = 'Digite seu e-mail'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'E-mail inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validate3 = () => {
    const e: Record<string, string> = {}
    if (!club.trim()) e.club = 'Digite o clube'
    if (!weight.trim()) e.weight = 'Digite o peso'
    if (!height.trim()) e.height = 'Digite a altura'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    if (step === 1 && !validate1()) return
    if (step === 2 && !validate2()) return
    if (step === 3 && !validate3()) return
    if (step < 4) goTo(step + 1)
  }

  const handleConfirm = () => {
    store.setAll({ name: name.trim(), photo, birthDay, birthMonth, birthYear, email: email.trim(), club: club.trim(), weight, height, stickerUrl: null })
    router.push('/gerando')
  }

  const birthDate = formatBirthDate(birthDay, birthMonth, birthYear)

  const MONTHS = [
    ['01','Janeiro'],['02','Fevereiro'],['03','Março'],['04','Abril'],
    ['05','Maio'],['06','Junho'],['07','Julho'],['08','Agosto'],
    ['09','Setembro'],['10','Outubro'],['11','Novembro'],['12','Dezembro'],
  ]

  const hasDateError = errors.birthDay || errors.birthMonth || errors.birthYear

  return (
    <main className="min-h-screen bg-hero bg-hero-mesh flex flex-col">
      <StepProgress current={step} total={4} />

      <div
        className="flex-1 flex flex-col justify-center px-4 pb-8 max-w-mobile w-full"
        style={{ margin: '0 auto' }}
      >
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit">

            {/* ═══════════════════ STEP 1 ═══════════════════ */}
            {step === 1 && (
              <div className="card-glass p-6">
                <div className="text-center mb-5">
                  <div style={{ fontSize: 38, marginBottom: 6 }}>✏️</div>
                  <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: 30, color: '#0D1B4B', letterSpacing: 1, lineHeight: 1 }}>
                    QUAL O NOME DO CRAQUE?
                  </h2>
                  <p style={{ fontFamily: 'var(--font-barlow)', fontSize: 13.5, color: 'rgba(13,27,75,0.55)', marginTop: 4 }}>
                    O nome que vai aparecer na figurinha
                  </p>
                </div>

                {/* Name */}
                <div className="mb-5">
                  <input
                    className={`copa-input ${errors.name ? 'error' : ''}`}
                    type="text"
                    placeholder="Nome e sobrenome"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })) }}
                    maxLength={28}
                    autoComplete="off"
                    autoCorrect="off"
                  />
                  {errors.name && (
                    <p style={{ color: '#E53E3E', fontSize: 12.5, marginTop: 5, fontWeight: 600 }}>⚠ {errors.name}</p>
                  )}
                </div>

                {/* Photo upload */}
                <div className="mb-1">
                  <label style={{ fontFamily: 'var(--font-bebas)', fontSize: 15, letterSpacing: 1, color: '#0D1B4B', display: 'block', marginBottom: 8 }}>
                    FOTO DO CRAQUE
                  </label>

                  {/* Loading state — uses photoPreview (valid object URL) */}
                  {isLoadingPhoto && photoPreview && (
                    <PhotoLoading previewUrl={photoPreview} />
                  )}

                  {/* Photo loaded */}
                  {photo && !isLoadingPhoto && (
                    <div
                      className="flex items-center gap-3 rounded-2xl"
                      style={{ background: 'rgba(0,155,58,0.07)', border: '2px solid rgba(0,155,58,0.25)', padding: '12px 14px' }}
                    >
                      <div className="overflow-hidden rounded-xl flex-shrink-0" style={{ width: 68, height: 68 }}>
                        <img src={photo} alt="Foto" className="w-full h-full" style={{ objectFit: 'cover', objectPosition: 'top center' }} />
                      </div>
                      <div className="flex-1">
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#009B3A' }}>✅ Foto carregada!</div>
                        <div style={{ fontSize: 12, color: 'rgba(13,27,75,0.5)', fontWeight: 500, marginTop: 2 }}>
                          Toque para trocar
                        </div>
                      </div>
                      <button
                        onClick={() => handleUploadClick('gallery')}
                        style={{ background: 'transparent', border: '2px solid rgba(13,27,75,0.18)', borderRadius: 10, padding: '7px 11px', fontSize: 12, fontWeight: 700, color: '#0D1B4B', cursor: 'pointer', fontFamily: 'var(--font-barlow)' }}
                      >
                        TROCAR
                      </button>
                    </div>
                  )}

                  {/* No photo yet */}
                  {!photo && !isLoadingPhoto && (
                    <div className="grid grid-cols-2 gap-3">
                      <button className="upload-zone" onClick={() => handleUploadClick('gallery')}>
                        <span style={{ fontSize: 34 }}>🖼️</span>
                        <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 700, fontSize: 13, color: '#0D1B4B', textAlign: 'center', lineHeight: 1.35 }}>
                          Galeria<br />
                          <span style={{ fontWeight: 500, fontSize: 11, color: 'rgba(13,27,75,0.45)' }}>
                            só do rosto
                          </span>
                        </span>
                      </button>
                      <button className="upload-zone" onClick={() => handleUploadClick('camera')}>
                        <span style={{ fontSize: 34 }}>📷</span>
                        <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 700, fontSize: 13, color: '#0D1B4B' }}>
                          Câmera
                        </span>
                      </button>
                    </div>
                  )}

                  {errors.photo && (
                    <p style={{ color: '#E53E3E', fontSize: 12.5, marginTop: 6, fontWeight: 600 }}>⚠ {errors.photo}</p>
                  )}
                </div>

                {/* Hidden file inputs */}
                <input ref={galleryRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
                <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />

                <div className="mt-6">
                  <button className="btn-primary" onClick={handleNext}>PRÓXIMO →</button>
                </div>
              </div>
            )}

            {/* ═══════════════════ STEP 2 ═══════════════════ */}
            {step === 2 && (
              <div className="card-glass p-6">
                <div className="text-center mb-5">
                  <div style={{ fontSize: 38, marginBottom: 6 }}>🎂</div>
                  <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: 30, color: '#0D1B4B', letterSpacing: 1, lineHeight: 1 }}>
                    DATA DE NASCIMENTO
                  </h2>
                  <p style={{ fontFamily: 'var(--font-barlow)', fontSize: 13.5, color: 'rgba(13,27,75,0.55)', marginTop: 4 }}>
                    Pra calcular a idade na figurinha
                  </p>
                </div>

                <div className="mb-4">
                  <div className="grid grid-cols-3 gap-3">
                    {/* Day */}
                    <div>
                      <label style={{ fontFamily: 'var(--font-bebas)', fontSize: 13, letterSpacing: 1, color: '#0D1B4B', display: 'block', marginBottom: 5 }}>DIA</label>
                      <select className={`copa-select ${errors.birthDay ? 'error' : ''}`} value={birthDay}
                        onChange={(e) => { setBirthDay(e.target.value); setErrors((p) => ({ ...p, birthDay: '' })) }}>
                        <option value="">--</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
                        ))}
                      </select>
                    </div>
                    {/* Month */}
                    <div>
                      <label style={{ fontFamily: 'var(--font-bebas)', fontSize: 13, letterSpacing: 1, color: '#0D1B4B', display: 'block', marginBottom: 5 }}>MÊS</label>
                      <select className={`copa-select ${errors.birthMonth ? 'error' : ''}`} value={birthMonth}
                        onChange={(e) => { setBirthMonth(e.target.value); setErrors((p) => ({ ...p, birthMonth: '' })) }}>
                        <option value="">--</option>
                        {MONTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    {/* Year */}
                    <div>
                      <label style={{ fontFamily: 'var(--font-bebas)', fontSize: 13, letterSpacing: 1, color: '#0D1B4B', display: 'block', marginBottom: 5 }}>ANO</label>
                      <select className={`copa-select ${errors.birthYear ? 'error' : ''}`} value={birthYear}
                        onChange={(e) => { setBirthYear(e.target.value); setErrors((p) => ({ ...p, birthYear: '' })) }}>
                        <option value="">----</option>
                        {Array.from({ length: 107 }, (_, i) => 2026 - i).map((y) => (
                          <option key={y} value={String(y)}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {hasDateError && (
                    <p style={{ color: '#E53E3E', fontSize: 12.5, marginTop: 6, fontWeight: 600 }}>
                      ⚠ Preencha a data completa
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <label style={{ fontFamily: 'var(--font-bebas)', fontSize: 15, letterSpacing: 1, color: '#0D1B4B', display: 'block', marginBottom: 6 }}>SEU MELHOR E-MAIL</label>
                  <input
                    className={`copa-input ${errors.email ? 'error' : ''}`}
                    type="email" inputMode="email"
                    placeholder="exemplo@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })) }}
                    autoComplete="email"
                  />
                  {errors.email && (
                    <p style={{ color: '#E53E3E', fontSize: 12.5, marginTop: 5, fontWeight: 600 }}>⚠ {errors.email}</p>
                  )}
                  <p style={{ fontSize: 11.5, color: 'rgba(13,27,75,0.4)', marginTop: 5, fontWeight: 500 }}>
                    📩 Você recebe o arquivo aqui após o pagamento
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button className="btn-secondary" onClick={() => goTo(1)}>← VOLTAR</button>
                  <button className="btn-primary" onClick={handleNext}>PRÓXIMO →</button>
                </div>
              </div>
            )}

            {/* ═══════════════════ STEP 3 ═══════════════════ */}
            {step === 3 && (
              <div className="card-glass p-6">
                <div className="text-center mb-5">
                  <div style={{ fontSize: 38, marginBottom: 6 }}>⭐</div>
                  <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: 30, color: '#0D1B4B', letterSpacing: 1, lineHeight: 1 }}>
                    CLUBE E DADOS
                  </h2>
                  <p style={{ fontFamily: 'var(--font-barlow)', fontSize: 13.5, color: 'rgba(13,27,75,0.55)', marginTop: 4 }}>
                    O clube do coração e os dados pra figurinha
                  </p>
                </div>

                {/* Club dropdown customizado */}
                <div className="mb-5">
                  <label style={{ fontFamily: 'var(--font-bebas)', fontSize: 15, letterSpacing: 1, color: '#0D1B4B', display: 'block', marginBottom: 6 }}>
                    CLUBE DO CORAÇÃO
                  </label>
                  <ClubSelect
                    value={club}
                    onChange={(v) => { setClub(v); setErrors((p) => ({ ...p, club: '' })) }}
                    error={errors.club}
                  />
                  {errors.club && (
                    <p style={{ color: '#E53E3E', fontSize: 12.5, marginTop: 5, fontWeight: 600 }}>⚠ {errors.club}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div>
                    <label style={{ fontFamily: 'var(--font-bebas)', fontSize: 15, letterSpacing: 1, color: '#0D1B4B', display: 'block', marginBottom: 6 }}>PESO (KG)</label>
                    <input
                      className={`copa-input ${errors.weight ? 'error' : ''}`}
                      type="number" inputMode="decimal"
                      placeholder="ex: 25"
                      value={weight}
                      onChange={(e) => { setWeight(e.target.value); setErrors((p) => ({ ...p, weight: '' })) }}
                      min="1" max="300"
                    />
                    {errors.weight && <p style={{ color: '#E53E3E', fontSize: 12.5, marginTop: 4, fontWeight: 600 }}>⚠ {errors.weight}</p>}
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-bebas)', fontSize: 15, letterSpacing: 1, color: '#0D1B4B', display: 'block', marginBottom: 6 }}>ALTURA (CM)</label>
                    <input
                      className={`copa-input ${errors.height ? 'error' : ''}`}
                      type="number" inputMode="decimal"
                      placeholder="ex: 120"
                      value={height}
                      onChange={(e) => { setHeight(e.target.value); setErrors((p) => ({ ...p, height: '' })) }}
                      min="30" max="250"
                    />
                    {errors.height && <p style={{ color: '#E53E3E', fontSize: 12.5, marginTop: 4, fontWeight: 600 }}>⚠ {errors.height}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button className="btn-secondary" onClick={() => goTo(2)}>← VOLTAR</button>
                  <button className="btn-primary" onClick={handleNext}>PRÓXIMO →</button>
                </div>
              </div>
            )}

            {/* ═══════════════════ STEP 4 — REVIEW ═══════════════════ */}
            {step === 4 && (
              <div className="card-glass p-6">
                <div className="text-center mb-4">
                  <div style={{ fontSize: 36, marginBottom: 6 }}>👀</div>
                  <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: 28, color: '#0D1B4B', letterSpacing: 1, lineHeight: 1 }}>
                    CONFIRA SEUS DADOS
                  </h2>
                  <p style={{ fontFamily: 'var(--font-barlow)', fontSize: 13, color: 'rgba(13,27,75,0.55)', marginTop: 4 }}>
                    A figurinha será gerada com esses dados
                  </p>
                </div>

                <div
                  className="flex items-start gap-3 rounded-2xl mb-4"
                  style={{ background: 'rgba(13,27,75,0.05)', padding: '11px 14px', border: '1.5px solid rgba(13,27,75,0.1)' }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                  <p style={{ fontFamily: 'var(--font-barlow)', fontSize: 12.5, color: '#0D1B4B', fontWeight: 600, lineHeight: 1.45 }}>
                    Não fazemos alterações após a aprovação e pagamento. Revise bem!
                  </p>
                </div>

                {/* Foto + nome do craque */}
                {photo && (
                  <div
                    className="flex items-center gap-4 rounded-2xl mb-5"
                    style={{ background: 'rgba(13,27,75,0.04)', border: '1.5px solid rgba(13,27,75,0.08)', padding: '14px 16px' }}
                  >
                    <div className="flex-shrink-0 rounded-xl overflow-hidden" style={{ width: 64, height: 64 }}>
                      <img src={photo} alt="Foto" className="w-full h-full" style={{ objectFit: 'cover', objectPosition: 'top center' }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 22, color: '#0D1B4B', letterSpacing: 0.5, lineHeight: 1 }}>
                        {name || '—'}
                      </div>
                      <div style={{ fontFamily: 'var(--font-barlow)', fontSize: 13, color: 'rgba(13,27,75,0.5)', fontWeight: 600, marginTop: 3 }}>
                        {club || '—'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Dados resumo */}
                <div
                  className="flex flex-col gap-0 mb-5 rounded-2xl overflow-hidden"
                  style={{ border: '1.5px solid rgba(13,27,75,0.08)' }}
                >
                  {[
                    { label: 'NASCIMENTO', value: birthDate || '—' },
                    { label: 'PESO',       value: weight ? `${weight} kg` : '—' },
                    { label: 'ALTURA',     value: height ? `${height} cm` : '—' },
                    { label: 'CLUBE',      value: club || '—' },
                    { label: 'E-MAIL',     value: email || '—' },
                  ].map(({ label, value }, i, arr) => (
                    <div
                      key={label}
                      className="flex items-center justify-between"
                      style={{
                        padding: '11px 16px',
                        background: i % 2 === 0 ? 'rgba(13,27,75,0.03)' : 'transparent',
                        borderBottom: i < arr.length - 1 ? '1px solid rgba(13,27,75,0.06)' : 'none',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-bebas)', fontSize: 13, letterSpacing: 1, color: 'rgba(13,27,75,0.4)' }}>{label}</span>
                      <span style={{ fontFamily: 'var(--font-barlow)', fontSize: 13.5, fontWeight: 700, color: '#0D1B4B', maxWidth: '60%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                    </div>
                  ))}
                </div>

                <button
                  className="btn-primary mb-3"
                  onClick={handleConfirm}
                  style={{ fontSize: 17, background: 'linear-gradient(135deg,#009B3A,#007A2E)', boxShadow: '0 10px 40px rgba(0,155,58,0.4)' }}
                >
                  ENTENDI, GERAR FIGURINHA ⚽
                </button>
                <button className="btn-secondary" onClick={() => goTo(3)}>
                  ← CORRIGIR DADOS
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Aviso modal — appears BEFORE file picker */}
      <AnimatePresence>
        {showAviso && (
          <AvisoModal
            onConfirm={handleAvisoConfirm}
            onClose={() => { setShowAviso(false); setPendingUpload(null) }}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
