'use client'
import { useState, useEffect } from 'react'

function RelatedCard({ clip }) {
  const isVideo = clip.file_type === 'video'
  return (
    <a
      href={`/clips/${clip.id}`}
      style={{
        display: 'block', textDecoration: 'none', borderRadius: 10, overflow: 'hidden',
        background: '#111827', border: '1px solid #1e293b',
      }}
    >
      <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#1e293b' }}>
        {isVideo ? (
          <video
            src={clip.file_url} muted preload="metadata" playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
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
            justifyContent: 'center', background: 'rgba(0,0,0,0.25)',
          }}>
            <span style={{ fontSize: '1.5rem', opacity: 0.85 }}>▶</span>
          </div>
        )}
      </div>
      {clip.title && (
        <div style={{
          padding: '6px 8px', fontSize: '0.75rem', color: '#94a3b8',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {clip.title}
        </div>
      )}
    </a>
  )
}

export default function ClipViewPage({ params }) {
  const [clips, setClips] = useState(null)
  const [copied, setCopied] = useState(false)
  const clipId = parseInt(params.id)

  useEffect(() => {
    fetch('/api/clip-thumbnails/')
      .then(r => r.ok ? r.json() : [])
      .then(data => setClips(Array.isArray(data) ? data : []))
      .catch(() => setClips([]))
  }, [])

  const clip = clips?.find(c => c.id === clipId) ?? null
  const isVideo = clip?.file_type === 'video'
  const related = clips ? clips.filter(c => c.id !== clipId).slice(0, 6) : []

  function share() {
    const url = window.location.href
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => flashCopied()).catch(() => fallbackCopy(url))
    } else {
      fallbackCopy(url)
    }
  }

  function fallbackCopy(url) {
    const el = document.createElement('textarea')
    el.value = url
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    flashCopied()
  }

  function flashCopied() {
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <main style={{
      minHeight: '100vh', background: '#09090f',
      fontFamily: 'Noto Sans Thai, system-ui, sans-serif', color: '#f1f5f9',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px', width: '100%', boxSizing: 'border-box' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <a href="/clips" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← คลังคลิป
          </a>
          <span style={{ color: '#374151' }}>·</span>
          <a href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.85rem' }}>
            หน้าแรก
          </a>
        </div>

        {/* Loading */}
        {clips === null && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b7280' }}>กำลังโหลด...</div>
        )}

        {/* Not found */}
        {clips !== null && !clip && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>😢</div>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>ไม่พบคลิปนี้</p>
            <a href="/clips" style={{
              background: '#E53E3E', color: '#fff', padding: '10px 24px',
              borderRadius: 999, fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none',
            }}>
              ← กลับไปคลังคลิป
            </a>
          </div>
        )}

        {/* Clip viewer */}
        {clip && (
          <>
            {/* Player */}
            <div style={{
              borderRadius: 16, overflow: 'hidden', background: '#111827',
              marginBottom: 20, border: '1px solid #1e293b',
            }}>
              {isVideo ? (
                <video
                  key={clip.id}
                  src={clip.file_url}
                  controls autoPlay muted loop playsInline
                  style={{ width: '100%', display: 'block', maxHeight: '70vh', background: '#000' }}
                />
              ) : (
                <img
                  src={clip.file_url} alt={clip.title || ''}
                  style={{ width: '100%', display: 'block', maxHeight: '70vh', objectFit: 'contain' }}
                />
              )}
            </div>

            {/* Info + share */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 12, marginBottom: 16,
            }}>
              <div>
                {clip.title && (
                  <h2 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 700 }}>
                    {clip.title}
                  </h2>
                )}
                {clip.category && (
                  <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{clip.category}</span>
                )}
              </div>
              <button
                onClick={share}
                style={{
                  background: copied ? '#16a34a' : '#E53E3E',
                  color: '#fff', border: 'none', borderRadius: 999,
                  padding: '10px 22px', fontSize: '0.95rem', fontWeight: 700,
                  cursor: 'pointer', transition: 'background .25s',
                  display: 'flex', alignItems: 'center', gap: 8,
                  whiteSpace: 'nowrap',
                }}
              >
                {copied ? '✓ คัดลอกแล้ว!' : '🔗 แชร์ลิ้งค์'}
              </button>
            </div>

            {/* Share hint */}
            {copied && (
              <p style={{ fontSize: '0.82rem', color: '#4ade80', margin: '0 0 16px' }}>
                คัดลอก URL เรียบร้อย — นำไปวางที่ใดก็ได้ คนรับจะเข้ามาดูคลิปนี้โดยตรง
              </p>
            )}

            {/* Related */}
            {related.length > 0 && (
              <div style={{ marginTop: 40 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14, color: '#9ca3af' }}>
                  คลิปอื่นๆ
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: 10,
                }}>
                  {related.map(c => <RelatedCard key={c.id} clip={c} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
