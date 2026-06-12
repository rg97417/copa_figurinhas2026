'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'

interface OrderCard {
  id: string
  nome: string | null
  dados_figurinha: Record<string, string> | null
  created_at: string
  download_token: string
  preview_url: string | null
}

interface AreaData {
  nome: string
  orders: OrderCard[]
  has_pdf: boolean
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.convocakids.com'

export default function AreaPage() {
  const params = useParams()
  const token = params?.token as string

  const [data, setData]         = useState<AreaData | null>(null)
  const [status, setStatus]     = useState<'loading' | 'error' | 'pending' | 'ok'>('loading')
  const [sharing, setSharing]   = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [dlError, setDlError]   = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/area/data/${token}`)
      .then(r => r.json())
      .then(json => {
        if (json.pending) { setStatus('pending'); return }
        if (json.error)   { setStatus('error');   return }
        setData(json)
        setStatus('ok')
      })
      .catch(() => setStatus('error'))
  }, [token])

  const handleDownload = useCallback(async (url: string, filename: string, dlKey: string) => {
    setDownloading(dlKey)
    setDlError(null)
    try {
      const res = await fetch(url)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setDlError(json.error ?? 'Erro ao baixar arquivo. Tente novamente.')
        return
      }
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
    } catch {
      setDlError('Erro de conexão. Tente novamente.')
    } finally {
      setDownloading(null)
    }
  }, [])

  const handleShare = useCallback(async (order: OrderCard) => {
    setSharing(order.download_token)
    const nome = order.nome ?? 'Figurinha'
    const ogUrl = `${BASE_URL}/api/og/${order.download_token}`
    const siteUrl = `${BASE_URL}/?utm_source=whatsapp&utm_medium=convite&utm_campaign=copa2026`
    const shareText = `Olha minha figurinha da Copa 2026! ⚽🏆\n${ogUrl}\n\nCria a tua também: ${siteUrl}`

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        // Web Share API: tenta compartilhar o arquivo da figurinha
        try {
          const res = await fetch(`/api/og/${order.download_token}`)
          if (res.ok) {
            const blob = await res.blob()
            const file = new File([blob], `${nome.replace(/\s+/g, '_')}_Copa2026.png`, { type: 'image/png' })
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({
                title: '⚽ Minha Figurinha Copa 2026',
                text: `Cria a tua também: ${siteUrl}`,
                files: [file],
              })
              setSharing(null)
              return
            }
          }
        } catch { /* cai pro fallback */ }

        // Fallback Web Share sem arquivo
        await navigator.share({ title: '⚽ Minha Figurinha Copa 2026', text: shareText })
        setSharing(null)
        return
      }
    } catch { /* usuário cancelou ou não suportado */ }

    // Fallback: WhatsApp link
    const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
    window.open(wa, '_blank')
    setSharing(null)
  }, [])

  if (status === 'loading') return <FullScreen><Spinner /></FullScreen>
  if (status === 'error')   return <FullScreen><NotFound /></FullScreen>
  if (status === 'pending') return <FullScreen><PendingView token={token} /></FullScreen>
  if (!data) return null

  const primeiroNome = data.nome.split(' ')[0]
  const multipleOrders = data.orders.length > 1

  return (
    <div style={s.page}>
      {/* ── Topo ── */}
      <header style={s.header}>
        <div style={s.headerLogo}>
          <span style={{ fontSize: 18 }}>⚽</span>
          <span style={s.headerLogoText}>Copa 2026</span>
        </div>
        <a href="/" style={s.headerExit}>Sair</a>
      </header>

      {/* ── Hero ── */}
      <div style={s.hero}>
        <div style={s.heroBadge}>✅ Pagamento confirmado</div>
        <h1 style={s.heroTitle}>
          Olá, <span style={s.heroName}>{primeiroNome}</span>!
        </h1>
        <p style={s.heroSub}>
          {data.orders.length === 1
            ? 'Sua figurinha personalizada está pronta.'
            : `Você tem ${data.orders.length} figurinhas prontas.`}
        </p>
      </div>

      {/* ── Erro de download ── */}
      {dlError && (
        <div style={{ margin: '0 16px 16px', background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 12, padding: '12px 16px', color: '#ff8080', fontSize: 13 }}>
          ⚠️ {dlError}
          <button onClick={() => setDlError(null)} style={{ float: 'right', background: 'none', border: 'none', color: '#ff8080', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* ── Figurinhas ── */}
      <div style={{ padding: '0 16px', marginBottom: 24 }}>
        {multipleOrders ? (
          /* Carrossel horizontal */
          <div style={s.carousel}>
            {data.orders.map(o => (
              <StickerCard
                key={o.id}
                order={o}
                onShare={() => handleShare(o)}
                onDownloadPng={() => handleDownload(`/api/download/${o.download_token}`, `${o.nome ?? 'figurinha'}_Copa2026.png`, `png-${o.download_token}`)}
                onDownloadPdf={() => handleDownload(`/api/download/pdf/${o.download_token}`, `${o.nome ?? 'figurinha'}_Copa2026.pdf`, `pdf-${o.download_token}`)}
                sharing={sharing === o.download_token}
                downloading={downloading}
                compact
              />
            ))}
          </div>
        ) : (
          /* Card único centralizado */
          data.orders.length > 0 && (
            <StickerCard
              order={data.orders[0]}
              onShare={() => handleShare(data.orders[0])}
              onDownloadPng={() => handleDownload(`/api/download/${data.orders[0].download_token}`, `${data.orders[0].nome ?? 'figurinha'}_Copa2026.png`, `png-${data.orders[0].download_token}`)}
              onDownloadPdf={() => handleDownload(`/api/download/pdf/${data.orders[0].download_token}`, `${data.orders[0].nome ?? 'figurinha'}_Copa2026.pdf`, `pdf-${data.orders[0].download_token}`)}
              sharing={sharing === data.orders[0].download_token}
              downloading={downloading}
            />
          )
        )}
      </div>

      {/* ── Criar nova ── */}
      <div style={{ padding: '0 16px', marginBottom: 32 }}>
        <a href="/" style={s.createNew}>
          <span style={{ fontSize: 20 }}>⚽</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>Criar nova figurinha</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Para outra pessoa ou ocasião</div>
          </div>
          <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)', fontSize: 20 }}>›</span>
        </a>
      </div>

      {/* ── Rodapé ── */}
      <footer style={s.footer}>
        <p style={s.footerText}>Figurinha Copa 2026 • Produto digital exclusivo</p>
        <a href="/area" style={s.footerLink}>Recuperar link por email</a>
      </footer>
    </div>
  )
}

/* ── Card da figurinha ── */
function StickerCard({
  order, onShare, onDownloadPng, onDownloadPdf, sharing, downloading, compact = false,
}: {
  order: OrderCard
  onShare: () => void
  onDownloadPng: () => void
  onDownloadPdf: () => void
  sharing: boolean
  downloading: string | null
  compact?: boolean
}) {
  const nome = order.nome ?? 'Torcedor(a)'
  const d    = order.dados_figurinha ?? {}
  const dlPngKey = `png-${order.download_token}`
  const dlPdfKey = `pdf-${order.download_token}`

  return (
    <div style={{ ...(compact ? s.cardCompact : s.card) }}>
      {/* Preview */}
      <div style={compact ? s.previewCompact : s.preview}>
        {order.preview_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={order.preview_url}
            alt={nome}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: compact ? 12 : 16 }}
          />
        ) : (
          <div style={s.previewPlaceholder}>
            <span style={{ fontSize: compact ? 36 : 56 }}>⚽</span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 8 }}>Pronto para baixar</span>
          </div>
        )}
        {/* Glow de fundo */}
        <div style={compact ? s.glowCompact : s.glow} />
      </div>

      {/* Info */}
      <div style={s.cardInfo}>
        <div style={s.cardNome}>{nome}</div>
        {d.clube && <div style={s.cardSub}>🏟️ {d.clube}</div>}
        {!compact && d.data && (
          <div style={s.cardMeta}>
            {d.data && <span>📅 {d.data}</span>}
            {d.altura && <span> · 📏 {d.altura}</span>}
            {d.peso && <span> · ⚖️ {d.peso}</span>}
          </div>
        )}
      </div>

      {/* Botões */}
      <div style={compact ? s.btnsCompact : s.btns}>
        <button
          onClick={onDownloadPng}
          disabled={!!downloading}
          style={{ ...s.btnPrimary, opacity: downloading === dlPngKey ? 0.7 : 1, border: 'none', cursor: downloading ? 'not-allowed' : 'pointer' }}
        >
          {downloading === dlPngKey ? '⏳ Baixando...' : '⬇ Baixar PNG'}
        </button>
        <button
          onClick={onDownloadPdf}
          disabled={!!downloading}
          style={{ ...s.btnSecondary, opacity: downloading === dlPdfKey ? 0.7 : 1, border: '1px solid rgba(255,255,255,0.15)', cursor: downloading ? 'not-allowed' : 'pointer' }}
        >
          {downloading === dlPdfKey ? '⏳ Gerando PDF...' : '📄 Baixar PDF (12 figurinhas)'}
        </button>
        <button
          onClick={onShare}
          disabled={sharing}
          style={s.btnWhatsapp}
        >
          {sharing ? '...' : (
            <><WhatsIcon /> Enviar no WhatsApp</>
          )}
        </button>
      </div>
    </div>
  )
}

/* ── Ícone WhatsApp ── */
function WhatsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"
      style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

/* ── Estados auxiliares ── */
function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #040D21 0%, #0A1B3E 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
    }}>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 48, animation: 'spin 1s linear infinite' }}>⚽</div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 16, fontSize: 14 }}>Carregando sua área...</p>
    </div>
  )
}

function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>😕</div>
      <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>Link não encontrado</p>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 24px' }}>
        Use o email cadastrado para recuperar seu acesso.
      </p>
      <a href="/area" style={{
        display: 'inline-block', background: '#FFD600', color: '#000',
        fontWeight: 900, fontSize: 14, textDecoration: 'none',
        padding: '14px 28px', borderRadius: 50,
      }}>
        📩 Recuperar por email
      </a>
    </div>
  )
}

function PendingView({ token }: { token: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 24px', maxWidth: 340 }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div>
      <p style={{ color: '#fff', fontWeight: 900, fontSize: 20, margin: '0 0 10px' }}>
        Aguardando confirmação
      </p>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.6, margin: '0 0 28px' }}>
        Assim que o pagamento for confirmado você receberá um email. Pode levar alguns minutos.
      </p>
      <a href={`/area/${token}`} style={{
        display: 'inline-block', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none',
        padding: '14px 28px', borderRadius: 50,
      }}>
        🔄 Verificar novamente
      </a>
    </div>
  )
}

/* ── Estilos ── */
const s = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #040D21 0%, #0B1B3E 60%, #061226 100%)',
    fontFamily: '"Arial", sans-serif',
    paddingBottom: 48,
  },
  header: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  headerLogo: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  headerLogoText: {
    color: '#FFD600',
    fontWeight: 900,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  headerExit: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textDecoration: 'none',
  },
  hero: {
    padding: '32px 20px 20px',
    textAlign: 'center' as const,
  },
  heroBadge: {
    display: 'inline-block',
    background: 'rgba(0,200,83,0.15)',
    border: '1px solid rgba(0,200,83,0.35)',
    color: '#00C853',
    fontSize: 11,
    fontWeight: 700,
    padding: '5px 14px',
    borderRadius: 20,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 900,
    margin: '0 0 8px',
    letterSpacing: -0.5,
  },
  heroName: {
    background: 'linear-gradient(90deg, #FFD600, #FF9F00)',
    WebkitBackgroundClip: 'text' as const,
    WebkitTextFillColor: 'transparent' as const,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    margin: 0,
    lineHeight: 1.5,
  },
  // Card único (destaque)
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,214,0,0.18)',
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  preview: {
    width: '100%',
    maxWidth: 280,
    margin: '0 auto 20px',
    aspectRatio: '3/4',
    borderRadius: 16,
    overflow: 'hidden' as const,
    background: 'rgba(255,255,255,0.04)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    position: 'relative' as const,
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  },
  glow: {
    position: 'absolute' as const,
    bottom: -30,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 180,
    height: 60,
    background: 'radial-gradient(ellipse, rgba(255,214,0,0.25) 0%, transparent 70%)',
    pointerEvents: 'none' as const,
  },
  // Card compacto (carrossel)
  cardCompact: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,214,0,0.15)',
    borderRadius: 20,
    padding: 14,
    width: 200,
    flexShrink: 0,
  },
  previewCompact: {
    width: '100%',
    aspectRatio: '3/4',
    borderRadius: 12,
    overflow: 'hidden' as const,
    background: 'rgba(255,255,255,0.04)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    position: 'relative' as const,
    marginBottom: 12,
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
  },
  glowCompact: {
    position: 'absolute' as const,
    bottom: -20,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 100,
    height: 40,
    background: 'radial-gradient(ellipse, rgba(255,214,0,0.2) 0%, transparent 70%)',
    pointerEvents: 'none' as const,
  },
  previewPlaceholder: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    width: '100%',
    height: '100%',
  },
  cardInfo: {
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  cardNome: {
    color: '#fff',
    fontWeight: 900,
    fontSize: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  cardSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginBottom: 4,
  },
  cardMeta: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
  },
  btns: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: 10,
  },
  btnsCompact: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: 8,
  },
  btnPrimary: {
    display: 'block',
    textAlign: 'center' as const,
    background: 'linear-gradient(135deg, #FFD600, #FF9F00)',
    color: '#000',
    fontWeight: 900,
    fontSize: 14,
    textDecoration: 'none',
    padding: '15px',
    borderRadius: 50,
    letterSpacing: 0.5,
  },
  btnSecondary: {
    display: 'block',
    textAlign: 'center' as const,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 700,
    fontSize: 13,
    textDecoration: 'none',
    padding: '13px',
    borderRadius: 50,
    letterSpacing: 0.3,
  },
  btnWhatsapp: {
    display: 'block' as const,
    width: '100%',
    textAlign: 'center' as const,
    background: '#25D366',
    color: '#fff',
    fontWeight: 900,
    fontSize: 14,
    border: 'none',
    padding: '15px',
    borderRadius: 50,
    letterSpacing: 0.5,
    cursor: 'pointer' as const,
  },
  carousel: {
    display: 'flex' as const,
    gap: 14,
    overflowX: 'auto' as const,
    paddingBottom: 8,
    scrollSnapType: 'x mandatory' as const,
  },
  createNew: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 14,
    background: 'rgba(255,255,255,0.04)',
    border: '1px dashed rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: '16px 18px',
    textDecoration: 'none',
    cursor: 'pointer' as const,
  },
  footer: {
    textAlign: 'center' as const,
    padding: '0 20px',
  },
  footerText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
    margin: '0 0 6px',
  },
  footerLink: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    textDecoration: 'underline',
  },
}
