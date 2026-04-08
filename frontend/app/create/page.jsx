'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './create.module.css'

const TONES = [
  { value: 'urgency', label: '🔥 เร่งด่วน', desc: 'FOMO สูง ปิดการขายเร็ว' },
  { value: 'review',  label: '⭐ รีวิว',    desc: 'สร้างความเชื่อใจ' },
  { value: 'drama',   label: '🎭 ดราม่า',   desc: 'เล่าเรื่อง ไวรัลง่าย' },
]

// Stages: form → generating_images → awaiting_selection → generating_video → done
const STAGE_LABEL = {
  generating_images: 'AI กำลังสร้างภาพสินค้า...',
  generating_video:  'AI กำลังสร้างวิดีโอ...',
}

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('cd_token')
}
function authHeaders(contentType = 'application/json') {
  const token = getToken()
  return {
    ...(contentType ? { 'Content-Type': contentType } : {}),
    ...(token ? { Authorization: `Token ${token}` } : {}),
  }
}

function CreateInner() {
  const params = useSearchParams()
  // Form state
  const [product, setProduct]       = useState(params?.get('product') || '')
  const [keyPoints, setKeyPoints]   = useState('')
  const [tone, setTone]             = useState('urgency')
  const [duration, setDuration]     = useState(15)
  const [refImages, setRefImages]   = useState([])   // File[] max 2
  const fileRef                     = useRef(null)

  // Flow state
  const [stage, setStage]           = useState('form')   // form | generating_images | awaiting_selection | generating_video | done
  const [projectId, setProjectId]   = useState(null)
  const [genImages, setGenImages]   = useState([])       // GeneratedImage[]
  const [canRegen, setCanRegen]     = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [videoResult, setVideoResult] = useState(null)
  const [videoRedoLeft, setVideoRedoLeft] = useState(1)

  // UI state
  const [error, setError]           = useState('')
  const [credits, setCredits]       = useState(null)
  const pollRef                     = useRef(null)

  useEffect(() => {
    if (!getToken()) { window.location.href = '/login?next=/create'; return }
    const u = localStorage.getItem('cd_user')
    if (u) setCredits(JSON.parse(u).credits)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // ── Poll project images status ──
  function startImagePoll(pid) {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/projects/${pid}/images/`, { headers: authHeaders() })
        const d = await r.json()
        if (d.status === 'awaiting_selection') {
          clearInterval(pollRef.current)
          setGenImages(d.images || [])
          setCanRegen(d.can_regenerate)
          setStage('awaiting_selection')
        } else if (d.status === 'failed') {
          clearInterval(pollRef.current)
          setError('สร้างภาพไม่สำเร็จ กรุณาลองใหม่')
          setStage('form')
        }
      } catch {}
    }, 3000)
  }

  // ── Poll video render status ──
  function startVideoPoll(pid) {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/projects/${pid}/render/`, { headers: authHeaders() })
        const d = await r.json()
        if (d.project_status === 'done' && d.video_url) {
          clearInterval(pollRef.current)
          setVideoResult(d)
          setStage('done')
          if (credits !== null) setCredits(c => Math.max(0, c - 1))
        } else if (d.project_status === 'failed') {
          clearInterval(pollRef.current)
          setError(d.error || 'สร้างวิดีโอไม่สำเร็จ')
          setStage('awaiting_selection')
        }
      } catch {}
    }, 4000)
  }

  // ── Step 1: Submit form → create project → start image generation ──
  async function handleSubmit(e) {
    e.preventDefault()
    if (!product.trim()) { setError('กรุณาใส่ชื่อสินค้า'); return }
    setError('')

    const formData = new FormData()
    formData.append('name', product)
    formData.append('product_name', product)
    formData.append('key_points', keyPoints)
    formData.append('tone', tone)
    formData.append('duration', duration)
    refImages.forEach(f => formData.append('images', f))

    try {
      const res = await fetch('/api/projects/', {
        method: 'POST',
        headers: { Authorization: `Token ${getToken()}` },  // no Content-Type for multipart
        body: formData,
      })
      if (res.status === 401) { localStorage.removeItem('cd_token'); window.location.href = '/login?next=/create'; return }
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'เกิดข้อผิดพลาด') }

      const project = await res.json()
      setProjectId(project.id)
      setStage('generating_images')
      startImagePoll(project.id)
    } catch (err) {
      setError(err.message)
    }
  }

  // ── Step 2b: Regenerate images ──
  async function handleRegen() {
    setError('')
    setStage('generating_images')
    setGenImages([])
    const res = await fetch(`/api/projects/${projectId}/regenerate/`, {
      method: 'POST', headers: authHeaders(),
    })
    if (res.ok) startImagePoll(projectId)
    else { const d = await res.json(); setError(d.detail); setStage('awaiting_selection') }
  }

  // ── Step 3: Select image → start video generation ──
  async function handleSelectImage(imageId) {
    setSelectedId(imageId)
    setError('')
    setStage('generating_video')
    const res = await fetch(`/api/projects/${projectId}/select-image/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ image_id: imageId }),
    })
    if (res.ok) startVideoPoll(projectId)
    else { const d = await res.json(); setError(d.detail); setStage('awaiting_selection') }
  }

  // ── Step 4b: Redo video ──
  async function handleRedoVideo() {
    if (videoRedoLeft <= 0) return
    setVideoRedoLeft(n => n - 1)
    setVideoResult(null)
    setStage('generating_video')
    const res = await fetch(`/api/projects/${projectId}/select-image/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ image_id: selectedId }),
    })
    if (res.ok) startVideoPoll(projectId)
    else { const d = await res.json(); setError(d.detail); setStage('done') }
  }

  // ── Image picker for upload ──
  function handleFileChange(e) {
    const files = Array.from(e.target.files).slice(0, 2)
    setRefImages(files)
  }
  function removeRefImage(i) {
    setRefImages(prev => prev.filter((_, idx) => idx !== i))
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <a href="/" className={styles.logo}>Clip<span>DD</span></a>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          {credits !== null && <span className={styles.credits}>🎬 เครดิต: {credits} คลิป</span>}
          <button className={styles.logoutBtn}
            onClick={() => { localStorage.removeItem('cd_token'); localStorage.removeItem('cd_user'); window.location.href = '/' }}>
            ออกจากระบบ
          </button>
        </div>
      </nav>

      <div className={styles.container}>

        {/* ── STEP INDICATOR ── */}
        {stage !== 'form' && (
          <div className={styles.steps}>
            {['สร้างโปรเจค','เลือกภาพ','ได้คลิป'].map((s, i) => {
              const active = (i === 0 && ['generating_images','awaiting_selection'].includes(stage)) ||
                             (i === 1 && stage === 'awaiting_selection') ||
                             (i === 2 && ['generating_video','done'].includes(stage))
              const done = (i === 0 && stage !== 'generating_images') ||
                           (i === 1 && ['generating_video','done'].includes(stage))
              return (
                <div key={s} className={`${styles.step} ${done ? styles.stepDone : active ? styles.stepActive : ''}`}>
                  <div className={styles.stepDot}>{done ? '✓' : i+1}</div>
                  <span>{s}</span>
                </div>
              )
            })}
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {/* ══════════ STAGE: FORM ══════════ */}
        {stage === 'form' && (
          <div className={styles.card}>
            <h1 className={styles.title}>สร้างคลิปขายของ</h1>
            <p className={styles.subtitle}>AI สร้างภาพ → คุณเลือก → AI สร้างคลิป</p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>ชื่อสินค้า *</label>
                <input className={styles.input} placeholder="เช่น ครีมหน้าใส SPF50, กระเป๋าผ้า" value={product} onChange={e => setProduct(e.target.value)} required />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>จุดเด่นสินค้า (ไม่บังคับ)</label>
                <textarea className={styles.textarea} placeholder="เช่น ลดสิวใน 7 วัน, ส่งฟรี, ของแท้" value={keyPoints} onChange={e => setKeyPoints(e.target.value)} rows={2} />
              </div>

              {/* Upload ref images */}
              <div className={styles.field}>
                <label className={styles.label}>
                  ภาพสินค้าต้นฉบับ (ไม่บังคับ)
                  <span className={styles.labelHint}> — อัพโหลดได้สูงสุด 2 ภาพ</span>
                </label>
                <div className={styles.uploadZone} onClick={() => fileRef.current?.click()}>
                  {refImages.length === 0 ? (
                    <>
                      <div className={styles.uploadIcon}>📷</div>
                      <div className={styles.uploadText}>คลิกเพื่ออัพโหลดภาพสินค้า</div>
                      <div className={styles.uploadSub}>JPG / PNG · สูงสุด 2 ภาพ · AI จะใช้เป็น reference</div>
                    </>
                  ) : (
                    <div className={styles.previewRow}>
                      {refImages.map((f, i) => (
                        <div key={i} className={styles.previewItem}>
                          <img src={URL.createObjectURL(f)} alt="" className={styles.previewImg} />
                          <button type="button" className={styles.previewRemove}
                            onClick={e => { e.stopPropagation(); removeRefImage(i) }}>✕</button>
                        </div>
                      ))}
                      {refImages.length < 2 && (
                        <div className={styles.previewAdd}>+ เพิ่ม</div>
                      )}
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleFileChange} />
              </div>

              {/* Duration */}
              <div className={styles.field}>
                <label className={styles.label}>ความยาวคลิป</label>
                <div className={styles.durationPicker}>
                  {[15, 30].map(d => (
                    <button key={d} type="button"
                      className={`${styles.durationBtn} ${duration === d ? styles.durationActive : ''}`}
                      onClick={() => setDuration(d)}>
                      <span className={styles.durationNum}>{d}s</span>
                      <span className={styles.durationDesc}>{d === 15 ? 'สั้น คม จุดใจ' : 'ยาว อธิบายละเอียด'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div className={styles.field}>
                <label className={styles.label}>สไตล์คลิป</label>
                <div className={styles.toneGrid}>
                  {TONES.map(t => (
                    <button key={t.value} type="button"
                      className={`${styles.toneBtn} ${tone === t.value ? styles.toneActive : ''}`}
                      onClick={() => setTone(t.value)}>
                      <span className={styles.toneLabel}>{t.label}</span>
                      <span className={styles.toneDesc}>{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={credits === 0}>
                {credits === 0 ? '😔 เครดิตหมดแล้ว' : '✨ สร้างภาพสินค้า →'}
              </button>
            </form>
          </div>
        )}

        {/* ══════════ STAGE: GENERATING IMAGES ══════════ */}
        {stage === 'generating_images' && (
          <div className={styles.card} style={{textAlign:'center'}}>
            <div className={styles.spinner} />
            <h2 className={styles.title}>AI กำลังสร้างภาพ...</h2>
            <p className={styles.subtitle}>Flux Schnell กำลัง render ภาพสินค้าให้คุณ</p>
            <div className={styles.loadingDots}><span /><span /><span /></div>
          </div>
        )}

        {/* ══════════ STAGE: SELECT IMAGE ══════════ */}
        {stage === 'awaiting_selection' && (
          <div className={styles.card}>
            <h2 className={styles.title}>เลือกภาพที่ชอบ</h2>
            <p className={styles.subtitle}>เลือก 1 ภาพ → AI จะสร้างคลิปจากภาพนี้</p>

            <div className={styles.imageGrid}>
              {genImages.map(img => (
                <div key={img.id}
                  className={`${styles.imageCard} ${selectedId === img.id ? styles.imageSelected : ''}`}
                  onClick={() => setSelectedId(img.id)}>
                  <img src={img.image_url} alt="" className={styles.genImage} />
                  {selectedId === img.id && <div className={styles.imageCheck}>✓</div>}
                  <div className={styles.imageRound}>รอบ {img.generation_round}</div>
                </div>
              ))}
            </div>

            <div className={styles.imageActions}>
              {canRegen && (
                <button className={styles.regenBtn} onClick={handleRegen}>
                  🔄 สร้างภาพใหม่อีก 2 ภาพ
                  <span className={styles.regenNote}>
                    {genImages.length > 0 ? ` (เหลือ ${3 - Math.max(...genImages.map(i => i.generation_round))} ครั้ง)` : ''}
                  </span>
                </button>
              )}
              <button
                className={styles.submitBtn}
                disabled={!selectedId}
                onClick={() => handleSelectImage(selectedId)}>
                ✅ ใช้ภาพนี้ สร้างคลิปเลย →
              </button>
            </div>
          </div>
        )}

        {/* ══════════ STAGE: GENERATING VIDEO ══════════ */}
        {stage === 'generating_video' && (
          <div className={styles.card} style={{textAlign:'center'}}>
            <div className={styles.spinner} />
            <h2 className={styles.title}>AI กำลังสร้างคลิป {duration}s...</h2>
            <div className={styles.videoStages}>
              {[
                { icon: '🤖', label: 'GPT เขียนสคริปต์' },
                { icon: '🎙️', label: 'สร้างเสียงพากย์' },
                { icon: '🎬', label: `Kling สร้าง motion ${duration === 15 ? '10s' : '10+10s'}` },
                { icon: '✂️', label: 'FFmpeg ตัดต่อ + ซับไตเติล' },
              ].map((s, i) => (
                <div key={i} className={styles.videoStageItem}>
                  <span>{s.icon}</span> {s.label}
                </div>
              ))}
            </div>
            <p className={styles.subtitle} style={{marginTop:20}}>ใช้เวลาประมาณ 2-3 นาที...</p>
          </div>
        )}

        {/* ══════════ STAGE: DONE ══════════ */}
        {stage === 'done' && videoResult && (
          <div className={styles.card}>
            <div className={styles.successBadge}>✅ คลิปของคุณพร้อมแล้ว!</div>
            <h2 className={styles.title}>{product}</h2>

            <video className={styles.videoPlayer} src={videoResult.video_url}
              controls autoPlay loop playsInline />

            <div className={styles.actions}>
              <a href={videoResult.video_url} download className={styles.actionBtn}>
                ⬇️ ดาวน์โหลดวิดีโอ
              </a>
              <button className={styles.actionBtnOutline}
                onClick={() => { navigator.clipboard.writeText(videoResult.hashtags?.join(' ') || ''); alert('คัดลอก hashtag แล้ว!') }}>
                # คัดลอก Hashtag
              </button>
            </div>

            {videoRedoLeft > 0 && (
              <button className={styles.regenBtn} onClick={handleRedoVideo}>
                🔄 ไม่พอใจ? สร้างคลิปใหม่จากภาพเดิม
                <span className={styles.regenNote}> (เหลือ {videoRedoLeft} ครั้ง)</span>
              </button>
            )}

            <button className={styles.newBtn}
              onClick={() => { setStage('form'); setProduct(''); setKeyPoints(''); setRefImages([]); setProjectId(null); setGenImages([]); setSelectedId(null); setVideoResult(null); setVideoRedoLeft(1) }}>
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
