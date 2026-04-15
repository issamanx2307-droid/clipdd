'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const API = '/api'

const STATUS_MAP = {
  pending:                    { label: 'รอดำเนินการ',        icon: '⏳', color: '#94a3b8' },
  generating_script:          { label: 'กำลังเขียนสคริปต์',  icon: '🤖', color: '#60a5fa' },
  awaiting_script_approval:   { label: 'รอตรวจสอบสคริปต์',  icon: '📝', color: '#f59e0b' },
  generating_video:           { label: 'กำลังสร้างวิดีโอ',   icon: '🎬', color: '#a78bfa' },
  awaiting_kling:             { label: 'รอ Kling AI',         icon: '⚡', color: '#c084fc' },
  done:                       { label: 'เสร็จแล้ว',          icon: '✅', color: '#10b981' },
  failed:                     { label: 'ล้มเหลว',            icon: '❌', color: '#ef4444' },
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, icon: '❓', color: '#94a3b8' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: s.color + '22',
      border: `1px solid ${s.color}55`,
      color: s.color,
      fontSize: '0.76rem', fontWeight: 700,
      padding: '3px 10px', borderRadius: 999,
      whiteSpace: 'nowrap',
    }}>
      {s.icon} {s.label}
    </span>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)        // from localStorage (fast)
  const [credits, setCredits] = useState(null)  // from API (accurate)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  // Auth check
  useEffect(() => {
    const t = localStorage.getItem('cd_token')
    if (!t) { router.replace('/login'); return }
    setToken(t)
    try {
      const u = JSON.parse(localStorage.getItem('cd_user') || '{}')
      setUser(u)
    } catch {}
  }, [router])

  const loadData = useCallback(async (t) => {
    if (!t) return
    setLoading(true)
    try {
      const [billRes, projRes] = await Promise.all([
        fetch(`${API}/billing/`, { headers: { Authorization: `Token ${t}` } }),
        fetch(`${API}/projects/`, { headers: { Authorization: `Token ${t}` } }),
      ])
      if (billRes.ok) {
        const d = await billRes.json()
        setCredits(d.credits)
      }
      if (projRes.ok) {
        setProjects(await projRes.json())
      }
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (token) loadData(token)
  }, [token, loadData])

  function logout() {
    localStorage.removeItem('cd_token')
    localStorage.removeItem('cd_user')
    window.location.href = '/'
  }

  if (!token) return null

  const activeProjects = projects.filter(p => !['done', 'failed'].includes(p.status))
  const doneProjects   = projects.filter(p => p.status === 'done')
  const failedProjects = projects.filter(p => p.status === 'failed')

  return (
    <div style={{
      minHeight: '100vh',
      background: '#09090f',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 56,
        borderBottom: '1px solid rgba(255,255,255,.08)',
        background: 'rgba(9,9,15,.95)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <a href="/" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', textDecoration: 'none' }}>
          Clip<span style={{ color: '#E53E3E' }}>DD</span>
        </a>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="/create" style={{
            color: '#94a3b8', fontSize: '0.82rem', textDecoration: 'none',
            padding: '6px 14px', border: '1px solid rgba(255,255,255,.12)',
            borderRadius: 999,
          }}>🎬 สร้างคลิป</a>
          <button onClick={logout} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,.12)',
            color: '#94a3b8', borderRadius: 999,
            padding: '6px 14px', fontSize: '0.82rem', cursor: 'pointer',
          }}>ออกจากระบบ</button>
        </div>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px 60px' }}>

        {/* Profile Card */}
        <div style={{
          background: 'rgba(255,255,255,.04)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 18,
          padding: '28px 24px',
          marginBottom: 32,
          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
        }}>
          {/* Avatar */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg,#E53E3E,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', flexShrink: 0,
          }}>
            👤
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f1f5f9', marginBottom: 4 }}>
              {user?.name || user?.email || 'ผู้ใช้งาน'}
            </div>
            <div style={{ fontSize: '0.84rem', color: '#64748b' }}>{user?.email}</div>
          </div>

          {/* Credits + topup */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: credits === 0 ? '#ef4444' : '#f1f5f9', lineHeight: 1 }}>
              {credits ?? user?.credits ?? '—'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 10 }}>เครดิตคงเหลือ</div>
            <a href="/topup" style={{
              display: 'inline-block',
              background: '#E53E3E',
              color: '#fff', textDecoration: 'none',
              borderRadius: 999, padding: '8px 20px',
              fontWeight: 700, fontSize: '0.85rem',
            }}>+ เติมเครดิต</a>
          </div>
        </div>

        {/* Active / In-progress */}
        {activeProjects.length > 0 && (
          <Section title="🔄 กำลังดำเนินการ" count={activeProjects.length}>
            {activeProjects.map(p => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </Section>
        )}

        {/* Done */}
        <Section title="✅ คลิปที่เสร็จแล้ว" count={doneProjects.length} loading={loading}>
          {loading ? (
            <div style={{ color: '#64748b', fontSize: '0.88rem', padding: '16px 0' }}>กำลังโหลด...</div>
          ) : doneProjects.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '0.88rem', padding: '16px 0' }}>
              ยังไม่มีคลิปที่เสร็จ —{' '}
              <a href="/create" style={{ color: '#E53E3E', textDecoration: 'none' }}>สร้างคลิปแรกเลย →</a>
            </div>
          ) : (
            doneProjects.map(p => <ProjectCard key={p.id} project={p} />)
          )}
        </Section>

        {/* Failed */}
        {!loading && failedProjects.length > 0 && (
          <Section title="❌ ล้มเหลว" count={failedProjects.length}>
            {failedProjects.map(p => <ProjectCard key={p.id} project={p} />)}
          </Section>
        )}

      </div>
    </div>
  )
}

function Section({ title, count, children, loading }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </h2>
        {!loading && count > 0 && (
          <span style={{
            background: 'rgba(255,255,255,.1)', color: '#94a3b8',
            fontSize: '0.72rem', fontWeight: 700,
            padding: '2px 8px', borderRadius: 999,
          }}>{count}</span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  )
}

function ProjectCard({ project: p }) {
  const [expanded, setExpanded] = useState(false)
  const date = p.created_at
    ? new Date(p.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div style={{
      background: 'rgba(255,255,255,.04)',
      border: '1px solid rgba(255,255,255,.08)',
      borderRadius: 14,
      padding: '14px 16px',
      transition: 'border-color .2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        {/* Main info */}
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 4, fontSize: '0.95rem' }}>
            {p.product_name || `Project #${p.id}`}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{date}</div>
        </div>

        {/* Status */}
        <div style={{ flexShrink: 0 }}>
          <StatusBadge status={p.status} />
        </div>
      </div>

      {/* Done — show video + download */}
      {p.status === 'done' && p.video_url && (
        <div style={{ marginTop: 14 }}>
          {!expanded ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => setExpanded(true)}
                style={{
                  background: 'rgba(255,255,255,.08)', color: '#e2e8f0',
                  border: 'none', borderRadius: 8,
                  padding: '7px 16px', fontSize: '0.82rem', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ▶ ดูวิดีโอ
              </button>
              <a
                href={p.video_url}
                download
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#E53E3E', color: '#fff',
                  textDecoration: 'none',
                  borderRadius: 8, padding: '7px 16px',
                  fontSize: '0.82rem', fontWeight: 700,
                  display: 'inline-block',
                }}
              >
                ⬇ ดาวน์โหลด
              </a>
            </div>
          ) : (
            <div>
              <video
                src={p.video_url}
                controls
                playsInline
                style={{
                  width: '100%', maxWidth: 320, borderRadius: 10,
                  display: 'block', background: '#000',
                  marginBottom: 10,
                }}
              />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setExpanded(false)}
                  style={{
                    background: 'rgba(255,255,255,.08)', color: '#94a3b8',
                    border: 'none', borderRadius: 8,
                    padding: '7px 16px', fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  ✕ ซ่อน
                </button>
                <a
                  href={p.video_url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: '#E53E3E', color: '#fff',
                    textDecoration: 'none',
                    borderRadius: 8, padding: '7px 16px',
                    fontSize: '0.82rem', fontWeight: 700,
                    display: 'inline-block',
                  }}
                >
                  ⬇ ดาวน์โหลด
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* In-progress — link to continue */}
      {['awaiting_script_approval'].includes(p.status) && (
        <div style={{ marginTop: 10 }}>
          <a
            href="/create"
            style={{
              display: 'inline-block',
              background: '#f59e0b22', color: '#fbbf24',
              border: '1px solid #f59e0b55',
              textDecoration: 'none', borderRadius: 8,
              padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600,
            }}
          >
            📝 ไปตรวจสอบสคริปต์ →
          </a>
        </div>
      )}
    </div>
  )
}
