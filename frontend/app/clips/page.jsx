'use client'
import { useState, useEffect, useRef } from 'react'

/* ── Card ── */
function ClipCard({ clip }) {
  const isVideo = clip.file_type === 'video'
  const vidRef = useRef(null)
  const [hovered, setHovered] = useState(false)

  function onEnter() {
    setHovered(true)
    if (isVideo && vidRef.current) vidRef.current.play().catch(() => {})
  }
  function onLeave() {
    setHovered(false)
    if (isVideo && vidRef.current) { vidRef.current.pause(); vidRef.current.currentTime = 0 }
  }

  return (
    <a
      href={`/clips/${clip.id}`}
      style={{ display: 'block', textDecoration: 'none', borderRadius: 14, overflow: 'hidden',
        background: '#111827', border: `1px solid ${hovered ? '#E53E3E55' : '#1e293b'}`,
        boxShadow: hovered ? '0 0 0 1px #E53E3E33, 0 8px 32px rgba(229,62,62,.12)' : '0 2px 8px rgba(0,0,0,.4)',
        transition: 'transform .2s, border-color .2s, box-shadow .2s',
        transform: hovered ? 'translateY(-3px) scale(1.01)' : 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', paddingBottom: '62.5%', background: '#0d1117', overflow: 'hidden' }}>
        {isVideo ? (
          <video
            ref={vidRef}
            src={clip.file_url}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            muted loop playsInline preload="metadata"
          />
        ) : (
          <img
            src={clip.file_url} alt={clip.title || ''}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        {/* Play overlay */}
        {isVideo && !hovered && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'rgba(0,0,0,.35)',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(229,62,62,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 16px rgba(229,62,62,.4)',
            }}>
              <span style={{ fontSize: '1.2rem', marginLeft: 3 }}>▶</span>
            </div>
          </div>
        )}
        {/* Type badge */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: isVideo ? 'rgba(229,62,62,.85)' : 'rgba(30,41,59,.85)',
          color: '#fff', fontSize: '0.7rem', fontWeight: 700,
          padding: '2px 8px', borderRadius: 999, backdropFilter: 'blur(4px)',
        }}>
          {isVideo ? '🎬 วิดีโอ' : '🖼️ รูปภาพ'}
        </div>
      </div>

      {/* Caption */}
      <div style={{ padding: '10px 12px 12px' }}>
        {clip.title ? (
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {clip.title}
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#4b5563', fontStyle: 'italic' }}>
            ไม่มีคำบรรยาย
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 }}>
          <span style={{ fontSize: '0.72rem', color: '#E53E3E', fontWeight: 700 }}>ดูคลิป →</span>
        </div>
      </div>
    </a>
  )
}

/* ── Page ── */
export default function ClipsPage() {
  const [clips, setClips] = useState(null)

  useEffect(() => {
    fetch('/api/clip-thumbnails/')
      .then(r => r.ok ? r.json() : [])
      .then(data => setClips(Array.isArray(data) ? data : []))
      .catch(() => setClips([]))
  }, [])

  const total = clips?.length ?? 0

  return (
    <main style={{
      minHeight: '100vh',
      background: '#09090f',
      fontFamily: 'Noto Sans Thai, system-ui, sans-serif',
      color: '#f1f5f9',
    }}>

      {/* ── Hero ── */}
      <div style={{
        background: 'linear-gradient(160deg, #0f0f1a 0%, #1a0a0a 50%, #0f0f1a 100%)',
        borderBottom: '1px solid #1e293b',
        padding: '48px 24px 40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow orb */}
        <div style={{
          position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
          width: 400, height: 200, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(229,62,62,.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        {/* Breadcrumb */}
        <div style={{ marginBottom: 20 }}>
          <a href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.85rem' }}>
            หน้าแรก
          </a>
          <span style={{ color: '#374151', margin: '0 8px' }}>›</span>
          <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>รวมคลิปขำๆ</span>
        </div>

        <div style={{
          display: 'inline-block', background: 'rgba(229,62,62,.12)', border: '1px solid rgba(229,62,62,.3)',
          borderRadius: 999, padding: '4px 14px', fontSize: '0.78rem', color: '#f87171',
          fontWeight: 700, marginBottom: 16,
        }}>
          😂 รวมคลิปขำๆ
        </div>

        <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 900, lineHeight: 1.2 }}>
          คลังคลิปสุดฮา
          <span style={{ color: '#E53E3E' }}> ดูฟรี</span>
        </h1>
        <p style={{ margin: '0 auto', maxWidth: 480, color: '#9ca3af', fontSize: '0.95rem', lineHeight: 1.6 }}>
          รวมคลิปตลก · สัตว์น่ารัก · ช่วงเวลาน่าจดจำ — กดแชร์ให้เพื่อนดูได้เลย
        </p>

        {clips !== null && (
          <div style={{ marginTop: 20, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
              padding: '8px 20px', fontSize: '0.85rem', color: '#94a3b8' }}>
              {total} คลิป
            </div>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
              padding: '8px 20px', fontSize: '0.85rem', color: '#94a3b8' }}>
              🎬 วิดีโอ + รูปภาพ
            </div>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px 60px' }}>

        {/* Loading */}
        {clips === null && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ width: 40, height: 40, border: '3px solid #1e293b', borderTopColor: '#E53E3E',
              borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: '#6b7280' }}>กำลังโหลดคลิป...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Empty */}
        {clips !== null && clips.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎬</div>
            <h2 style={{ color: '#e2e8f0', margin: '0 0 8px' }}>ยังไม่มีคลิป</h2>
            <p style={{ color: '#6b7280', marginBottom: 28 }}>กำลังรวบรวมคลิปสุดฮา มาใหม่เร็วๆ นี้!</p>
            <a href="/" style={{
              background: '#E53E3E', color: '#fff', padding: '10px 24px',
              borderRadius: 999, fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none',
            }}>
              ← กลับหน้าแรก
            </a>
          </div>
        )}

        {/* Grid */}
        {clips !== null && clips.length > 0 && (
          <>
            <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, #E53E3E33, transparent)' }} />
              <span style={{ color: '#6b7280', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                {total} คลิปทั้งหมด
              </span>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, #E53E3E33, transparent)' }} />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}>
              {clips.map(clip => <ClipCard key={clip.id} clip={clip} />)}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
