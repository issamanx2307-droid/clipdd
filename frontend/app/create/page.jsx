'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './create.module.css'

const TONES = [
  { value: 'urgency', label: '🔥 เร่งด่วน', desc: 'FOMO สูง ปิดการขายเร็ว' },
  { value: 'review',  label: '⭐ รีวิว',    desc: 'สร้างความเชื่อใจ' },
  { value: 'drama',   label: '🎭 ดราม่า',   desc: 'เล่าเรื่อง ไวรัลง่าย' },
]

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('cd_token')
}

function authHeaders() {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Token ${token}` } : {}),
  }
}

function CreateInner() {
  const params = useSearchParams()
  const [product, setProduct] = useState(params?.get('product') || '')
  const [keyPoints, setKeyPoints] = useState('')
  const [tone, setTone] = useState('urgency')
  const [templateUrl, setTemplateUrl] = useState('')
  const [duration, setDuration] = useState(15)
  const [stage, setStage] = useState('form')
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('AI กำลังเขียนสคริปต์...')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [credits, setCredits] = useState(null)

  useEffect(() => {
    if (!getToken()) {
      window.location.href = '/login?next=/create'
      return
    }
    const u = localStorage.getItem('cd_user')
    if (u) setCredits(JSON.parse(u).credits)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!product.trim()) { setError('กรุณาใส่ชื่อสินค้า'); return }

    setError('')
    setStage('processing')
    setProgress(10)
    setProgressMsg('AI กำลังเขียนสคริปต์...')

    try {
      const res = await fetch('/api/projects/', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: product,
          product_name: product,
          key_points: keyPoints,
          tone,
          template_url: templateUrl.trim(),
          duration,
        }),
      })

      if (res.status === 401) {
        localStorage.removeItem('cd_token')
        window.location.href = '/login?next=/create'
        return
      }

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || 'เกิดข้อผิดพลาด')
      }

      const project = await res.json()
      setProgress(20)

      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        const r = await fetch(`/api/projects/${project.id}/render/`, { headers: authHeaders() })
        const data = await r.json()

        const p = data.progress || Math.min(20 + attempts * 7, 92)
        setProgress(p)

        if (p < 40) setProgressMsg('AI กำลังเขียนสคริปต์...')
        else if (p < 60) setProgressMsg(templateUrl ? 'กำลังดาวน์โหลดวิดีโอต้นแบบ...' : 'กำลังสร้างเสียงพากย์...')
        else if (p < 80) setProgressMsg('กำลังสร้างเสียงพากย์...')
        else setProgressMsg('กำลังตัดต่อวิดีโอ...')

        if (data.project_status === 'done' && data.video_url) {
          clearInterval(poll)
          setResult(data)
          setStage('result')
          if (credits !== null) setCredits(c => Math.max(0, c - 1))
        } else if (data.project_status === 'failed') {
          clearInterval(poll)
          setError(data.error || 'การสร้างวิดีโอล้มเหลว กรุณาลองใหม่')
          setStage('form')
        } else if (attempts > 60) {
          clearInterval(poll)
          setError('หมดเวลา กรุณาลองใหม่')
          setStage('form')
        }
      }, 3000)

    } catch (err) {
      setError(err.message)
      setStage('form')
    }
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <a href="/" className={styles.logo}>Clip<span>DD</span></a>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          {credits !== null && (
            <span className={styles.credits}>🎬 เครดิตคงเหลือ: {credits} คลิป</span>
          )}
          <button
            className={styles.logoutBtn}
            onClick={() => { localStorage.removeItem('cd_token'); localStorage.removeItem('cd_user'); window.location.href = '/' }}
          >
            ออกจากระบบ
          </button>
        </div>
      </nav>

      <div className={styles.container}>
        {stage === 'form' && (
          <div className={styles.card}>
            <h1 className={styles.title}>สร้างคลิปขายของ</h1>
            <p className={styles.subtitle}>กรอกข้อมูลสินค้า แล้วปล่อยให้ AI ทำงาน</p>

            {error && <div className={styles.error}>{error}</div>}

            <form onSubmit={handleSubmit} className={styles.form}>

              {/* ชื่อสินค้า */}
              <div className={styles.field}>
                <label className={styles.label}>ชื่อสินค้า *</label>
                <input
                  className={styles.input}
                  placeholder="เช่น ครีมหน้าใส SPF50, กระเป๋าผ้า, หูฟังไร้สาย"
                  value={product}
                  onChange={e => setProduct(e.target.value)}
                  required
                />
              </div>

              {/* จุดเด่น */}
              <div className={styles.field}>
                <label className={styles.label}>จุดเด่นสินค้า (ไม่บังคับ)</label>
                <textarea
                  className={styles.textarea}
                  placeholder="เช่น ลดสิวใน 7 วัน, ของแท้ราคาถูก, ส่งฟรี"
                  value={keyPoints}
                  onChange={e => setKeyPoints(e.target.value)}
                  rows={2}
                />
              </div>

              {/* ความยาวคลิป */}
              <div className={styles.field}>
                <label className={styles.label}>ความยาวคลิป</label>
                <div className={styles.durationPicker}>
                  {[15, 30].map(d => (
                    <button
                      key={d}
                      type="button"
                      className={`${styles.durationBtn} ${duration === d ? styles.durationActive : ''}`}
                      onClick={() => setDuration(d)}
                    >
                      <span className={styles.durationNum}>{d}s</span>
                      <span className={styles.durationDesc}>
                        {d === 15 ? 'สั้น คม จุดใจ' : 'ยาว อธิบายละเอียด'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* คลิปต้นแบบ */}
              <div className={styles.field}>
                <label className={styles.label}>
                  วิดีโอพื้นหลัง (ไม่บังคับ)
                  <span className={styles.labelHint}> — วาง URL คลิปต้นแบบ TikTok/YouTube/MP4</span>
                </label>
                <div className={styles.urlInputWrap}>
                  <span className={styles.urlIcon}>🎬</span>
                  <input
                    className={styles.urlInput}
                    type="url"
                    placeholder="https://www.tiktok.com/@... หรือ URL วิดีโอ mp4"
                    value={templateUrl}
                    onChange={e => setTemplateUrl(e.target.value)}
                  />
                  {templateUrl && (
                    <button type="button" className={styles.urlClear} onClick={() => setTemplateUrl('')}>✕</button>
                  )}
                </div>
                {templateUrl && (
                  <p className={styles.urlNote}>✓ AI จะนำวิดีโอนี้เป็นพื้นหลัง และซ้อน script ด้านบน</p>
                )}
                {!templateUrl && (
                  <p className={styles.urlNote}>ถ้าไม่ใส่ จะใช้พื้นหลังสีดำเรียบๆ แทน</p>
                )}
              </div>

              {/* สไตล์ */}
              <div className={styles.field}>
                <label className={styles.label}>สไตล์คลิป</label>
                <div className={styles.toneGrid}>
                  {TONES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      className={`${styles.toneBtn} ${tone === t.value ? styles.toneActive : ''}`}
                      onClick={() => setTone(t.value)}
                    >
                      <span className={styles.toneLabel}>{t.label}</span>
                      <span className={styles.toneDesc}>{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={credits === 0}>
                {credits === 0 ? '😔 เครดิตหมดแล้ว' : `✨ สร้างคลิป ${duration} วินาที`}
              </button>
            </form>
          </div>
        )}

        {stage === 'processing' && (
          <div className={styles.card} style={{textAlign:'center'}}>
            <div className={styles.spinner} />
            <h2 className={styles.title}>กำลังสร้างคลิป {duration}s...</h2>
            <p className={styles.subtitle}>{progressMsg}</p>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{width: `${progress}%`, transition:'width 0.8s ease'}} />
            </div>
            <p className={styles.progressLabel}>{progress}%</p>
            {templateUrl && progress >= 35 && progress < 60 && (
              <p style={{color:'var(--muted)',fontSize:'0.8rem',marginTop:8}}>
                ⏳ กำลังดาวน์โหลดวิดีโอต้นแบบ อาจใช้เวลาสักครู่...
              </p>
            )}
          </div>
        )}

        {stage === 'result' && result && (
          <div className={styles.card}>
            <div className={styles.successBadge}>✅ คลิปของคุณพร้อมแล้ว!</div>
            <h2 className={styles.title}>{product}</h2>

            <video
              className={styles.videoPlayer}
              src={result.video_url}
              controls
              autoPlay
              loop
              playsInline
            />

            <div className={styles.actions}>
              <a href={result.video_url} download className={styles.actionBtn}>
                ⬇️ ดาวน์โหลดวิดีโอ
              </a>
              <button
                className={styles.actionBtnOutline}
                onClick={() => {
                  navigator.clipboard.writeText(result.hashtags?.join(' ') || '')
                  alert('คัดลอก hashtag แล้ว!')
                }}
              >
                # คัดลอก Hashtag
              </button>
            </div>

            <button
              className={styles.newBtn}
              onClick={() => { setStage('form'); setProduct(''); setKeyPoints(''); setTemplateUrl(''); setResult(null) }}
            >
              + สร้างคลิปใหม่
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0a0a0f',color:'#888'}}>กำลังโหลด...</div>}>
      <CreateInner />
    </Suspense>
  )
}
