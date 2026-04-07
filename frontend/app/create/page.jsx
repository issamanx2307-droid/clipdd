'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './create.module.css'

const TONES = [
  { value: 'urgency', label: '🔥 เร่งด่วน', desc: 'FOMO สูง ปิดการขายเร็ว' },
  { value: 'review',  label: '⭐ รีวิว',    desc: 'สร้างความเชื่อใจ' },
  { value: 'drama',   label: '🎭 ดราม่า',   desc: 'เล่าเรื่อง ไวรัลง่าย' },
]

const STAGES = ['form', 'processing', 'result']

function CreateInner() {
  const params = useSearchParams()
  const [product, setProduct] = useState(params?.get('product') || '')
  const [keyPoints, setKeyPoints] = useState('')
  const [tone, setTone] = useState('urgency')
  const [stage, setStage] = useState('form')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!product.trim()) { setError('กรุณาใส่ชื่อสินค้า'); return }

    setError('')
    setStage('processing')
    setProgress(10)

    try {
      // Create project
      const res = await fetch('/api/projects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: product,
          product_name: product,
          key_points: keyPoints,
          tone,
        }),
      })

      if (res.status === 401) {
        window.location.href = '/login'
        return
      }

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || 'เกิดข้อผิดพลาด')
      }

      const project = await res.json()
      setProgress(30)

      // Poll render status
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        const status = await fetch(`/api/projects/${project.id}/render/`, { credentials: 'include' })
        const data = await status.json()

        setProgress(data.progress || Math.min(10 + attempts * 8, 90))

        if (data.project_status === 'done' && data.video_url) {
          clearInterval(poll)
          setResult(data)
          setStage('result')
        } else if (data.project_status === 'failed') {
          clearInterval(poll)
          setError(data.error || 'การสร้างวิดีโอล้มเหลว')
          setStage('form')
        } else if (attempts > 40) {
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
        <span className={styles.credits}>เครดิตฟรี: 3 คลิป</span>
      </nav>

      <div className={styles.container}>
        {stage === 'form' && (
          <div className={styles.card}>
            <h1 className={styles.title}>สร้างคลิปขายของ</h1>
            <p className={styles.subtitle}>กรอกข้อมูลสินค้า แล้วปล่อยให้ AI ทำงาน</p>

            {error && <div className={styles.error}>{error}</div>}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="product-input">ชื่อสินค้า *</label>
                <input
                  id="product-input"
                  className={styles.input}
                  placeholder="เช่น ครีมหน้าใส, กระเป๋าผ้า, หูฟังไร้สาย"
                  value={product}
                  onChange={e => setProduct(e.target.value)}
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="keypoints-input">จุดเด่นสินค้า (ไม่บังคับ)</label>
                <textarea
                  id="keypoints-input"
                  className={styles.textarea}
                  placeholder="เช่น ลดสิวใน 7 วัน, ของแท้ราคาถูก, ส่งฟรี"
                  value={keyPoints}
                  onChange={e => setKeyPoints(e.target.value)}
                  rows={3}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>สไตล์คลิป</label>
                <div className={styles.toneGrid}>
                  {TONES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      id={`tone-${t.value}`}
                      className={`${styles.toneBtn} ${tone === t.value ? styles.toneActive : ''}`}
                      onClick={() => setTone(t.value)}
                    >
                      <span className={styles.toneLabel}>{t.label}</span>
                      <span className={styles.toneDesc}>{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className={styles.submitBtn} id="create-submit-btn">
                ✨ สร้างคลิปเลย
              </button>
            </form>
          </div>
        )}

        {stage === 'processing' && (
          <div className={styles.card} style={{textAlign:'center'}}>
            <div className={styles.spinner} />
            <h2 className={styles.title}>กำลังสร้างคลิป...</h2>
            <p className={styles.subtitle}>AI กำลังเขียนสคริปต์และสร้างเสียงพากย์</p>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{width: `${progress}%`}} />
            </div>
            <p className={styles.progressLabel}>{progress}%</p>
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
            />

            <div className={styles.actions}>
              <a
                href={result.video_url}
                download
                className={styles.actionBtn}
                id="download-btn"
              >
                ⬇️ ดาวน์โหลดวิดีโอ
              </a>
              <button
                className={styles.actionBtnOutline}
                id="copy-hashtag-btn"
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
              id="new-clip-btn"
              onClick={() => {
                setStage('form')
                setProduct('')
                setKeyPoints('')
                setResult(null)
              }}
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
