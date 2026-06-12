'use client'

import React, { useState, useCallback } from 'react'

interface Order {
  id: string
  email: string | null
  nome: string | null
  paid: boolean
  paid_at: string | null
  created_at: string
  sticker_path: string | null
  dados_figurinha: Record<string, string> | null
  order_bump_products: string[]
  download_token: string
  job_id: string | null
  utm_params: Record<string, string> | null
}

interface Metrics {
  total: number
  paid: number
  unpaid: number
  downloaded: number
  withPdf: number
  revenue: number
  totalCost: number
  wasteCost: number
  profit: number
  conversion: number
  dlRate: number
  costPerGen: number
  pricePerSale: number
}

interface UTMStat {
  source: string
  medium: string
  campaign: string
  total: number
  paid: number
  revenue: number
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function pct(v: number) {
  return v.toFixed(1) + '%'
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

const S: Record<string, React.CSSProperties> = {
  card: { background: '#1a2744', borderRadius: 16, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.07)' },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 },
  big: { fontSize: 36, fontWeight: 900, lineHeight: 1 },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 },
}

export default function AdminPage() {
  const [secret, setSecret]   = useState('')
  const [authed, setAuthed]   = useState(false)
  const [orders, setOrders]     = useState<Order[]>([])
  const [metrics, setMetrics]   = useState<Metrics | null>(null)
  const [utmStats, setUtmStats] = useState<UTMStat[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [dlError, setDlError] = useState<Record<string, string>>({})
  const [filter, setFilter]   = useState<'all' | 'paid' | 'unpaid'>('all')

  const load = useCallback(async (sec = secret) => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/jobs', { headers: { 'x-admin-secret': sec } })
      if (!res.ok) { setError('Senha incorreta'); return }
      const data = await res.json()
      setOrders(data.orders)
      setMetrics(data.metrics)
      setUtmStats(data.utmStats ?? [])
      setAuthed(true)
    } finally { setLoading(false) }
  }, [secret])

  const download = useCallback(async (order: Order) => {
    setDownloading(order.id); setDlError(p => ({ ...p, [order.id]: '' }))
    try {
      const res = await fetch(`/api/admin/download/${order.job_id ?? order.id}`, {
        headers: { 'x-admin-secret': secret },
      })
      if (!res.ok) { const e = await res.json(); setDlError(p => ({ ...p, [order.id]: e.error ?? 'Erro' })); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = Object.assign(document.createElement('a'), { href: url, download: `figurinha_4K_${order.nome ?? 'sem_nome'}.png` })
      a.click(); URL.revokeObjectURL(url)
    } finally { setDownloading(null) }
  }, [secret])

  if (!authed) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1628' }}>
        <div style={{ background: '#1a2744', borderRadius: 24, padding: 40, width: '100%', maxWidth: 360, textAlign: 'center', border: '1px solid rgba(255,213,0,0.15)' }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>⚽</div>
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 30, color: '#FFD500', letterSpacing: 2, marginBottom: 24 }}>ADMIN</h1>
          <input
            type="password" placeholder="Senha admin" value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 15, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }}
          />
          {error && <p style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 8 }}>{error}</p>}
          <button onClick={() => load()} disabled={loading}
            style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg,#FFD500,#FF9500)', color: '#0D1B4B', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 900, cursor: 'pointer', letterSpacing: 1 }}>
            {loading ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </div>
      </main>
    )
  }

  const m = metrics!
  const visible = orders.filter(o =>
    filter === 'all' ? true : filter === 'paid' ? o.paid : !o.paid
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0a1628', padding: '24px 16px', fontFamily: 'var(--font-barlow)' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 34, color: '#FFD500', letterSpacing: 2, margin: 0 }}>PAINEL ADMIN</h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>convocakids.com · custo estimado: {brl(m.costPerGen)}/geração</p>
          </div>
          <button onClick={() => load()}
            style={{ background: 'rgba(255,213,0,0.12)', color: '#FFD500', border: '1px solid rgba(255,213,0,0.25)', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            ↻ Atualizar
          </button>
        </div>

        {/* ── Metrics: Volume ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
          {[
            { label: 'Geradas', value: m.total, color: '#fff', sub: 'total de figurinhas' },
            { label: 'Pagas', value: m.paid, color: '#4ade80', sub: `${pct(m.conversion)} conversão` },
            { label: 'Não pagaram', value: m.unpaid, color: '#fb923c', sub: `custo ${brl(m.wasteCost)}` },
            { label: 'Baixaram', value: m.downloaded, color: '#60a5fa', sub: `${pct(m.dlRate)} dos pagos` },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={S.card}>
              <div style={S.label}>{label}</div>
              <div style={{ ...S.big, color }}>{value}</div>
              <div style={S.sub}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Metrics: Financeiro ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
          <div style={{ ...S.card, border: '1px solid rgba(74,222,128,0.2)' }}>
            <div style={S.label}>💰 Receita Bruta</div>
            <div style={{ ...S.big, color: '#4ade80' }}>{brl(m.revenue)}</div>
            <div style={S.sub}>{m.paid} vendas × {brl(m.pricePerSale)}</div>
          </div>
          <div style={{ ...S.card, border: '1px solid rgba(251,146,60,0.2)' }}>
            <div style={S.label}>💸 Custo Total IA</div>
            <div style={{ ...S.big, color: '#fb923c' }}>{brl(m.totalCost)}</div>
            <div style={S.sub}>{m.total} gerações · {brl(m.wasteCost)} desperdiçados</div>
          </div>
          <div style={{ ...S.card, border: `1px solid ${m.profit >= 0 ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}` }}>
            <div style={S.label}>{m.profit >= 0 ? '📈 Lucro Líquido' : '📉 Prejuízo'}</div>
            <div style={{ ...S.big, color: m.profit >= 0 ? '#4ade80' : '#f87171' }}>{brl(m.profit)}</div>
            <div style={S.sub}>receita − custo IA estimado</div>
          </div>
        </div>

        {/* ── UTM Breakdown ── */}
        {utmStats.length > 0 && (
          <div style={{ ...S.card, marginBottom: 24 }}>
            <div style={{ ...S.label, marginBottom: 12 }}>📊 Origem do Tráfego</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'left' }}>
                    <th style={{ padding: '4px 10px 8px 0', fontWeight: 700, letterSpacing: 0.8 }}>FONTE</th>
                    <th style={{ padding: '4px 10px 8px 0', fontWeight: 700, letterSpacing: 0.8 }}>MEIO</th>
                    <th style={{ padding: '4px 10px 8px 0', fontWeight: 700, letterSpacing: 0.8 }}>CAMPANHA</th>
                    <th style={{ padding: '4px 10px 8px 0', fontWeight: 700, letterSpacing: 0.8, textAlign: 'right' }}>VISITAS</th>
                    <th style={{ padding: '4px 10px 8px 0', fontWeight: 700, letterSpacing: 0.8, textAlign: 'right' }}>PAGOS</th>
                    <th style={{ padding: '4px 10px 8px 0', fontWeight: 700, letterSpacing: 0.8, textAlign: 'right' }}>CONV.</th>
                    <th style={{ padding: '4px 0 8px 0', fontWeight: 700, letterSpacing: 0.8, textAlign: 'right' }}>RECEITA</th>
                  </tr>
                </thead>
                <tbody>
                  {utmStats.map((row, i) => {
                    const conv = row.total > 0 ? (row.paid / row.total * 100).toFixed(0) : '0'
                    const isOrganic = row.source === 'orgânico'
                    return (
                      <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '7px 10px 7px 0', color: isOrganic ? 'rgba(255,255,255,0.35)' : '#22d3ee', fontWeight: 700 }}>
                          {isOrganic ? '🌐' : '📣'} {row.source}
                        </td>
                        <td style={{ padding: '7px 10px 7px 0', color: 'rgba(255,255,255,0.5)' }}>{row.medium || '—'}</td>
                        <td style={{ padding: '7px 10px 7px 0', color: 'rgba(255,255,255,0.4)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.campaign || '—'}
                        </td>
                        <td style={{ padding: '7px 10px 7px 0', color: '#fff', textAlign: 'right', fontWeight: 700 }}>{row.total}</td>
                        <td style={{ padding: '7px 10px 7px 0', color: '#4ade80', textAlign: 'right', fontWeight: 700 }}>{row.paid}</td>
                        <td style={{ padding: '7px 10px 7px 0', textAlign: 'right', fontWeight: 700,
                          color: Number(conv) >= 20 ? '#4ade80' : Number(conv) >= 10 ? '#FFD500' : '#fb923c' }}>
                          {conv}%
                        </td>
                        <td style={{ padding: '7px 0 7px 0', color: '#4ade80', textAlign: 'right', fontWeight: 700 }}>{brl(row.revenue)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Filter tabs ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {([['all', `Todos (${m.total})`], ['paid', `Pagos (${m.paid})`], ['unpaid', `Pendentes (${m.unpaid})`]] as const).map(([k, lbl]) => (
            <button key={k} onClick={() => setFilter(k)}
              style={{ padding: '7px 16px', borderRadius: 99, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: filter === k ? '#FFD500' : 'rgba(255,255,255,0.06)',
                color: filter === k ? '#0D1B4B' : 'rgba(255,255,255,0.55)' }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* ── Orders list ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.length === 0 && (
            <div style={{ ...S.card, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14, padding: 40 }}>
              Nenhum pedido encontrado.
            </div>
          )}
          {visible.map(order => (
            <div key={order.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 12,
              borderLeft: `3px solid ${order.paid ? '#4ade80' : '#fb923c'}` }}>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-bebas)', fontSize: 17, color: '#fff', letterSpacing: 0.5 }}>
                    {order.nome ?? '—'}
                  </span>
                  {/* Status badge */}
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99, letterSpacing: 0.8,
                    background: order.paid ? 'rgba(74,222,128,0.15)' : 'rgba(251,146,60,0.15)',
                    color: order.paid ? '#4ade80' : '#fb923c' }}>
                    {order.paid ? 'PAGO' : 'PENDENTE'}
                  </span>
                  {/* Downloaded badge */}
                  {order.paid && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      background: order.sticker_path ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.06)',
                      color: order.sticker_path ? '#60a5fa' : 'rgba(255,255,255,0.25)' }}>
                      {order.sticker_path ? '⬇ BAIXOU' : '⬇ NÃO BAIXOU'}
                    </span>
                  )}
                  {/* PDF badge */}
                  {order.order_bump_products?.length > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>
                      PDF
                    </span>
                  )}
                  {/* UTM source badge */}
                  {order.utm_params?.utm_source && (
                    <span title={JSON.stringify(order.utm_params)}
                      style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                        background: 'rgba(34,211,238,0.12)', color: '#22d3ee', cursor: 'default' }}>
                      📊 {order.utm_params.utm_source}
                      {order.utm_params.utm_medium ? ` / ${order.utm_params.utm_medium}` : ''}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {order.email ?? '—'} · {order.dados_figurinha?.clube ?? '—'} · {timeAgo(order.created_at)}
                </div>
                {dlError[order.id] && (
                  <div style={{ fontSize: 11, color: '#f87171', marginTop: 3 }}>⚠ {dlError[order.id]}</div>
                )}
              </div>

              {/* Cost chip */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                {order.paid ? <span style={{ color: '#4ade80' }}>+{brl(12.90)}</span> : <span style={{ color: '#fb923c' }}>−{brl(0.25)}</span>}
              </div>

              {/* Download button (admin 4K) */}
              {order.job_id && (
                <button onClick={() => download(order)} disabled={downloading === order.id}
                  style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 700, cursor: downloading === order.id ? 'wait' : 'pointer',
                    background: order.paid ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)',
                    color: order.paid ? '#4ade80' : 'rgba(255,255,255,0.3)' }}>
                  {downloading === order.id ? '...' : '4K ↓'}
                </button>
              )}
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.15)', marginTop: 24 }}>
          Custo IA estimado: OpenAI gpt-image-2 (~R$0,23) + Replicate rembg (~R$0,02) = R$0,25/geração
        </p>
      </div>
    </main>
  )
}
