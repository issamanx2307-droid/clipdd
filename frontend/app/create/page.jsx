'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './create.module.css'

const TONES = [
  { value: 'urgency', label: '🔥 เร่งด่วน', desc: 'FOMO สูง ปิดการขายเร็ว', color: '#ff4d00' },
  { value: 'review',  label: '⭐ รีวิว',    desc: 'สร้างความเชื่อใจ',        color: '#22c55e' },
  { value: 'drama',   label: '🎭 ดราม่า',   desc: 'เล่าเรื่อง ไวรัลง่าย',   color: '#a855f7' },
  { value: 'unbox',   label: '📦 Unboxing', desc: 'แกะกล่อง ตื่นเต้น',      color: '#f59e0b' },
]

const INITIAL_SCRIPT = {
  hook: '',
  body: ['', ''],
  cta: '',
  overlay: { hook_line: '', product_label: '', cta_line: '', hashtags: [] },
  scenes: [],
  hashtags: [],
}

function normalizeScriptForUI(data = {}) {
  return {
    ...INITIAL_SCRIPT,
    ...data,
    body: Array.isArray(data.body) && data.body.length ? data.body : INITIAL_SCRIPT.body,
    overlay: {
      ...INITIAL_SCRIPT.overlay,
      ...(data.overlay || {}),
      hashtags: Array.isArray(data.overlay?.hashtags)
        ? data.overlay.hashtags
        : (Array.isArray(data.hashtags) ? data.hashtags : []),
    },
    scenes: Array.isArray(data.scenes) ? data.scenes : [],
    hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
  }
}

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('cd_token')
}
function authHeaders() {
  const token = getToken()
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Token ${token}` } : {}) }
}

// ── Voice Selector (8 Botnoi speakers + preview) ─────────
const BOTNOI_VOICES = [
  { value: '1', emoji: '👩', label: 'อรนภา', desc: 'หญิง · สดใส' },
  { value: '2', emoji: '👩', label: 'นภสร',  desc: 'หญิง · นุ่มนวล' },
  { value: '3', emoji: '👨', label: 'ธนกร',  desc: 'ชาย · หนักแน่น' },
  { value: '4', emoji: '👨', label: 'ภูมิ',   desc: 'ชาย · ธรรมชาติ' },
  { value: '5', emoji: '👩', label: 'มินตรา', desc: 'หญิง · อ่อนโยน' },
  { value: '6', emoji: '👩', label: 'กัญญา',  desc: 'หญิง · สุภาพ' },
  { value: '7', emoji: '👨', label: 'วรวิทย์', desc: 'ชาย · มั่นคง' },
  { value: '8', emoji: '👨', label: 'สรวิชญ์', desc: 'ชาย · โฆษณา' },
]

function VoiceSelector({ voice, setVoice }) {
  const [previewing, setPreviewing] = useState(null) // speaker id being loaded
  const audioRef = useRef(null)

  async function handlePreview(e, spk) {
    e.stopPropagation()
    if (previewing === spk) return
    setPreviewing(spk)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('cd_token') : null
      const res = await fetch('/api/voice-preview/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Token ${token}` } : {}) },
        body: JSON.stringify({ speaker: spk }),
      })
      const data = await res.json()
      if (data.audio_url) {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
        const audio = new Audio(data.audio_url)
        audioRef.current = audio
        audio.play()
      }
    } catch {}
    finally { setPreviewing(null) }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
      {BOTNOI_VOICES.map(v => (
        <button key={v.value} type="button"
          onClick={() => setVoice(v.value)}
          style={{
            background: voice === v.value ? 'rgba(229,62,62,.15)' : '#111827',
            border: `1px solid ${voice === v.value ? '#E53E3E' : '#1e293b'}`,
            borderRadius: 10, padding: '10px 8px 8px',
            cursor: 'pointer', textAlign: 'center', position: 'relative',
            transition: 'border-color .15s',
          }}>
          <div style={{ fontSize: '1.3rem', marginBottom: 2 }}>{v.emoji}</div>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#e2e8f0' }}>{v.label}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 6 }}>{v.desc}</div>
          <div
            onClick={e => handlePreview(e, v.value)}
            style={{
              fontSize: '0.7rem', padding: '3px 8px', borderRadius: 6,
              background: previewing === v.value ? '#334155' : '#1e293b',
              color: '#94a3b8', cursor: 'pointer', display: 'inline-block',
            }}>
            {previewing === v.value ? '⏳' : '▶ ลองเสียง'}
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Editable text field ──────────────────────────────────
function EditableField({ label, value, onChange, hint, multiline, maxLen }) {
  const [editing, setEditing] = useState(false)
  return (
    <div className={styles.editField}>
      <div className={styles.editFieldHeader}>
        <span className={styles.editFieldLabel}>{label}</span>
        {maxLen && <span className={styles.editFieldCount}>{value.length}/{maxLen}</span>}
      </div>
      {editing ? (
        multiline
          ? <textarea className={styles.editTextarea} value={value}
              onChange={e => onChange(e.target.value)} autoFocus
              onBlur={() => setEditing(false)} rows={3} />
          : <input className={styles.editInput} value={value}
              onChange={e => onChange(maxLen ? e.target.value.slice(0, maxLen) : e.target.value)}
              autoFocus onBlur={() => setEditing(false)} />
      ) : (
        <div className={styles.editValue} onClick={() => setEditing(true)}>
          {value || <span className={styles.editPlaceholder}>(ว่าง)</span>}
          <span className={styles.editPencil}>✏️</span>
        </div>
      )}
      {hint && <div className={styles.editHint}>{hint}</div>}
    </div>
  )
}

// ── Image upload slot ──────────────────────────────────
function ImageUploadSlot({ label, hint, icon, file, onChange, onRemove }) {
  const ref = useRef(null)
  return (
    <div className={styles.uploadSlot}>
      <div className={styles.uploadSlotLabel}>{icon} {label}</div>
      {file ? (
        <div className={styles.uploadPreview} onClick={() => ref.current?.click()}>
          <img src={URL.createObjectURL(file)} alt="" className={styles.uploadPreviewImg} />
          <button type="button" className={styles.uploadRemove}
            onClick={e => { e.stopPropagation(); onRemove() }}>✕</button>
          <div className={styles.uploadChangeHint}>เปลี่ยนรูป</div>
        </div>
      ) : (
        <div className={styles.uploadEmpty} onClick={() => ref.current?.click()}>
          <div className={styles.uploadEmptyIcon}>📷</div>
          <div className={styles.uploadEmptyText}>คลิกเพื่ออัพโหลด</div>
          <div className={styles.uploadEmptyHint}>{hint}</div>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" hidden
        onChange={e => e.target.files[0] && onChange(e.target.files[0])} />
    </div>
  )
}

function CreateInner() {
  const params = useSearchParams()

  // Form state
  const [product, setProduct]       = useState(params?.get('product') || '')
  const [keyPoints, setKeyPoints]   = useState('')
  const [tone, setTone]             = useState('urgency')
  const [duration, setDuration]     = useState(15)
  const [voice, setVoice]           = useState('1')
  const [extraReq, setExtraReq]     = useState('')
  const [includePerson, setIncludePerson] = useState(true)
  const [productImg, setProductImg] = useState(null)
  const [personImg, setPersonImg]   = useState(null)

  // Script editing state
  const [script, setScript] = useState(INITIAL_SCRIPT)

  // Flow
  const [stage, setStage]           = useState('form')
  const [projectId, setProjectId]   = useState(null)
  const [videoResult, setVideoResult] = useState(null)
  const [error, setError]           = useState('')
  const [credits, setCredits]       = useState(null)
  const [isStaff, setIsStaff]       = useState(false)
  const [maintenance, setMaintenance] = useState(false)
  const pollRef                     = useRef(null)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      window.location.replace('/login?next=/create')
      return
    }

    try {
      const rawUser = localStorage.getItem('cd_user')
      if (rawUser) {
        const parsed = JSON.parse(rawUser)
        setCredits(typeof parsed?.credits === 'number' ? parsed.credits : null)
        setIsStaff(parsed?.is_staff === true)
      }
    } catch (error) {
      console.warn('Invalid cd_user in localStorage:', error)
      localStorage.removeItem('cd_user')
    }

    // Check live maintenance status from server
    fetch('/api/system-status/')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMaintenance(d.maintenance === true) })
      .catch(() => {})

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // ── Poll script generation ──
  function startScriptPoll(pid) {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/projects/${pid}/script/`, { headers: authHeaders() })
        const d = await r.json()
        if (d.status === 'awaiting_script_approval' && d.script?.hook) {
          clearInterval(pollRef.current)
          setScript(normalizeScriptForUI(d.script))
          setStage('awaiting_script_approval')
        } else if (d.status === 'failed') {
          clearInterval(pollRef.current)
          setError('สร้างสคริปต์ไม่สำเร็จ กรุณาลองใหม่')
          setStage('form')
        }
      } catch {}
    }, 2500)
  }

  // ── Poll video render ──
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
        } else if (d.project_status === 'failed') {
          clearInterval(pollRef.current)
          setError(d.error || 'สร้างวิดีโอไม่สำเร็จ')
          setStage('awaiting_script_approval')
        }
      } catch {}
    }, 4000)
  }

  // ── Submit form ──
  async function handleSubmit(e) {
    e.preventDefault()
    if (!product.trim()) { setError('กรุณาใส่ชื่อสินค้า'); return }
    setError('')

    const formData = new FormData()
    formData.append('name', product)
    formData.append('product_name', product)
    formData.append('key_points', keyPoints)
    formData.append('tone', tone)
    formData.append('voice', voice)
    formData.append('duration', duration)
    formData.append('include_person', includePerson ? 'true' : 'false')
    formData.append('extra_requirements', extraReq)
    if (productImg) formData.append('product_image', productImg)
    if (personImg)  formData.append('person_image', personImg)

    try {
      const res = await fetch('/api/projects/', {
        method: 'POST',
        headers: { Authorization: `Token ${getToken()}` },
        body: formData,
      })
      if (res.status === 401) { localStorage.removeItem('cd_token'); window.location.href = '/login?next=/create'; return }
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'เกิดข้อผิดพลาด') }
      const proj = await res.json()
      setProjectId(proj.id)
      setStage('generating_script')
      startScriptPoll(proj.id)
    } catch (err) {
      setError(err.message)
    }
  }

  // ── Approve script → start video ──
  async function handleApproveScript() {
    setError('')
    setStage('generating_video')
    const res = await fetch(`/api/projects/${projectId}/approve-script/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ script }),
    })
    if (res.ok) {
      startVideoPoll(projectId)
    } else {
      const d = await res.json()
      setError(d.detail || 'เกิดข้อผิดพลาด')
      setStage('awaiting_script_approval')
    }
  }

  // ── Redo (go back to script editing) ──
  async function handleRedo() {
    setVideoResult(null)
    const res = await fetch(`/api/projects/${projectId}/redo/`, {
      method: 'POST', headers: authHeaders(),
    })
    if (res.ok) setStage('awaiting_script_approval')
    else setStage('done')
  }

  // ── Script helpers ──
  function updateBody(i, val) {
    setScript(s => { const b = [...s.body]; b[i] = val; return { ...s, body: b } })
  }
  function updateOverlay(key, val) {
    setScript(s => ({ ...s, overlay: { ...s.overlay, [key]: val } }))
  }

  // ── STEP INDICATOR ──
  const STEPS = ['กรอกข้อมูล', 'ตรวจสอบข้อความ', 'AI สร้างคลิป', 'ได้คลิป']
  const stepIndex = { form: 0, generating_script: 1, awaiting_script_approval: 1, generating_video: 2, done: 3 }
  const currentStep = stepIndex[stage] ?? 0

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
            {STEPS.map((s, i) => {
              const done   = i < currentStep
              const active = i === currentStep
              return (
                <div key={s} className={`${styles.step} ${done ? styles.stepDone : active ? styles.stepActive : ''}`}>
                  <div className={styles.stepDot}>{done ? '✓' : i + 1}</div>
                  <span>{s}</span>
                </div>
              )
            })}
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {/* ══════════ MAINTENANCE BANNER ══════════ */}
        {maintenance && !isStaff && (
          <div style={{
            background: 'linear-gradient(135deg, #1a0a00, #2d1200)',
            border: '1px solid #92400e',
            borderRadius: 14,
            padding: '28px 32px',
            marginBottom: 24,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔧</div>
            <h2 style={{ margin: '0 0 10px', fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24' }}>
              ระบบอยู่ระหว่างการพัฒนา
            </h2>
            <p style={{ margin: 0, color: '#d97706', fontSize: '0.95rem', lineHeight: 1.6 }}>
              เรากำลังปรับปรุงระบบสร้างคลิปให้ดีขึ้น<br />
              เร็วๆ นี้จะเปิดให้ใช้งานได้เต็มรูปแบบ — ขอบคุณที่รอ! 🙏
            </p>
          </div>
        )}

        {/* ══════════ STAGE: FORM ══════════ */}
        {stage === 'form' && (
          <div className={styles.card}>
            <h1 className={styles.title}>สร้างคลิปขายของ</h1>
            <p className={styles.subtitle}>AI เขียนสคริปต์ให้ → คุณตรวจสอบ → AI สร้างคลิป</p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>ชื่อสินค้า *</label>
                <input className={styles.input} placeholder="เช่น ครีมหน้าใส SPF50, กระเป๋าผ้า"
                  value={product} onChange={e => setProduct(e.target.value)} required />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>จุดเด่นสินค้า <span className={styles.labelOptional}>(ไม่บังคับ)</span></label>
                <textarea className={styles.textarea} placeholder="เช่น ลดสิวใน 7 วัน, ส่งฟรี, ของแท้"
                  value={keyPoints} onChange={e => setKeyPoints(e.target.value)} rows={2} />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>สไตล์คลิป</label>
                <div className={styles.toneGrid}>
                  {TONES.map(t => (
                    <button key={t.value} type="button"
                      className={`${styles.toneBtn} ${tone === t.value ? styles.toneActive : ''}`}
                      style={tone === t.value ? { borderColor: t.color, boxShadow: `0 0 0 2px ${t.color}40` } : {}}
                      onClick={() => setTone(t.value)}>
                      <span className={styles.toneLabel}>{t.label}</span>
                      <span className={styles.toneDesc}>{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>รูปประกอบ <span className={styles.labelOptional}>(ไม่บังคับ)</span></label>
                <div className={styles.uploadRow}>
                  <ImageUploadSlot label="รูปสินค้า" hint="AI ใช้เป็นเฟรมเริ่มต้น" icon="🛍️"
                    file={productImg} onChange={setProductImg} onRemove={() => setProductImg(null)} />
                  <ImageUploadSlot label="รูปเจ้าของ/คน" hint="AI วิเคราะห์รูปลักษณ์" icon="👤"
                    file={personImg} onChange={setPersonImg} onRemove={() => setPersonImg(null)} />
                </div>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={includePerson}
                    onChange={e => setIncludePerson(e.target.checked)}
                  />
                  <span>ให้ AI ใส่คนในคลิปด้วย</span>
                </label>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>ความต้องการเพิ่มเติม <span className={styles.labelOptional}>(ไม่บังคับ)</span></label>
                <textarea className={styles.textarea}
                  placeholder="เช่น ฉากริมทะเล, เน้นสีชมพู, มีบรรยากาศหรูหรา"
                  value={extraReq} onChange={e => setExtraReq(e.target.value)} rows={2} />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>ความยาวคลิป</label>
                <div className={styles.durationPicker}>
                  <button type="button"
                    className={`${styles.durationBtn} ${styles.durationActive}`}>
                    <span className={styles.durationNum}>15s</span>
                    <span className={styles.durationDesc}>สั้น คม จุดใจ</span>
                  </button>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>เสียงพากย์ <span style={{fontWeight:400,color:'#64748b',fontSize:'0.78rem'}}>(กด ▶ ลองเสียง)</span></label>
                <VoiceSelector voice={voice} setVoice={setVoice} />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={credits === 0}>
                {credits === 0 ? '😔 เครดิตหมดแล้ว' : '✍️ ให้ AI เขียนสคริปต์ →'}
              </button>
            </form>
          </div>
        )}

        {/* ══════════ STAGE: GENERATING SCRIPT ══════════ */}
        {stage === 'generating_script' && (
          <div className={styles.card} style={{textAlign:'center'}}>
            <div className={styles.spinner} />
            <h2 className={styles.title}>AI กำลังเขียนสคริปต์...</h2>
            <p className={styles.subtitle}>GPT กำลังสร้างข้อความสำหรับคลิปของคุณ</p>
            <div className={styles.loadingDots}><span /><span /><span /></div>
          </div>
        )}

        {/* ══════════ STAGE: SCRIPT APPROVAL ══════════ */}
        {stage === 'awaiting_script_approval' && (
          <div className={styles.card}>
            <h2 className={styles.title}>✍️ ตรวจสอบและแก้ไขข้อความ</h2>
            <p className={styles.subtitle}>คลิกที่ข้อความเพื่อแก้ไข จากนั้นกด "สร้างคลิป"</p>

            <div className={styles.scriptSection}>
              <div className={styles.scriptSectionTitle}>🎙️ เสียงพากย์</div>
              <div className={styles.scriptHint}>ข้อความที่ AI จะพูดในคลิป</div>

              <EditableField label="ประโยคเปิด (Hook)" value={script.hook}
                onChange={v => setScript(s => ({ ...s, hook: v }))} multiline />

              {script.body.map((line, i) => (
                <EditableField key={i} label={`เนื้อหา ${i + 1}`} value={line}
                  onChange={v => updateBody(i, v)} multiline />
              ))}

              <EditableField label="ประโยคปิด (CTA)" value={script.cta}
                onChange={v => setScript(s => ({ ...s, cta: v }))} multiline />
            </div>

            <div className={styles.scriptSection}>
              <div className={styles.scriptSectionTitle}>📺 ข้อความบนหน้าจอ</div>
              <div className={styles.scriptHint}>ข้อความที่จะแสดงทับบนวิดีโอ</div>

              <EditableField label="Hook บนจอ" value={script.overlay.hook_line}
                onChange={v => updateOverlay('hook_line', v)} maxLen={20}
                hint="สั้น กระชับ ดึงดูด · สูงสุด 20 ตัวอักษร" />

              <EditableField label="ชื่อสินค้าบนจอ" value={script.overlay.product_label}
                onChange={v => updateOverlay('product_label', v)} maxLen={30} />

              <EditableField label="CTA บนจอ" value={script.overlay.cta_line}
                onChange={v => updateOverlay('cta_line', v)} maxLen={25}
                hint="เช่น กดตะกร้าด่วนเลย! · สูงสุด 25 ตัวอักษร" />
            </div>

            <div className={styles.scriptPreview}>
              <div className={styles.scriptPreviewLabel}>📢 ตัวอย่างเสียงพากย์:</div>
              <div className={styles.scriptPreviewText}>
                {[script.hook, ...script.body, script.cta].filter(Boolean).join(' ')}
              </div>
            </div>

            <button className={styles.submitBtn} onClick={handleApproveScript}>
              🎬 ยืนยัน → สร้างคลิปเลย
            </button>
          </div>
        )}

        {/* ══════════ STAGE: GENERATING VIDEO ══════════ */}
        {stage === 'generating_video' && (
          <div className={styles.card} style={{textAlign:'center'}}>
            <div className={styles.spinner} />
            <h2 className={styles.title}>AI กำลังสร้างคลิป...</h2>
            <div className={styles.videoStages}>
              {[
                { icon: '🎙️', label: 'สร้างเสียงพากย์จากข้อความที่คุณยืนยัน' },
                { icon: '🎬', label: 'Kling v2.0 สร้างวิดีโอ AI cinematic' },
                { icon: '✂️', label: 'FFmpeg ตัดต่อ + overlay + ซับไตเติล' },
              ].map((s, i) => (
                <div key={i} className={styles.videoStageItem}>
                  <span>{s.icon}</span> {s.label}
                </div>
              ))}
            </div>
            <p className={styles.subtitle} style={{marginTop:20}}>ใช้เวลาประมาณ 3-5 นาที...</p>
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

            <button className={styles.regenBtn} onClick={handleRedo}>
              ✏️ แก้ไขข้อความ แล้วสร้างคลิปใหม่
            </button>

            <button className={styles.newBtn}
              onClick={() => {
                setStage('form'); setProduct(''); setKeyPoints(''); setExtraReq('')
                setIncludePerson(true); setScript(INITIAL_SCRIPT)
                setProductImg(null); setPersonImg(null); setProjectId(null); setVideoResult(null)
              }}>
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
