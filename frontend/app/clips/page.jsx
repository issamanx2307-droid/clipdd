'use client'
import { useState, useEffect } from 'react'

function ClipGridCard({ clip }) {
  const isVideo = clip.file_type === 'video'
  return (
    <a
      href={`/clips/${clip.id}`}
      style={{
        display: 'block', textDecoration: 'none', borderRadius: 12, overflow: 'hidden',
        background: '#111827', border: '1px solid #1e293b', transition: 'transform .2s', cursor: 'pointer',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#1e293b' }}>
        {isVideo ? (
          <video
            src={clip.file_url}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            muted preload="metadata" playsInline
          />
        ) : (
          <img
            src={clip.file_url} alt={clip.title || ''}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        {isVideo && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'rgba(0,0,0,0.3)',
          }}>
            <span style={{ fontSize: '2rem', opacity: 0.9 }}>▶</span>
          </div>
        )}
      </div>
      {clip.title && (
        <div style={{
          padding: '8px 10px', fontSize: '0.8rem', color: '#cbd5e1',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {clip.title}
        </div>
      )}
    </a>
  )
}

export default function ClipsPage() {
  const [clips, setClips] = useState(null)

  useEffect(() => {
    fetch('/api/clip-thumbnails/')
      .then(r => r.ok ? r.json() : [])
      .then(data => setClips(Array.isArray(data) ? data : []))
      .catch(() => setClips([]))
  }, [])

  return (
    <main style={{
      minHeight: '100vh', background: '#09090f',
      fontFamily: 'Noto Sans Thai, system-ui, sans-serif', color: '#f1f5f9',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
          <a href="/" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.9rem', flexShrink: 0 }}>
            ← หน้าแรก
          </a>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>😂 รวมคลิปขำๆ</h1>
        </div>

        {/* States */}
        {clips === null && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b7280' }}>กำลังโหลด...</div>
        )}
        {clips !== null && clips.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b7280' }}>
            ยังไม่มีคลิป — เร็วๆ นี้จะมีคลิปสุดฮามาให้ดู!
          </div>
        )}

        {/* Grid */}
        {clips !== null && clips.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {clips.map(clip => (
              <ClipGridCard key={clip.id} clip={clip} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
