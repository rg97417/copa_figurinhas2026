import { getSupabaseAdmin, OrderRow } from '@/lib/supabase'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ token: string }>
}

type OrderCard = Pick<
  OrderRow,
  'id' | 'paid' | 'nome' | 'dados_figurinha' | 'created_at' | 'download_token' | 'sticker_path' | 'order_bump_products'
>

export default async function AreaPage({ params }: Props) {
  const { token } = await params

  if (!token || token.length < 32) return notFound()

  let thisOrder: OrderCard | null = null
  let allOrders: OrderCard[] = []

  try {
    const sb = getSupabaseAdmin()

    // Primeiro: encontra o pedido pelo token
    const { data: found } = await sb
      .from('orders')
      .select('id, paid, nome, dados_figurinha, created_at, download_token, sticker_path, order_bump_products, email')
      .eq('download_token', token)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thisOrder = found as any

    if (thisOrder && (thisOrder as unknown as { email: string | null }).email && thisOrder.paid) {
      // Busca todas as figurinhas pagas deste email
      const email = (thisOrder as unknown as { email: string }).email
      const { data: allFound } = await sb
        .from('orders')
        .select('id, paid, nome, dados_figurinha, created_at, download_token, sticker_path, order_bump_products')
        .eq('email', email)
        .eq('paid', true)
        .order('created_at', { ascending: false })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      allOrders = (allFound as any[]) ?? []
    }
  } catch {
    // env vars ausentes ou erro de conexão
  }

  if (!thisOrder) return notFound()

  // Pendente: mostra tela de espera
  if (!thisOrder.paid) {
    return <PendingPage token={token} />
  }

  const nome = thisOrder.nome ?? 'Torcedor(a)'
  const primeiroNome = nome.split(' ')[0]

  // Verifica se alguma das compras tem PDF
  const pdfProductId = process.env.KIWIFY_PDF_PRODUCT_ID ?? ''
  const hasPdf = allOrders.some(o =>
    Array.isArray(o.order_bump_products) &&
    (o.order_bump_products as string[]).some(pid =>
      !pdfProductId || pid === pdfProductId
    ) &&
    (o.order_bump_products as string[]).length > 0
  )

  // Token do pedido mais recente (para link do PDF)
  const pdfToken = allOrders[0]?.download_token ?? token

  // Gera signed URLs para previews disponíveis
  const ordersWithPreviews = await Promise.all(
    allOrders.map(async (o) => {
      let previewUrl: string | null = null
      if (o.sticker_path) {
        try {
          const { data: signed } = await getSupabaseAdmin().storage
            .from('stickers')
            .createSignedUrl(o.sticker_path, 600)
          previewUrl = signed?.signedUrl ?? null
        } catch { /* sem preview */ }
      }
      return { ...o, previewUrl }
    })
  )

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ fontSize: 44, lineHeight: 1 }}>⚽</div>
          <div style={styles.headerTitle}>Área do Torcedor</div>
          <div style={styles.headerSub}>Copa do Mundo 2026</div>
        </div>

        <div style={{ padding: '28px 24px' }}>
          {/* Saudação */}
          <p style={styles.greeting}>
            Olá, <strong style={{ color: '#FFD500' }}>{primeiroNome}</strong>! 🎉
          </p>
          <p style={styles.greetingSub}>
            {allOrders.length === 1
              ? 'Sua figurinha está pronta para download.'
              : `Você tem ${allOrders.length} figurinhas prontas para download.`}
          </p>

          {/* Cards das figurinhas */}
          <div style={allOrders.length > 1 ? styles.cardsGrid : undefined}>
            {ordersWithPreviews.map((o, i) => {
              const d = (o.dados_figurinha ?? {}) as Record<string, string>
              const nomeCard = o.nome ?? 'Figurinha'
              const createdAt = new Date(o.created_at).toLocaleDateString('pt-BR')
              return (
                <div key={o.id} style={styles.figurinhaCard}>
                  {/* Preview */}
                  <div style={styles.previewBox}>
                    {o.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={o.previewUrl}
                        alt={`Figurinha ${nomeCard}`}
                        style={styles.previewImg}
                      />
                    ) : (
                      <div style={styles.previewPlaceholder}>
                        <div style={{ fontSize: 32 }}>⚽</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
                          Figurinha #{i + 1}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 4, textAlign: 'center' }}>
                    {d.clube ? `🏟️ ${d.clube}` : nomeCard}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 14, textAlign: 'center' }}>
                    Comprada em {createdAt}
                  </div>

                  {/* Botão download */}
                  <a
                    href={`/api/download/${o.download_token}`}
                    download
                    style={styles.btnDownload}
                  >
                    ⬇️ Baixar figurinha
                  </a>
                </div>
              )
            })}
          </div>

          {/* Aviso formato */}
          <p style={styles.formatNote}>
            PNG em alta resolução • Sem marca d&apos;água • Pode baixar quantas vezes quiser
          </p>

          {/* Seção PDF */}
          {hasPdf && (
            <div style={styles.pdfSection}>
              <div style={styles.pdfIcon}>📄</div>
              <div style={styles.pdfTitle}>Guia de Impressão</div>
              <div style={styles.pdfDesc}>
                Dicas de como imprimir sua figurinha em alta qualidade — tamanhos, papéis e configurações ideais.
              </div>
              <a
                href={`/api/download/pdf/${pdfToken}`}
                download
                style={styles.btnPdf}
              >
                📥 Baixar PDF
              </a>
            </div>
          )}

          {/* Gerar nova */}
          <div style={styles.divider} />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, textAlign: 'center', margin: '0 0 12px' }}>
            Quer gerar uma nova figurinha?
          </p>
          <a href="/" style={styles.btnNew}>
            ⚽ Gerar nova figurinha
          </a>
        </div>

        <div style={styles.footer}>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, margin: 0 }}>
            Figurinha Copa 2026 • Produto digital exclusivo
          </p>
        </div>
      </div>
    </main>
  )
}

function PendingPage({ token }: { token: string }) {
  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={{ fontSize: 44, lineHeight: 1 }}>⚽</div>
          <div style={styles.headerTitle}>Área do Torcedor</div>
          <div style={styles.headerSub}>Copa do Mundo 2026</div>
        </div>
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, margin: '0 0 10px' }}>
            Aguardando confirmação do pagamento
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.6, margin: '0 0 24px' }}>
            Assim que confirmado, você receberá um email com o link. Pode levar alguns minutos.
          </p>
          <a href={`/area/${token}`} style={styles.btnRefresh}>🔄 Verificar novamente</a>
        </div>
        <div style={styles.footer}>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, margin: 0 }}>
            Figurinha Copa 2026 • Produto digital exclusivo
          </p>
        </div>
      </div>
    </main>
  )
}

/* ── Estilos inline ── */
const styles = {
  main: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0D1B4B 0%, #091830 60%, #050E24 100%)',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: '24px 16px',
    fontFamily: 'Arial, sans-serif',
  },
  card: {
    maxWidth: 460,
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,213,0,0.2)',
    borderRadius: 20,
    overflow: 'hidden' as const,
  },
  header: {
    background: 'linear-gradient(135deg, #009B3A, #007030)',
    padding: '24px 20px',
    textAlign: 'center' as const,
  },
  headerTitle: {
    color: '#FFD500',
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: 2,
    marginTop: 8,
    textTransform: 'uppercase' as const,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 4,
  },
  greeting: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    margin: '0 0 4px',
  },
  greetingSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    margin: '0 0 22px',
    lineHeight: 1.5,
  },
  cardsGrid: {
    display: 'grid' as const,
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  figurinhaCard: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: '14px 12px 16px',
    marginBottom: 0,
  },
  previewBox: {
    width: '100%',
    aspectRatio: '3/4',
    borderRadius: 8,
    overflow: 'hidden' as const,
    marginBottom: 10,
    background: 'rgba(255,255,255,0.04)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  previewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  previewPlaceholder: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    width: '100%',
    height: '100%',
  },
  btnDownload: {
    display: 'block',
    textAlign: 'center' as const,
    background: 'linear-gradient(135deg, #FFD500, #FFA500)',
    color: '#000',
    fontWeight: 900,
    fontSize: 12,
    textDecoration: 'none',
    padding: '11px 8px',
    borderRadius: 50,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  formatNote: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    textAlign: 'center' as const,
    margin: '16px 0 0',
    lineHeight: 1.5,
  },
  pdfSection: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: '20px 18px',
    marginTop: 20,
    textAlign: 'center' as const,
  },
  pdfIcon: { fontSize: 36, marginBottom: 8 },
  pdfTitle: {
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
    marginBottom: 6,
  },
  pdfDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    lineHeight: 1.6,
    marginBottom: 16,
  },
  btnPdf: {
    display: 'inline-block',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    fontWeight: 700,
    fontSize: 13,
    textDecoration: 'none',
    padding: '12px 24px',
    borderRadius: 50,
    letterSpacing: 0.5,
  },
  divider: {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    margin: '24px 0 16px',
  },
  btnNew: {
    display: 'block',
    textAlign: 'center' as const,
    background: 'rgba(0,155,58,0.12)',
    border: '1px solid rgba(0,155,58,0.35)',
    color: '#4ddb88',
    fontWeight: 700,
    fontSize: 14,
    textDecoration: 'none',
    padding: '12px 24px',
    borderRadius: 50,
    letterSpacing: 0.5,
  },
  btnRefresh: {
    display: 'inline-block',
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textDecoration: 'none',
    padding: '10px 20px',
    borderRadius: 50,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  footer: {
    background: 'rgba(0,0,0,0.3)',
    padding: '14px 24px',
    textAlign: 'center' as const,
  },
}
