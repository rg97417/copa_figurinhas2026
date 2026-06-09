'use client'

import React, { useState, useCallback } from 'react'

interface Job {
  id: string
  nome: string
  email: string
  clube: string
  data: string
  altura: string
  peso: string
  paid: boolean
  createdAt: string
}

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [dlError, setDlError] = useState<Record<string, string>>({})

  const login = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/jobs', {
        headers: { 'x-admin-secret': secret },
      })
      if (!res.ok) { setError('Senha incorreta'); return }
      const data = await res.json()
      setJobs(data)
      setAuthed(true)
    } finally {
      setLoading(false)
    }
  }, [secret])

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/jobs', {
      headers: { 'x-admin-secret': secret },
    })
    setJobs(await res.json())
  }, [secret])

  const download = useCallback(async (job: Job) => {
    setDownloading(job.id)
    setDlError((p) => ({ ...p, [job.id]: '' }))
    try {
      const res = await fetch(`/api/admin/download/${job.id}`, {
        headers: { 'x-admin-secret': secret },
      })
      if (!res.ok) {
        const err = await res.json()
        setDlError((p) => ({ ...p, [job.id]: err.error ?? 'Erro' }))
        return
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `figurinha_${job.nome.replace(/\s+/g, '_')}.png`
      a.click()
      URL.revokeObjectURL(url)
      await refresh()
    } finally {
      setDownloading(null)
    }
  }, [secret, refresh])

  if (!authed) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D1B4B' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 360, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 28, color: '#0D1B4B', letterSpacing: 1, marginBottom: 20 }}>
            ADMIN
          </h1>
          <input
            type="password"
            placeholder="Senha admin"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #E8EAF0', fontSize: 15, marginBottom: 12, boxSizing: 'border-box' }}
          />
          {error && <p style={{ color: '#E53E3E', fontSize: 13, marginBottom: 8 }}>{error}</p>}
          <button
            onClick={login}
            disabled={loading}
            style={{ width: '100%', padding: '13px', background: '#0D1B4B', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >
            {loading ? 'Entrando...' : 'ENTRAR'}
          </button>
        </div>
      </main>
    )
  }

  const pendentes  = jobs.filter((j) => !j.paid)
  const entregues  = jobs.filter((j) => j.paid)

  return (
    <main style={{ minHeight: '100vh', background: '#F4F6FB', padding: '24px 16px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 32, color: '#0D1B4B', letterSpacing: 1, margin: 0 }}>
              PAINEL ADMIN
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(13,27,75,0.5)', marginTop: 2, fontFamily: 'var(--font-barlow)' }}>
              {jobs.length} figurinha{jobs.length !== 1 ? 's' : ''} gerada{jobs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={refresh} style={{ background: '#0D1B4B', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            ↻ Atualizar
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total', value: jobs.length, color: '#0D1B4B' },
            { label: 'Pendentes', value: pendentes.length, color: '#E67E22' },
            { label: 'Entregues', value: entregues.length, color: '#009B3A' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 34, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color: 'rgba(13,27,75,0.45)', fontWeight: 600, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Lista */}
        {jobs.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', color: 'rgba(13,27,75,0.4)', fontSize: 15 }}>
            Nenhuma figurinha gerada ainda.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...pendentes, ...entregues].map((job) => (
              <div
                key={job.id}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: '14px 16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: job.paid ? '1.5px solid rgba(0,155,58,0.25)' : '1.5px solid rgba(230,126,34,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {/* Status dot */}
                <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: job.paid ? '#009B3A' : '#E67E22' }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 18, color: '#0D1B4B', letterSpacing: 0.5, lineHeight: 1 }}>
                    {job.nome}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(13,27,75,0.5)', fontWeight: 500, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {job.email || '—'} · {job.clube} · {new Date(job.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                  {dlError[job.id] && (
                    <div style={{ fontSize: 11.5, color: '#E53E3E', marginTop: 3 }}>⚠ {dlError[job.id]}</div>
                  )}
                </div>

                {/* Ação */}
                <button
                  onClick={() => download(job)}
                  disabled={downloading === job.id}
                  style={{
                    flexShrink: 0,
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: 'none',
                    background: job.paid ? 'rgba(0,155,58,0.1)' : '#0D1B4B',
                    color: job.paid ? '#009B3A' : '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: downloading === job.id ? 'wait' : 'pointer',
                  }}
                >
                  {downloading === job.id ? '...' : job.paid ? '↓ Baixar' : '↓ Gerar'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
