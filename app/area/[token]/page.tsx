import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ token: string }>
}

export default async function AreaPage({ params }: Props) {
  const { token } = await params

  if (!token || token.length < 32) return notFound()

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('paid, nome, dados_figurinha, created_at')
    .eq('download_token', token)
    .single()

  if (!order) return notFound()

  const nome = order.nome ?? 'Torcedor(a)'
  const d    = (order.dados_figurinha ?? {}) as Record<string, string>
  const downloadUrl = `/api/download/${token}`

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0D1B4B 0%, #091830 60%, #050E24 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: '100%',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,213,0,0.2)',
          borderRadius: 20,
          overflow: 'hidden',
        }}
      >
        {/* Header verde */}
        <div
          style={{
            background: 'linear-gradient(135deg, #009B3A, #007030)',
            padding: '24px 20px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, lineHeight: 1 }}>⚽</div>
          <div
            style={{
              color: '#FFD500',
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 2,
              marginTop: 8,
              textTransform: 'uppercase',
            }}
          >
            Área do Torcedor
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }}>
            Copa do Mundo 2026
          </div>
        </div>

        <div style={{ padding: '28px 24px' }}>
          {order.paid ? (
            <>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, margin: '0 0 6px' }}>
                Olá, <strong style={{ color: '#FFD500' }}>{nome}</strong>! 🎉
              </p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
                Seu pagamento foi confirmado. Clique abaixo para baixar sua figurinha personalizada em alta qualidade.
              </p>

              {d.clube && (
                <div
                  style={{
                    background: 'rgba(255,213,0,0.08)',
                    border: '1px solid rgba(255,213,0,0.2)',
                    borderRadius: 12,
                    padding: '12px 16px',
                    marginBottom: 24,
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.8,
                  }}
                >
                  <strong style={{ color: '#FFD500' }}>⚽ {nome}</strong><br />
                  {d.clube && <span>🏟️ {d.clube}</span>}
                  {d.data && <><br /><span>📅 {d.data}</span></>}
                  {d.altura && <><br /><span>📏 {d.altura}</span></>}
                  {d.peso && <><br /><span>⚖️ {d.peso}</span></>}
                </div>
              )}

              <a
                href={downloadUrl}
                download
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #FFD500, #FFA500)',
                  color: '#000',
                  fontWeight: 900,
                  fontSize: 16,
                  textDecoration: 'none',
                  padding: '16px 24px',
                  borderRadius: 50,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                ⬇️ BAIXAR MINHA FIGURINHA
              </a>

              <p
                style={{
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: 11,
                  textAlign: 'center',
                  marginTop: 16,
                  lineHeight: 1.5,
                }}
              >
                Arquivo PNG em alta resolução • Sem marca d&apos;água<br />
                Pode baixar quantas vezes quiser
              </p>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 40 }}>⏳</div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, textAlign: 'center', margin: '0 0 12px' }}>
                Aguardando confirmação do pagamento
              </p>
              <p
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 13,
                  textAlign: 'center',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Assim que seu pagamento for confirmado, você receberá um email com o link para download.
                Pode levar alguns minutos.
              </p>
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <a
                  href={`/area/${token}`}
                  style={{
                    display: 'inline-block',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 13,
                    textDecoration: 'none',
                    padding: '10px 20px',
                    borderRadius: 50,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  🔄 Verificar novamente
                </a>
              </div>
            </>
          )}
        </div>

        <div
          style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '14px 24px',
            textAlign: 'center',
          }}
        >
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: 0, lineHeight: 1.5 }}>
            Figurinha Copa 2026 • Produto digital exclusivo
          </p>
        </div>
      </div>
    </main>
  )
}
