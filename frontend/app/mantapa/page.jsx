'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './page.module.css'

const API = '/api'

function getAdminToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('cd_admin_token')
}
function setAdminToken(t) { localStorage.setItem('cd_admin_token', t) }
function clearAdminToken() { localStorage.removeItem('cd_admin_token') }

// ──────────────────────────────────────────────
// Login Gate
// ──────────────────────────────────────────────
function LoginGate({ onAuth }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setErr('')
    try {
      const res = await fetch(`${API}/admin-api/dashboard/`, { headers: { 'X-Admin-Token': pw } })
      if (res.ok) { setAdminToken(pw); onAuth(pw) }
      else setErr('รหัสผ่านไม่ถูกต้อง')
    } catch { setErr('เชื่อมต่อไม่ได้') }
    finally { setLoading(false) }
  }

  return (
    <div className={styles.loginWrap}>
      <form className={styles.loginBox} onSubmit={submit}>
        <div className={styles.loginLogo}>🛡️</div>
        <h1 className={styles.loginTitle}>ClipDD Admin</h1>
        <input className={styles.loginInput} type="password" placeholder="Admin Password"
          value={pw} onChange={e => setPw(e.target.value)} autoFocus />
        {err && <p className={styles.loginErr}>{err}</p>}
        <button className={styles.loginBtn} type="submit" disabled={loading || !pw}>
          {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  )
}

// ──────────────────────────────────────────────
// Stat Card
// ──────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statBody}>
        <div className={styles.statValue}>{value ?? '—'}</div>
        <div className={styles.statLabel}>{label}</div>
        {sub && <div className={`${styles.statSub} ${accent ? styles.statSubAccent : ''}`}>{sub}</div>}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Credits Section
// ──────────────────────────────────────────────
function CreditsSection({ token }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const res = await fetch(`${API}/admin-api/credits/`, { headers: { 'X-Admin-Token': token } })
      if (res.ok) {
        setData(await res.json())
      } else {
        const body = await res.text()
        setErr(`HTTP ${res.status}: ${body.slice(0, 120)}`)
      }
    } catch (e) {
      setErr(`เชื่อมต่อไม่ได้: ${e.message}`)
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  function CreditCard({ name, icon, children, statusOk }) {
    return (
      <div className={`${styles.creditCard} ${statusOk ? '' : styles.creditCardErr}`}>
        <div className={styles.creditHeader}>
          <span className={styles.creditIcon}>{icon}</span>
          <span className={styles.creditName}>{name}</span>
          <span className={`${styles.creditDot} ${statusOk ? styles.creditDotOk : styles.creditDotErr}`} />
        </div>
        <div className={styles.creditBody}>{children}</div>
      </div>
    )
  }

  if (loading) return <div className={styles.loading}>กำลังดึง API Credits...</div>
  if (err) return (
    <div className={styles.creditsSection}>
      <h2 className={styles.sectionTitle}>💳 API Credits</h2>
      <div className={styles.creditErrBox}>
        ❌ โหลดข้อมูลไม่ได้: {err}
        <button className={styles.refreshBtn} onClick={load} style={{ marginTop: 12 }}>↻ ลองใหม่</button>
      </div>
    </div>
  )
  if (!data) return (
    <div className={styles.creditsSection}>
      <h2 className={styles.sectionTitle}>💳 API Credits</h2>
      <div className={styles.loading}>ไม่มีข้อมูล — ตรวจสอบ token หรือ server logs</div>
      <button className={styles.refreshBtn} onClick={load}>↻ ลองใหม่</button>
    </div>
  )

  const openai = data.openai || {}
  const fal = data.fal || {}
  const gemini = data.gemini || {}
  const botnoi = data.botnoi || {}

  return (
    <div className={styles.creditsSection}>
      <h2 className={styles.sectionTitle}>💳 API Credits</h2>
      <div className={styles.creditsGrid}>
        <CreditCard name="OpenAI" icon="🤖" statusOk={openai.status === 'ok'}>
          {openai.status === 'ok' && openai.remaining_usd != null && <>
            <div className={styles.creditAmount}>${Number(openai.remaining_usd).toFixed(2)}</div>
            <div className={styles.creditDetail}>คงเหลือ / จาก ${Number(openai.hard_limit_usd).toFixed(2)}</div>
            <div className={styles.creditBar}>
              <div className={styles.creditBarFill} style={{ width: `${Math.min(100, (openai.remaining_usd / (openai.hard_limit_usd || 1)) * 100)}%` }} />
            </div>
            <div className={styles.creditUsed}>ใช้ไปเดือนนี้ ${Number(openai.monthly_usage_usd || 0).toFixed(4)}</div>
          </>}
          {openai.status === 'ok' && openai.remaining_usd == null && openai.monthly_usage_usd != null && <>
            <div className={styles.creditAmount}>${Number(openai.monthly_usage_usd).toFixed(4)}</div>
            <div className={styles.creditDetail}>ใช้ไปเดือนนี้ ({openai.period})</div>
            <div className={styles.creditDetail} style={{ marginTop: 4, fontSize: 11, opacity: 0.7 }}>ดูยอดคงเหลือที่ platform.openai.com</div>
          </>}
          {openai.status === 'ok' && openai.remaining_usd == null && openai.monthly_usage_usd == null && <>
            <div className={styles.creditAmount}>✅</div>
            <div className={styles.creditDetail}>{openai.note}</div>
          </>}
          {openai.status === 'error' && <div className={styles.creditErr}>{openai.detail}</div>}
        </CreditCard>

        <CreditCard name="Fal.ai" icon="⚡" statusOk={fal.status === 'ok'}>
          {fal.status === 'ok' && fal.balance != null && <>
            <div className={styles.creditAmount}>${Number(fal.balance).toFixed(2)}</div>
            <div className={styles.creditDetail}>คงเหลือ ({fal.currency || 'USD'})</div>
          </>}
          {fal.status === 'ok' && fal.balance == null && <>
            <div className={styles.creditAmount}>✅</div>
            <div className={styles.creditDetail}>{fal.note}</div>
          </>}
          {fal.status === 'error' && <div className={styles.creditErr}>{fal.detail}</div>}
        </CreditCard>

        <CreditCard name="Gemini" icon="✨" statusOk={gemini.status === 'active'}>
          {gemini.key_valid ? <>
            <div className={styles.creditAmount}>{gemini.model}</div>
            <div className={styles.creditDetail}>{gemini.note}</div>
          </> : <div className={styles.creditErr}>{gemini.detail}</div>}
        </CreditCard>

        <CreditCard name="Botnoi TTS" icon="🗣️" statusOk={botnoi.status === 'ok'}>
          {botnoi.status === 'ok' && <>
            <div className={styles.creditAmount}>✅ ใช้งานได้</div>
            {botnoi.rate_remaining != null && <>
              <div className={styles.creditDetail}>Rate limit: {botnoi.rate_remaining}/{botnoi.rate_limit} req/min</div>
              <div className={styles.creditBar}>
                <div className={styles.creditBarFill} style={{ width: `${Math.min(100, (Number(botnoi.rate_remaining) / Number(botnoi.rate_limit || 1)) * 100)}%`, background: '#f59e0b' }} />
              </div>
            </>}
            <div className={styles.creditDetail} style={{ marginTop: 6 }}>{botnoi.note}</div>
          </>}
          {botnoi.status === 'error' && <div className={styles.creditErr}>{botnoi.detail}</div>}
        </CreditCard>
      </div>
      <button className={styles.refreshBtn} onClick={load}>↻ Refresh</button>
    </div>
  )
}

// ──────────────────────────────────────────────
// Admin AI Chat Widget (floating)
// ──────────────────────────────────────────────
function AdminChatWidget({ token }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'สวัสดีครับ 🛡️ ผมคือ Admin AI\n\nถามได้เลย เช่น:\n• "วันนี้มี project failed ไหม?"\n• "user ใหม่กี่คน?"\n• "มี chat รอ escalate ไหม?"' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [open, messages])

  async function send(e) {
    e?.preventDefault()
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    const history = messages.slice(1).map(m => ({ role: m.role === 'ai' ? 'model' : 'user', content: m.content }))
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)
    try {
      const res = await fetch(`${API}/admin-api/ai-chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify({ message: userMsg, history }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'ai', content: data.reply || 'ขออภัย เกิดข้อผิดพลาด' }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: 'ขออภัย เชื่อมต่อไม่ได้' }])
    } finally { setLoading(false) }
  }

  return (
    <>
      {open && (
        <div className={styles.adminChatWindow}>
          <div className={styles.adminChatHeader}>
            <div className={styles.adminChatHeaderLeft}>
              <span className={styles.adminChatAvatar}>🛡️</span>
              <div>
                <div className={styles.adminChatTitle}>Admin AI</div>
                <div className={styles.adminChatSub}>ถามเรื่องระบบได้เลย</div>
              </div>
            </div>
            <button className={styles.adminChatClose} onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className={styles.adminChatMessages}>
            {messages.map((m, i) => (
              <div key={i} className={`${styles.adminChatMsg} ${m.role === 'user' ? styles.adminChatMsgUser : styles.adminChatMsgAI}`}>
                {m.role === 'ai' && <span className={styles.adminChatMsgIcon}>🛡️</span>}
                <div className={styles.adminChatBubble}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className={`${styles.adminChatMsg} ${styles.adminChatMsgAI}`}>
                <span className={styles.adminChatMsgIcon}>🛡️</span>
                <div className={styles.adminChatBubble}><span className={styles.typing}><span /><span /><span /></span></div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form className={styles.adminChatInput} onSubmit={send}>
            <input
              placeholder="ถามเรื่องระบบ..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              autoFocus={open}
            />
            <button type="submit" disabled={!input.trim() || loading}>➤</button>
          </form>
        </div>
      )}
      <button className={`${styles.adminChatBubble} ${open ? styles.adminChatBubbleOpen : ''}`} onClick={() => setOpen(o => !o)}>
        {open ? '✕' : '🛡️'}
      </button>
    </>
  )
}

// ──────────────────────────────────────────────
// Chat Detail Panel
// ──────────────────────────────────────────────
function ChatDetail({ sessionId, token, onBack }) {
  const [data, setData] = useState(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const load = useCallback(async () => {
    const res = await fetch(`${API}/admin-api/chats/${sessionId}/`, { headers: { 'X-Admin-Token': token } })
    if (res.ok) setData(await res.json())
  }, [sessionId, token])

  useEffect(() => { load() }, [load])
  useEffect(() => { const iv = setInterval(load, 5000); return () => clearInterval(iv) }, [load])
  useEffect(() => { setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100) }, [data])

  async function sendReply(e) {
    e.preventDefault()
    if (!reply.trim() || sending) return
    setSending(true)
    await fetch(`${API}/admin-api/chats/${sessionId}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
      body: JSON.stringify({ content: reply }),
    })
    setReply(''); setSending(false); load()
  }

  async function releaseAI() {
    await fetch(`${API}/admin-api/chats/${sessionId}/release/`, { method: 'POST', headers: { 'X-Admin-Token': token } })
    load()
  }

  if (!data) return <div className={styles.loading}>กำลังโหลด...</div>

  return (
    <div className={styles.detailWrap}>
      <div className={styles.detailHeader}>
        <button className={styles.backBtn} onClick={onBack}>← กลับ</button>
        <div className={styles.detailUser}>
          <strong>{data.user_name || data.user_email}</strong>
          <span className={styles.emailTag}>{data.user_email}</span>
        </div>
        {data.human_takeover ? (
          <div className={styles.detailActions}>
            <span className={styles.tagHuman}>👤 Human Mode</span>
            <button className={styles.releaseBtn} onClick={releaseAI}>🤖 คืน AI</button>
          </div>
        ) : (
          <span className={styles.tagAI}>🤖 AI Mode</span>
        )}
      </div>

      <div className={styles.msgList}>
        {data.messages.map(m => (
          <div key={m.id} className={`${styles.msgRow} ${m.role === 'user' ? styles.msgRowUser : m.role === 'admin' ? styles.msgRowAdmin : styles.msgRowAI}`}>
            <div className={styles.msgMeta}>
              <span>{m.role === 'user' ? '👤' : m.role === 'admin' ? '🛡️' : '🤖'}</span>
              <span className={styles.msgTime}>{new Date(m.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
              {m.escalate && <span className={styles.escalateTag}>⚠️ Escalate</span>}
            </div>
            <div className={`${styles.msgBubble} ${m.escalate ? styles.msgBubbleEscalate : ''}`}>{m.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className={styles.replyRow} onSubmit={sendReply}>
        <textarea className={styles.replyInput} placeholder="พิมพ์ข้อความตอบกลับ..." value={reply}
          onChange={e => setReply(e.target.value)} rows={2}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e) } }} />
        <button className={styles.replyBtn} type="submit" disabled={!reply.trim() || sending}>
          {sending ? '...' : '➤ ส่ง'}
        </button>
      </form>
    </div>
  )
}

// ──────────────────────────────────────────────
// Chat List
// ──────────────────────────────────────────────
function ChatList({ token, onSelect }) {
  const [chats, setChats] = useState([])
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    const res = await fetch(`${API}/admin-api/chats/?filter=${filter}`, { headers: { 'X-Admin-Token': token } })
    if (res.ok) setChats(await res.json())
  }, [token, filter])

  useEffect(() => { load() }, [load])
  useEffect(() => { const iv = setInterval(load, 5000); return () => clearInterval(iv) }, [load])

  const filters = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'escalated', label: '👤 รอแอดมิน' },
    { key: 'unread', label: '🔴 ยังไม่อ่าน' },
  ]

  return (
    <div className={styles.chatListWrap}>
      <div className={styles.chatListTop}>
        <h2 className={styles.sectionTitle}>💬 Chat Sessions</h2>
        <div className={styles.filterTabs}>
          {filters.map(f => (
            <button key={f.key} className={`${styles.filterTab} ${filter === f.key ? styles.filterTabActive : ''}`}
              onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </div>
      </div>
      {chats.length === 0 && <p className={styles.empty}>ไม่มีการแชท</p>}
      {chats.map(c => (
        <div key={c.id} className={`${styles.chatItem} ${c.human_takeover ? styles.chatItemEscalated : ''}`} onClick={() => onSelect(c.id)}>
          <div className={styles.chatItemTop}>
            <span className={styles.chatName}>{c.user_name || c.user_email}</span>
            <span className={styles.chatTime}>{new Date(c.last_message_at).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className={styles.chatItemBot}>
            <span className={styles.chatPreview}>
              {c.last_role === 'user' ? '👤' : c.last_role === 'admin' ? '🛡️' : '🤖'} {c.last_message?.slice(0, 60)}{c.last_message?.length > 60 ? '...' : ''}
            </span>
            <div className={styles.chatBadges}>
              {c.human_takeover && <span className={styles.badgeHuman}>👤</span>}
              {c.admin_unread > 0 && <span className={styles.badgeUnread}>{c.admin_unread}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────
// Demo Clips Upload
// ──────────────────────────────────────────────
const DEMO_SLOTS = [
  { id: 'urgent', label: '⚡ เร่งด่วน',  desc: 'Flash Sale / FOMO สูง',     spot: 'Hero + Demo section' },
  { id: 'review', label: '⭐ รีวิว',     desc: 'น่าเชื่อถือ มืออาชีพ',       spot: 'Hero + Demo section' },
  { id: 'drama',  label: '😱 ดราม่า',   desc: 'Before/After อารมณ์แรง',    spot: 'Hero + Demo section' },
  { id: 'unbox',  label: '📦 Unboxing', desc: 'แกะกล่อง reveal',           spot: 'Hero + Demo section' },
]

function DemoClipsSection({ token }) {
  const [clips, setClips] = useState({})
  const [uploading, setUploading] = useState(null)   // slot id being uploaded
  const [msg, setMsg] = useState(null)               // { type:'ok'|'err', text }

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin-api/demo-clips/`, { headers: { 'X-Admin-Token': token } })
      if (res.ok) setClips(await res.json())
    } catch {}
  }, [token])

  useEffect(() => { load() }, [load])

  async function upload(slot, file) {
    if (!file) return
    setUploading(slot)
    setMsg(null)
    const fd = new FormData()
    fd.append('slot', slot)
    fd.append('file', file)
    try {
      const res = await fetch(`${API}/admin-api/demo-clips/`, {
        method: 'POST',
        headers: { 'X-Admin-Token': token },
        body: fd,
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: 'ok', text: `✅ ${data.slot} อัปโหลดสำเร็จ (${data.size_kb} KB)` })
        load()
      } else {
        setMsg({ type: 'err', text: `❌ ${data.detail}` })
      }
    } catch (e) {
      setMsg({ type: 'err', text: `❌ เชื่อมต่อไม่ได้` })
    } finally {
      setUploading(null)
    }
  }

  function fmt(ts) {
    if (!ts) return ''
    return new Date(ts * 1000).toLocaleString('th-TH', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
  }

  return (
    <div className={styles.demoClipsSection}>
      <div className={styles.demoClipsHeader}>
        <h2 className={styles.sectionTitle}>🎬 Demo Clips</h2>
        <p className={styles.demoClipsNote}>คลิปที่แสดงในหน้า Landing Page (Hero + Demo Section) — อัปโหลด .mp4 เพื่อแทนที่</p>
      </div>

      {msg && (
        <div className={`${styles.demoMsg} ${msg.type === 'ok' ? styles.demoMsgOk : styles.demoMsgErr}`}>
          {msg.text}
        </div>
      )}

      <div className={styles.demoClipsGrid}>
        {DEMO_SLOTS.map(slot => {
          const info = clips[slot.id] || {}
          const isUploading = uploading === slot.id
          return (
            <div key={slot.id} className={styles.demoClipCard}>
              <div className={styles.demoClipTop}>
                <span className={styles.demoClipLabel}>{slot.label}</span>
                <span className={styles.demoClipDesc}>{slot.desc}</span>
              </div>

              {/* Preview */}
              {info.exists ? (
                <video
                  key={info.updated_ts}
                  src={`${info.url}?t=${info.updated_ts}`}
                  className={styles.demoClipPreview}
                  muted autoPlay loop playsInline
                />
              ) : (
                <div className={styles.demoClipEmpty}>ยังไม่มีคลิป</div>
              )}

              {/* Info */}
              <div className={styles.demoClipInfo}>
                {info.exists && <>
                  <span>{info.size_kb} KB</span>
                  <span>{fmt(info.updated_ts)}</span>
                </>}
                <span className={styles.demoClipSpot}>{slot.spot}</span>
              </div>

              {/* Upload */}
              <label className={`${styles.demoUploadBtn} ${isUploading ? styles.demoUploadBtnLoading : ''}`}>
                {isUploading ? '⏳ กำลังอัปโหลด...' : '📤 อัปโหลดคลิปใหม่'}
                <input
                  type="file"
                  accept="video/mp4"
                  style={{ display: 'none' }}
                  disabled={!!uploading}
                  onChange={e => upload(slot.id, e.target.files?.[0])}
                />
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Site Editor
// ──────────────────────────────────────────────
function SiteEditor({ token }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)   // key being saved
  const [msg, setMsg] = useState(null)         // { type, text }
  const [section, setSection] = useState('hero')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin-api/site-content/`, { headers: { 'X-Admin-Token': token } })
      if (res.ok) setData(await res.json())
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  async function save(key, content) {
    setSaving(key); setMsg(null)
    try {
      const res = await fetch(`${API}/admin-api/site-content/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify({ key, content }),
      })
      const d = await res.json()
      if (res.ok) {
        setMsg({ type: 'ok', text: `✅ บันทึก "${key}" สำเร็จ` })
        load()
      } else {
        setMsg({ type: 'err', text: `❌ ${d.detail}` })
      }
    } catch { setMsg({ type: 'err', text: '❌ เชื่อมต่อไม่ได้' }) }
    finally { setSaving(null) }
  }

  async function resetKey(key) {
    if (!confirm(`รีเซ็ต "${key}" กลับเป็นค่าเริ่มต้น?`)) return
    setSaving(key); setMsg(null)
    try {
      const res = await fetch(`${API}/admin-api/site-content/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify({ key }),
      })
      const d = await res.json()
      if (res.ok) { setMsg({ type: 'ok', text: `✅ ${d.detail}` }); load() }
      else setMsg({ type: 'err', text: `❌ ${d.detail}` })
    } catch { setMsg({ type: 'err', text: '❌ เชื่อมต่อไม่ได้' }) }
    finally { setSaving(null) }
  }

  if (loading) return <div className={styles.loading}>กำลังโหลด...</div>
  if (!data) return null

  const sections = [
    { key: 'hero', label: '🦸 Hero' },
    { key: 'stats', label: '📊 Stats' },
    { key: 'deals', label: '🛒 Deals' },
    { key: 'articles', label: '📖 Articles' },
    { key: 'thumbnails', label: '🖼️ Thumbnails' },
  ]

  return (
    <div className={styles.siteEditorWrap}>
      <div className={styles.siteEditorHeader}>
        <h2 className={styles.sectionTitle}>🌐 แก้ไขหน้าเว็บ</h2>
        <p className={styles.siteEditorNote}>แก้ไขเนื้อหาที่แสดงบนหน้าแรก — มีผลทันทีหลังบันทึก</p>
      </div>

      {msg && (
        <div className={`${styles.demoMsg} ${msg.type === 'ok' ? styles.demoMsgOk : styles.demoMsgErr}`}>
          {msg.text}
        </div>
      )}

      <div className={styles.siteEditorTabs}>
        {sections.map(s => (
          <button key={s.key}
            className={`${styles.siteEditorTab} ${section === s.key ? styles.siteEditorTabActive : ''}`}
            onClick={() => setSection(s.key)}>
            {s.label}
            {data[s.key]?.is_custom && <span className={styles.customDot} title="แก้ไขแล้ว">●</span>}
          </button>
        ))}
      </div>

      {section === 'hero' && (
        <HeroEditor content={data.hero?.content} saving={saving === 'hero'}
          onSave={c => save('hero', c)} onReset={() => resetKey('hero')} />
      )}
      {section === 'stats' && (
        <StatsEditor content={data.stats?.content} saving={saving === 'stats'}
          onSave={c => save('stats', c)} onReset={() => resetKey('stats')} />
      )}
      {section === 'deals' && (
        <ListEditor contentKey="deals" content={data.deals?.content} saving={saving === 'deals'}
          onSave={c => save('deals', c)} onReset={() => resetKey('deals')}
          fields={[
            { key:'emoji', label:'Emoji', placeholder:'💡' },
            { key:'title', label:'ชื่อสินค้า', placeholder:'ไฟ Ring Light' },
            { key:'desc', label:'คำอธิบาย', placeholder:'แสงสวย...' },
            { key:'price', label:'ราคา', placeholder:'฿299' },
            { key:'badge', label:'Badge', placeholder:'ขายดี' },
            { key:'url', label:'URL', placeholder:'/deals' },
          ]}
          newItem={{ emoji:'🆕', title:'', desc:'', price:'', badge:'', bg:'linear-gradient(135deg,#FFF7ED,#FED7AA)', url:'/deals' }}
        />
      )}
      {section === 'articles' && (
        <ListEditor contentKey="articles" content={data.articles?.content} saving={saving === 'articles'}
          onSave={c => save('articles', c)} onReset={() => resetKey('articles')}
          fields={[
            { key:'cat', label:'หมวดหมู่', placeholder:'เทคนิค TikTok' },
            { key:'catColor', label:'สี Badge', placeholder:'#FF7A00' },
            { key:'title', label:'หัวข้อบทความ', placeholder:'10 วิธี...' },
            { key:'excerpt', label:'บทย่อ', placeholder:'เทคนิคที่...' },
            { key:'readTime', label:'เวลาอ่าน', placeholder:'5 นาที' },
            { key:'url', label:'URL', placeholder:'/articles/slug' },
          ]}
          newItem={{ cat:'', catColor:'#FF7A00', bg:'linear-gradient(135deg,#FFF7ED,#FED7AA)', title:'', excerpt:'', readTime:'5 นาที', url:'/articles' }}
        />
      )}
      {section === 'thumbnails' && <ThumbnailManager token={token} />}
    </div>
  )
}

// ─── Thumbnail Manager ─────────────────────────────────────────────
function ThumbnailManager({ token }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [caption, setCaption] = useState('')
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin-api/clip-thumbnails/`, { headers: { 'X-Admin-Token': token } })
      if (res.ok) setItems(await res.json())
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  async function upload(e) {
    e.preventDefault()
    const file = fileRef.current?.files[0]
    if (!file) return
    setUploading(true); setMsg(null)
    const fd = new FormData()
    fd.append('image', file)
    fd.append('title', caption.trim())
    try {
      const res = await fetch(`${API}/admin-api/clip-thumbnails/`, {
        method: 'POST',
        headers: { 'X-Admin-Token': token },
        body: fd,
      })
      const d = await res.json()
      if (res.ok) {
        setMsg({ ok: true, text: '✅ อัปโหลดสำเร็จ' })
        if (fileRef.current) fileRef.current.value = ''
        setCaption('')
        load()
      } else {
        setMsg({ ok: false, text: `❌ ${d.detail}` })
      }
    } catch { setMsg({ ok: false, text: '❌ เชื่อมต่อไม่ได้' }) }
    finally { setUploading(false) }
  }

  async function del(id) {
    if (!confirm('ลบรูปนี้?')) return
    try {
      const res = await fetch(`${API}/admin-api/clip-thumbnails/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify({ id }),
      })
      const d = await res.json()
      if (res.ok) { setMsg({ ok: true, text: '✅ ลบสำเร็จ' }); load() }
      else setMsg({ ok: false, text: `❌ ${d.detail}` })
    } catch { setMsg({ ok: false, text: '❌ เชื่อมต่อไม่ได้' }) }
  }

  return (
    <div className={styles.thumbManager}>
      <h3 className={styles.thumbManagerTitle}>🖼️ รวมคลิปขำๆ — Thumbnails</h3>
      <p className={styles.siteEditorNote}>อัปโหลดได้สูงสุด 20 รูป — หน้าเว็บจะสุ่มแสดง 6 รูปทุก refresh</p>

      {msg && (
        <div className={`${styles.demoMsg} ${msg.ok ? styles.demoMsgOk : styles.demoMsgErr}`} style={{ marginBottom: 16 }}>
          {msg.text}
        </div>
      )}

      <form className={styles.thumbUploadForm} onSubmit={upload}>
        <input
          type="text"
          className={styles.thumbCaptionInput}
          placeholder="คำบรรยาย (ไม่บังคับ)"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          maxLength={200}
        />
        <div className={styles.thumbUploadRow}>
          <input ref={fileRef} type="file" accept="video/mp4,video/mov,video/webm,video/quicktime,image/jpeg,image/png,image/gif,image/webp" className={styles.thumbFileInput} required />
          <button className={styles.thumbUploadBtn} type="submit" disabled={uploading}>
            {uploading ? 'กำลังอัป...' : '+ อัปโหลด'}
          </button>
        </div>
        <p className={styles.thumbFormatHint}>วิดีโอ: MP4 · MOV · WEBM &nbsp;|&nbsp; รูปภาพ: JPG · PNG · GIF · WEBP</p>
      </form>

      <div className={styles.thumbCount}>{items.length} / 20 รูป</div>

      {loading ? <div className={styles.loading}>กำลังโหลด...</div> : (
        <div className={styles.thumbGrid}>
          {items.length === 0 && (
            <p className={styles.siteEditorNote}>ยังไม่มีรูป — อัปโหลดด้านบนได้เลย</p>
          )}
          {items.map(t => (
            <div key={t.id} className={styles.thumbItem}>
              {t.file_type === 'video'
                ? <video src={t.file_url} className={styles.thumbItemImg} muted playsInline preload="metadata" />
                : <img src={t.file_url} alt="" className={styles.thumbItemImg} />
              }
              <div className={styles.thumbItemInfo}>
                <span className={styles.thumbItemCat}>{t.file_type === 'video' ? '🎬 วิดีโอ' : '🖼️ รูปภาพ'}</span>
                {t.title && <span className={styles.thumbItemCaption}>{t.title}</span>}
              </div>
              <button className={styles.thumbDeleteBtn} onClick={() => del(t.id)} title="ลบ">🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HeroEditor({ content, saving, onSave, onReset }) {
  const [form, setForm] = useState(content || {})
  useEffect(() => { if (content) setForm(content) }, [content])
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const fields = [
    { key:'badge', label:'Badge Text', ph:'มีร้านค้าใช้งานแล้ว 1,000+ ร้าน' },
    { key:'title_line1', label:'หัวข้อบรรทัด 1', ph:'สร้างคลิปขายของ' },
    { key:'title_accent', label:'หัวข้อ Accent (สีส้ม)', ph:'TikTok อัตโนมัติ' },
    { key:'title_sub', label:'หัวข้อย่อย', ph:'ด้วย AI ใน 60 วินาที' },
    { key:'desc', label:'คำอธิบาย', ph:'ใส่สินค้า → AI เขียนสคริปต์...', multiline: true },
    { key:'cta_primary', label:'ปุ่มหลัก', ph:'สมัครฟรี — ลองสร้าง 1 คลิป' },
    { key:'cta_secondary', label:'ปุ่มรอง', ph:'เข้าระบบสร้างคลิป →' },
    { key:'note', label:'หมายเหตุใต้ปุ่ม', ph:'✓ ฟรี 1 คลิปแรก · ✓ ไม่ต้องบัตรเครดิต...' },
  ]

  return (
    <div className={styles.editorBlock}>
      {fields.map(f => (
        <div key={f.key} className={styles.editorField}>
          <label className={styles.editorLabel}>{f.label}</label>
          {f.multiline ? (
            <textarea className={styles.editorTextarea} rows={3} placeholder={f.ph}
              value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} />
          ) : (
            <input className={styles.editorInput} type="text" placeholder={f.ph}
              value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} />
          )}
        </div>
      ))}
      <div className={styles.editorActions}>
        <button className={styles.editorSave} onClick={() => onSave(form)} disabled={saving}>
          {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก Hero'}
        </button>
        <button className={styles.editorReset} onClick={onReset} disabled={saving}>↺ รีเซ็ต</button>
      </div>
    </div>
  )
}

function StatsEditor({ content, saving, onSave, onReset }) {
  const [rows, setRows] = useState(content || [])
  useEffect(() => { if (content) setRows(content) }, [content])
  const setRow = (i, k, v) => setRows(r => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row))

  return (
    <div className={styles.editorBlock}>
      {rows.map((row, i) => (
        <div key={i} className={styles.editorRow}>
          <div className={styles.editorField} style={{ flex: '0 0 140px' }}>
            <label className={styles.editorLabel}>ตัวเลข {i + 1}</label>
            <input className={styles.editorInput} value={row.value || ''} placeholder="1,000+"
              onChange={e => setRow(i, 'value', e.target.value)} />
          </div>
          <div className={styles.editorField} style={{ flex: 1 }}>
            <label className={styles.editorLabel}>ป้ายกำกับ</label>
            <input className={styles.editorInput} value={row.label || ''} placeholder="ร้านค้าใช้งาน"
              onChange={e => setRow(i, 'label', e.target.value)} />
          </div>
        </div>
      ))}
      <div className={styles.editorActions}>
        <button className={styles.editorSave} onClick={() => onSave(rows)} disabled={saving}>
          {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก Stats'}
        </button>
        <button className={styles.editorReset} onClick={onReset} disabled={saving}>↺ รีเซ็ต</button>
      </div>
    </div>
  )
}

function ListEditor({ content, saving, onSave, onReset, fields, newItem }) {
  const [items, setItems] = useState(content || [])
  useEffect(() => { if (content) setItems(content) }, [content])

  const setField = (i, k, v) => setItems(arr => arr.map((item, idx) => idx === i ? { ...item, [k]: v } : item))
  const remove = (i) => setItems(arr => arr.filter((_, idx) => idx !== i))
  const add = () => setItems(arr => [...arr, { ...newItem, id: Date.now() }])

  return (
    <div className={styles.editorBlock}>
      {items.map((item, i) => (
        <div key={item.id || i} className={styles.listEditorCard}>
          <div className={styles.listEditorCardTop}>
            <span className={styles.listEditorIdx}>#{i + 1}</span>
            <button className={styles.listEditorDel} onClick={() => remove(i)}>🗑 ลบ</button>
          </div>
          <div className={styles.listEditorFields}>
            {fields.map(f => (
              <div key={f.key} className={styles.editorField}>
                <label className={styles.editorLabel}>{f.label}</label>
                <input className={styles.editorInput} placeholder={f.placeholder}
                  value={item[f.key] || ''} onChange={e => setField(i, f.key, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button className={styles.listEditorAdd} onClick={add}>+ เพิ่มรายการ</button>
      <div className={styles.editorActions}>
        <button className={styles.editorSave} onClick={() => onSave(items)} disabled={saving}>
          {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
        </button>
        <button className={styles.editorReset} onClick={onReset} disabled={saving}>↺ รีเซ็ต</button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Articles Section
// ──────────────────────────────────────────────
const EMPTY_ARTICLE = {
  title: '', slug: '', excerpt: '', content: '',
  category: '', cat_color: '#FF7A00',
  cover_bg: 'linear-gradient(135deg,#FFF7ED,#FED7AA)',
  cover_image: '',
  read_time: '5 นาที', meta_title: '', meta_description: '',
  is_published: false,
}

function ArticlesSection({ token }) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)   // null | 'new' | article object
  const [form, setForm] = useState(EMPTY_ARTICLE)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const contentRef = useRef(null)

  function insertAtCursor(before, after = '') {
    const el = contentRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = el.value.slice(start, end)
    const inserted = before + selected + after
    const newVal = el.value.slice(0, start) + inserted + el.value.slice(end)
    setF('content', newVal)
    setTimeout(() => {
      el.focus()
      el.selectionStart = start + before.length
      el.selectionEnd = start + before.length + selected.length
    }, 0)
  }

  function insertImage() {
    const url = prompt('URL รูปภาพ:', 'https://')
    if (!url) return
    const alt = prompt('Alt text (คำอธิบายรูป):', '') || ''
    insertAtCursor(`<img src="${url}" alt="${alt}" />`)
  }

  function insertLink() {
    const el = contentRef.current
    if (!el) return
    const selected = el.value.slice(el.selectionStart, el.selectionEnd)
    const url = prompt('URL ลิ้งค์:', 'https://')
    if (!url) return
    const text = selected || prompt('ข้อความลิ้งค์:', 'คลิกที่นี่') || 'คลิกที่นี่'
    const snippet = `<a href="${url}" target="_blank" rel="noopener">${text}</a>`
    const start = el.selectionStart
    const end = el.selectionEnd
    const newVal = el.value.slice(0, start) + snippet + el.value.slice(end)
    setF('content', newVal)
    setTimeout(() => { el.focus(); el.selectionStart = el.selectionEnd = start + snippet.length }, 0)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/admin-api/articles/`, { headers: { 'X-Admin-Token': token } })
      if (res.ok) setArticles(await res.json())
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  function openNew() {
    setForm({ ...EMPTY_ARTICLE })
    setEditing('new')
    setMsg(null)
  }

  async function openEdit(a) {
    setMsg(null)
    try {
      const res = await fetch(`${API}/admin-api/articles/${a.id}/`, { headers: { 'X-Admin-Token': token } })
      if (res.ok) {
        const full = await res.json()
        setForm(full)
        setEditing(full)
      }
    } catch {}
  }

  async function save() {
    setSaving(true); setMsg(null)
    try {
      const isNew = editing === 'new'
      const url = isNew ? `${API}/admin-api/articles/` : `${API}/admin-api/articles/${editing.id}/`
      const method = isNew ? 'POST' : 'PUT'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (res.ok) {
        setMsg({ ok: true, text: d.detail })
        load()
        setEditing(null)
      } else {
        setMsg({ ok: false, text: d.detail })
      }
    } catch { setMsg({ ok: false, text: 'เชื่อมต่อไม่ได้' }) }
    finally { setSaving(false) }
  }

  async function del(id) {
    if (!confirm('ลบบทความนี้?')) return
    try {
      const res = await fetch(`${API}/admin-api/articles/${id}/`, {
        method: 'DELETE',
        headers: { 'X-Admin-Token': token },
      })
      const d = await res.json()
      if (res.ok) { setMsg({ ok: true, text: d.detail }); load() }
      else setMsg({ ok: false, text: d.detail })
    } catch { setMsg({ ok: false, text: 'เชื่อมต่อไม่ได้' }) }
  }

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,.06)',
    border: '1px solid rgba(255,255,255,.12)', borderRadius: 8,
    padding: '8px 12px', color: '#e2e8f0', fontSize: '0.87rem',
    boxSizing: 'border-box',
  }
  const labelStyle = { display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: 4 }

  if (editing !== null) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => setEditing(null)} style={{
            background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.15)',
            color: '#94a3b8', borderRadius: 8, padding: '7px 16px', cursor: 'pointer',
          }}>← กลับ</button>
          <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
            {editing === 'new' ? '✏️ สร้างบทความใหม่' : '✏️ แก้ไขบทความ'}
          </h2>
        </div>

        {msg && (
          <div style={{
            marginBottom: 16, padding: '10px 16px', borderRadius: 8,
            background: msg.ok ? 'rgba(5,150,105,.15)' : 'rgba(220,38,38,.15)',
            color: msg.ok ? '#34d399' : '#fca5a5', fontSize: '0.85rem',
          }}>{msg.text}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>ชื่อบทความ *</label>
              <input style={inputStyle} value={form.title} onChange={e => setF('title', e.target.value)} placeholder="10 วิธีเพิ่มยอดวิว..." />
            </div>
            <div>
              <label style={labelStyle}>Slug * (URL: /articles/slug)</label>
              <input style={inputStyle} value={form.slug} onChange={e => setF('slug', e.target.value)} placeholder="10-วิธี-เพิ่มยอดวิว" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>บทย่อ (Excerpt)</label>
            <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={form.excerpt}
              onChange={e => setF('excerpt', e.target.value)} placeholder="สรุปสั้นๆ ที่แสดงในการ์ดบทความ..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>หมวดหมู่</label>
              <input style={inputStyle} value={form.category} onChange={e => setF('category', e.target.value)} placeholder="เทคนิค TikTok" />
            </div>
            <div>
              <label style={labelStyle}>สีหมวดหมู่</label>
              <input style={inputStyle} value={form.cat_color} onChange={e => setF('cat_color', e.target.value)} placeholder="#FF7A00" />
            </div>
            <div>
              <label style={labelStyle}>เวลาอ่าน</label>
              <input style={inputStyle} value={form.read_time} onChange={e => setF('read_time', e.target.value)} placeholder="5 นาที" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>URL รูปภาพ Cover (ถ้ามี — แสดงแทน gradient)</label>
              <input style={inputStyle} value={form.cover_image || ''} onChange={e => setF('cover_image', e.target.value)} placeholder="https://example.com/image.jpg" />
              {form.cover_image && (
                <img src={form.cover_image} alt="preview" style={{ marginTop: 6, height: 60, borderRadius: 6, objectFit: 'cover', width: '100%' }} />
              )}
            </div>
            <div>
              <label style={labelStyle}>Cover Background (CSS gradient — fallback)</label>
              <input style={inputStyle} value={form.cover_bg} onChange={e => setF('cover_bg', e.target.value)} placeholder="linear-gradient(135deg,#FFF7ED,#FED7AA)" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Meta Title (SEO)</label>
              <input style={inputStyle} value={form.meta_title} onChange={e => setF('meta_title', e.target.value)} placeholder="ชื่อสำหรับ Google (ถ้าว่างจะใช้ชื่อบทความ)" />
            </div>
            <div>
              <label style={labelStyle}>Meta Description (SEO)</label>
              <input style={inputStyle} value={form.meta_description} onChange={e => setF('meta_description', e.target.value)} placeholder="คำอธิบายสั้นสำหรับ Google (ไม่เกิน 300 ตัวอักษร)" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>เนื้อหาบทความ (HTML) *</label>

            {/* ── Toolbar ── */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6,
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: '8px 8px 0 0',
              padding: '8px 10px',
            }}>
              {[
                { label: 'H2', snippet: ['<h2>', '</h2>'] },
                { label: 'H3', snippet: ['<h3>', '</h3>'] },
                { label: 'B',  snippet: ['<strong>', '</strong>'] },
                { label: 'I',  snippet: ['<em>', '</em>'] },
                { label: 'P',  snippet: ['<p>', '</p>'] },
                { label: 'UL', snippet: ['<ul>\n  <li>', '</li>\n</ul>'] },
                { label: 'LI', snippet: ['<li>', '</li>'] },
                { label: 'HR', snippet: ['<hr />', ''] },
                { label: 'Quote', snippet: ['<blockquote>', '</blockquote>'] },
              ].map(btn => (
                <button key={btn.label} type="button"
                  onClick={() => insertAtCursor(btn.snippet[0], btn.snippet[1])}
                  style={{
                    background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)',
                    color: '#94a3b8', borderRadius: 6, padding: '4px 10px',
                    fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                    fontFamily: btn.label === 'B' ? 'serif' : btn.label === 'I' ? 'serif' : 'inherit',
                    fontStyle: btn.label === 'I' ? 'italic' : 'normal',
                  }}>
                  {btn.label}
                </button>
              ))}
              <div style={{ width: 1, background: 'rgba(255,255,255,.1)', margin: '0 2px' }} />
              <button type="button" onClick={insertImage} style={{
                background: 'rgba(14,165,233,.12)', border: '1px solid rgba(14,165,233,.3)',
                color: '#38bdf8', borderRadius: 6, padding: '4px 12px',
                fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
              }}>🖼 แทรกรูป</button>
              <button type="button" onClick={insertLink} style={{
                background: 'rgba(255,122,0,.12)', border: '1px solid rgba(255,122,0,.3)',
                color: '#FF7A00', borderRadius: 6, padding: '4px 12px',
                fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
              }}>🔗 แทรกลิ้งค์</button>
            </div>

            <textarea
              ref={contentRef}
              style={{
                ...inputStyle,
                fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical',
                borderRadius: '0 0 8px 8px', borderTop: 'none',
              }}
              rows={16}
              value={form.content}
              onChange={e => setF('content', e.target.value)}
              placeholder={'<h2>หัวข้อหลัก</h2>\n<p>เนื้อหา...</p>\n<ul>\n  <li>ข้อที่ 1</li>\n</ul>'}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#94a3b8', fontSize: '0.87rem' }}>
              <input type="checkbox" checked={form.is_published} onChange={e => setF('is_published', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#10b981' }} />
              เผยแพร่ทันที (Published)
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={save} disabled={saving || !form.title || !form.slug} style={{
              background: 'linear-gradient(135deg,#FF7A00,#ff5500)', color: '#fff',
              border: 'none', borderRadius: 10, padding: '10px 28px',
              fontWeight: 800, fontSize: '0.9rem',
              cursor: saving || !form.title || !form.slug ? 'not-allowed' : 'pointer',
              opacity: saving || !form.title || !form.slug ? 0.5 : 1,
            }}>
              {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
            </button>
            <button onClick={() => setEditing(null)} style={{
              background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.15)',
              color: '#94a3b8', borderRadius: 10, padding: '10px 20px', cursor: 'pointer',
            }}>ยกเลิก</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className={styles.sectionTitle} style={{ margin: 0 }}>📝 จัดการบทความ</h2>
        <button onClick={openNew} style={{
          background: 'linear-gradient(135deg,#FF7A00,#ff5500)', color: '#fff',
          border: 'none', borderRadius: 10, padding: '9px 20px',
          fontWeight: 700, fontSize: '0.87rem', cursor: 'pointer',
        }}>+ สร้างบทความใหม่</button>
      </div>

      {msg && (
        <div style={{
          marginBottom: 16, padding: '10px 16px', borderRadius: 8,
          background: msg.ok ? 'rgba(5,150,105,.15)' : 'rgba(220,38,38,.15)',
          color: msg.ok ? '#34d399' : '#fca5a5', fontSize: '0.85rem',
        }}>{msg.text}</div>
      )}

      {loading ? <div className={styles.loading}>กำลังโหลด...</div> :
        articles.length === 0 ? <p className={styles.empty}>ยังไม่มีบทความ — สร้างใหม่ได้เลย</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {articles.map(a => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.09)',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.9rem', marginBottom: 3 }}>
                    {a.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    /{a.slug} · {a.category || '—'} · {a.read_time}
                  </div>
                </div>
                <span style={{
                  fontSize: '0.73rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                  background: a.is_published ? 'rgba(5,150,105,.2)' : 'rgba(100,116,139,.2)',
                  color: a.is_published ? '#34d399' : '#64748b',
                }}>
                  {a.is_published ? '✅ Published' : '⏸ Draft'}
                </span>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <a href={`/articles/${a.slug}`} target="_blank" rel="noreferrer" style={{
                    background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
                    color: '#94a3b8', borderRadius: 8, padding: '6px 14px',
                    fontSize: '0.8rem', textDecoration: 'none',
                  }}>👁 ดู</a>
                  <button onClick={() => openEdit(a)} style={{
                    background: 'rgba(255,122,0,.12)', border: '1px solid rgba(255,122,0,.3)',
                    color: '#FF7A00', borderRadius: 8, padding: '6px 14px',
                    fontSize: '0.8rem', cursor: 'pointer',
                  }}>✏️ แก้ไข</button>
                  <button onClick={() => del(a.id)} style={{
                    background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.3)',
                    color: '#fca5a5', borderRadius: 8, padding: '6px 14px',
                    fontSize: '0.8rem', cursor: 'pointer',
                  }}>🗑 ลบ</button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Payment Orders Section
// ──────────────────────────────────────────────
function PaymentOrdersSection({ token }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [acting, setActing] = useState(null)
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState(null)

  const [paySettings, setPaySettings] = useState(null)
  const [savingPay, setSavingPay] = useState(false)
  const [payMsg, setPayMsg] = useState(null)
  const [bankName, setBankName] = useState('')
  const [account, setAccount] = useState('')
  const [accountName, setAccountName] = useState('')
  const qrRef = useRef(null)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/admin-api/orders/?status=${filter}`, {
        headers: { 'X-Admin-Token': token },
      })
      if (res.ok) setOrders(await res.json())
    } catch {}
    finally { setLoading(false) }
  }, [token, filter])

  const loadPaySettings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin-api/payment-settings/`, {
        headers: { 'X-Admin-Token': token },
      })
      if (res.ok) {
        const d = await res.json()
        setPaySettings(d)
        setBankName(d.bank_name || '')
        setAccount(d.account || '')
        setAccountName(d.account_name || '')
      }
    } catch {}
  }, [token])

  useEffect(() => { loadOrders() }, [loadOrders])
  useEffect(() => { loadPaySettings() }, [loadPaySettings])

  async function doAction(orderId, action) {
    setActing(orderId); setMsg(null)
    try {
      const res = await fetch(`${API}/admin-api/orders/${orderId}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify({ action, note }),
      })
      const d = await res.json()
      if (res.ok) {
        setMsg({ ok: true, text: d.detail })
        setNote('')
        loadOrders()
      } else {
        setMsg({ ok: false, text: d.detail })
      }
    } catch {
      setMsg({ ok: false, text: 'เชื่อมต่อไม่ได้' })
    } finally { setActing(null) }
  }

  async function savePaySettings(e) {
    e.preventDefault()
    setSavingPay(true); setPayMsg(null)
    const fd = new FormData()
    fd.append('bank_name', bankName)
    fd.append('account', account)
    fd.append('account_name', accountName)
    if (qrRef.current?.files[0]) fd.append('qr_image', qrRef.current.files[0])
    try {
      const res = await fetch(`${API}/admin-api/payment-settings/`, {
        method: 'POST',
        headers: { 'X-Admin-Token': token },
        body: fd,
      })
      const d = await res.json()
      if (res.ok) {
        setPayMsg({ ok: true, text: '✅ บันทึกแล้ว' })
        setPaySettings(d)
        if (qrRef.current) qrRef.current.value = ''
      } else {
        setPayMsg({ ok: false, text: `❌ ${d.detail}` })
      }
    } catch {
      setPayMsg({ ok: false, text: '❌ เชื่อมต่อไม่ได้' })
    } finally { setSavingPay(false) }
  }

  const STATUS_COLOR = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' }
  const STATUS_LABEL = { pending: '⏳ รอตรวจ', approved: '✅ อนุมัติ', rejected: '❌ ปฏิเสธ' }

  return (
    <div>
      {/* Payment Settings */}
      <div style={{ marginBottom: 32 }}>
        <h2 className={styles.sectionTitle}>⚙️ ตั้งค่าช่องทางชำระเงิน</h2>
        <form onSubmit={savePaySettings} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}>
          <div>
            <label className={styles.editorLabel}>ชื่อธนาคาร</label>
            <input className={styles.editorInput} value={bankName} onChange={e => setBankName(e.target.value)} placeholder="ธนาคารออมสิน (GSB)" />
          </div>
          <div>
            <label className={styles.editorLabel}>เลขที่บัญชี</label>
            <input className={styles.editorInput} value={account} onChange={e => setAccount(e.target.value)} placeholder="020 481 751 756" />
          </div>
          <div>
            <label className={styles.editorLabel}>ชื่อบัญชี</label>
            <input className={styles.editorInput} value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="นางสาวพัทธนันท์ ป้อมสุวรรณ" />
          </div>
          <div>
            <label className={styles.editorLabel}>QR Code (ไม่บังคับ — ถ้าไม่ใส่จะไม่แสดงในหน้าเติมเครดิต)</label>
            {paySettings?.qr_url && (
              <div style={{ marginBottom: 8 }}>
                <img src={paySettings.qr_url} alt="QR" style={{ width: 100, height: 100, borderRadius: 8, background: '#fff', padding: 4 }} />
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>QR ปัจจุบัน — อัปโหลดใหม่เพื่อแทนที่</div>
              </div>
            )}
            <input ref={qrRef} type="file" accept="image/*" className={styles.thumbFileInput} />
          </div>
          {payMsg && (
            <div className={`${styles.demoMsg} ${payMsg.ok ? styles.demoMsgOk : styles.demoMsgErr}`}>{payMsg.text}</div>
          )}
          <button className={styles.editorSave} type="submit" disabled={savingPay} style={{ alignSelf: 'flex-start' }}>
            {savingPay ? '⏳ กำลังบันทึก...' : '💾 บันทึกการตั้งค่า'}
          </button>
        </form>
      </div>

      {/* Orders */}
      <h2 className={styles.sectionTitle}>📋 รายการสลิปรอตรวจสอบ</h2>

      <div className={styles.filterTabs} style={{ marginBottom: 16 }}>
        {[['pending', '⏳ รอตรวจ'], ['approved', '✅ อนุมัติ'], ['rejected', '❌ ปฏิเสธ'], ['all', 'ทั้งหมด']].map(([k, l]) => (
          <button key={k} className={`${styles.filterTab} ${filter === k ? styles.filterTabActive : ''}`}
            onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      {msg && (
        <div className={`${styles.demoMsg} ${msg.ok ? styles.demoMsgOk : styles.demoMsgErr}`} style={{ marginBottom: 14 }}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>กำลังโหลด...</div>
      ) : orders.length === 0 ? (
        <p className={styles.empty}>ไม่มีรายการ</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {orders.map(o => (
            <div key={o.id} style={{
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 14,
              padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
                    #{o.id} · {o.user_name}
                    <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.8rem' }}> ({o.user_email})</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    {o.credits} เครดิต — ฿{o.amount} · {o.created_at}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                    เครดิตปัจจุบัน: {o.user_credits}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: STATUS_COLOR[o.status] || '#94a3b8', flexShrink: 0 }}>
                  {STATUS_LABEL[o.status] || o.status}
                </div>
              </div>

              {o.slip_url && (
                <a href={o.slip_url} target="_blank" rel="noreferrer">
                  <img src={o.slip_url} alt="slip"
                    style={{ maxWidth: 180, maxHeight: 240, borderRadius: 8, display: 'block', marginBottom: 12, border: '1px solid rgba(255,255,255,.1)' }}
                  />
                </a>
              )}

              {o.status === 'pending' && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    style={{
                      flex: 1, minWidth: 140,
                      background: 'rgba(255,255,255,.06)',
                      border: '1px solid rgba(255,255,255,.15)',
                      borderRadius: 8, padding: '7px 12px',
                      color: '#e2e8f0', fontSize: '0.82rem',
                    }}
                    placeholder="หมายเหตุ (ไม่บังคับ)"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                  <button
                    onClick={() => doAction(o.id, 'approve')}
                    disabled={!!acting}
                    style={{
                      background: '#059669', color: '#fff', border: 'none',
                      borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: '0.85rem',
                      cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.6 : 1,
                    }}
                  >
                    {acting === o.id ? '⏳...' : '✅ อนุมัติ'}
                  </button>
                  <button
                    onClick={() => doAction(o.id, 'reject')}
                    disabled={!!acting}
                    style={{
                      background: '#dc2626', color: '#fff', border: 'none',
                      borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: '0.85rem',
                      cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.6 : 1,
                    }}
                  >
                    ❌ ปฏิเสธ
                  </button>
                </div>
              )}

              {o.status !== 'pending' && o.admin_note && (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>หมายเหตุ: {o.admin_note}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Credit Alerts — แสดงเตือนบน Dashboard ถ้า AI ไหนเครดิตหมด/ต่ำ
// ──────────────────────────────────────────────
function CreditAlerts({ token }) {
  const [alerts, setAlerts] = useState([])

  async function check() {
    try {
      const res = await fetch(`${API}/admin-api/credits/`, { headers: { 'X-Admin-Token': token } })
      if (!res.ok) return
      const d = await res.json()
      const found = []

      // OpenAI
      if (d.openai?.status === 'error') {
        found.push({ key: 'openai', level: 'error', icon: '🤖', name: 'OpenAI', msg: d.openai.detail || 'เชื่อมต่อไม่ได้' })
      } else if (d.openai?.remaining_usd != null && d.openai.remaining_usd < 2) {
        found.push({ key: 'openai-low', level: 'warn', icon: '🤖', name: 'OpenAI', msg: `เครดิตเหลือน้อย $${Number(d.openai.remaining_usd).toFixed(2)} — ควรเติมเงิน` })
      }

      // Fal.ai
      if (d.fal?.status === 'error') {
        found.push({ key: 'fal', level: 'error', icon: '⚡', name: 'Fal.ai', msg: d.fal.detail || 'เชื่อมต่อไม่ได้ / เครดิตหมด' })
      } else if (d.fal?.balance != null && d.fal.balance < 1) {
        found.push({ key: 'fal-low', level: 'warn', icon: '⚡', name: 'Fal.ai', msg: `เครดิตเหลือน้อย $${Number(d.fal.balance).toFixed(2)} — ควรเติมเงิน` })
      } else if (d.fal?.balance == null && d.fal?.status === 'ok') {
        found.push({ key: 'fal-unknown', level: 'warn', icon: '⚡', name: 'Fal.ai', msg: 'ไม่ทราบยอดเครดิต — ตรวจสอบที่ fal.ai/dashboard/billing (อาจเหลือน้อยกว่า $1)' })
      }

      // Gemini
      if (d.gemini?.key_valid === false) {
        found.push({ key: 'gemini', level: 'error', icon: '✨', name: 'Gemini', msg: d.gemini.detail || 'API Key ไม่ถูกต้อง' })
      }

      // Botnoi
      if (d.botnoi?.status === 'error') {
        found.push({ key: 'botnoi', level: 'error', icon: '🗣️', name: 'Botnoi TTS', msg: d.botnoi.detail || 'เชื่อมต่อไม่ได้' })
      }

      setAlerts(found)
    } catch {}
  }

  useEffect(() => {
    check()
    const iv = setInterval(check, 60000)  // re-check ทุก 1 นาที
    return () => clearInterval(iv)
  }, [token])

  if (alerts.length === 0) return null

  return (
    <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {alerts.map(a => (
        <div key={a.key} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', borderRadius: 10,
          background: a.level === 'error' ? 'rgba(220,38,38,.12)' : 'rgba(217,119,6,.12)',
          border: `1px solid ${a.level === 'error' ? 'rgba(220,38,38,.4)' : 'rgba(217,119,6,.4)'}`,
        }}>
          <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{a.level === 'error' ? '🚨' : '⚠️'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              fontWeight: 700, fontSize: '0.85rem',
              color: a.level === 'error' ? '#fca5a5' : '#fcd34d',
              marginRight: 8,
            }}>
              {a.icon} {a.name}
            </span>
            <span style={{ fontSize: '0.83rem', color: a.level === 'error' ? '#fca5a5' : '#fcd34d', opacity: 0.85 }}>
              {a.msg}
            </span>
          </div>
          <a
            href="#"
            onClick={e => { e.preventDefault(); check() }}
            style={{ fontSize: '0.75rem', color: '#94a3b8', textDecoration: 'none', flexShrink: 0 }}
          >
            ↻ refresh
          </a>
        </div>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────
// Maintenance Toggle
// ──────────────────────────────────────────────
function MaintenanceToggle({ token }) {
  const [info, setInfo] = useState(null)  // { maintenance, auto, reason, triggered_at }
  const [saving, setSaving] = useState(false)
  const [fetchErr, setFetchErr] = useState(null)

  const loadInfo = useCallback(async () => {
    setFetchErr(null)
    try {
      const res = await fetch(`${API}/admin-api/maintenance/`, {
        headers: { 'X-Admin-Token': token },
      })
      if (!res.ok) {
        setFetchErr(`HTTP ${res.status}`)
        return
      }
      const d = await res.json()
      setInfo(d)
    } catch (e) {
      setFetchErr(`เชื่อมต่อไม่ได้: ${e.message}`)
    }
  }, [token])

  useEffect(() => {
    loadInfo()
    // Auto-refresh ทุก 30 วินาที เพื่อให้ state ตรงกับ DB เสมอ
    const iv = setInterval(loadInfo, 30000)
    return () => clearInterval(iv)
  }, [loadInfo])

  async function toggle() {
    if (info === null || saving) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/admin-api/maintenance/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify({ maintenance: !info.maintenance }),
      })
      const d = await res.json()
      if (res.ok) setInfo(d)
      else setFetchErr(`บันทึกไม่ได้: HTTP ${res.status}`)
    } catch (e) {
      setFetchErr(`เชื่อมต่อไม่ได้: ${e.message}`)
    } finally { setSaving(false) }
  }

  const isOn = info?.maintenance === true
  const isAuto = info?.auto === true

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Fetch error banner */}
      {fetchErr && (
        <div style={{
          background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.4)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span>🚨</span>
          <span style={{ flex: 1, fontSize: '0.84rem', color: '#fca5a5' }}>
            โหลด maintenance status ไม่ได้: {fetchErr}
          </span>
          <button onClick={loadInfo} style={{
            background: 'none', border: '1px solid #ef4444', color: '#f87171',
            borderRadius: 6, padding: '4px 12px', fontSize: '0.8rem', cursor: 'pointer',
          }}>↻ ลองใหม่</button>
        </div>
      )}

      {/* Auto-trigger warning banner */}
      {isAuto && (
        <div style={{
          background: 'linear-gradient(135deg,#3b0000,#1a0000)',
          border: '1px solid #ef4444',
          borderBottom: 'none',
          borderRadius: '14px 14px 0 0',
          padding: '14px 20px',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🤖</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f87171', marginBottom: 4 }}>
              ระบบถูกหยุดอัตโนมัติ — Pipeline Error
            </div>
            {info.reason && (
              <div style={{ fontSize: '0.82rem', color: '#fca5a5', marginBottom: 4, wordBreak: 'break-word' }}>
                {info.reason}
              </div>
            )}
            {info.triggered_at && (
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                เวลา: {info.triggered_at}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main toggle card */}
      <div style={{
        background: isOn ? 'linear-gradient(135deg,#1a0a00,#2d1200)' : 'linear-gradient(135deg,#001a0a,#002d12)',
        border: `1px solid ${isOn ? (isAuto ? '#ef4444' : '#92400e') : '#065f46'}`,
        borderRadius: isAuto ? '0 0 14px 14px' : 14,
        padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: '1.4rem' }}>{isOn ? '🔧' : '✅'}</span>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: info === null ? '#64748b' : isOn ? '#fbbf24' : '#34d399' }}>
              {info === null ? (fetchErr ? '⚠️ โหลดไม่ได้' : 'กำลังโหลด...') : isOn ? 'ระบบปิดอยู่ (Maintenance)' : 'ระบบเปิดปกติ'}
            </span>
            {isAuto && (
              <span style={{
                background: '#7f1d1d', color: '#fca5a5', fontSize: '0.7rem',
                fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              }}>AUTO</span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: isOn ? '#d97706' : '#6ee7b7' }}>
            {isOn
              ? 'User ทั่วไปสร้างคลิปไม่ได้ — เฉพาะ Admin เท่านั้น'
              : 'ทุกคนสร้างคลิปได้ตามปกติ'}
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={info === null || saving}
          style={{
            background: isOn ? '#E53E3E' : '#059669',
            color: '#fff', border: 'none', borderRadius: 999,
            padding: '10px 28px', fontWeight: 800, fontSize: '0.9rem',
            cursor: info === null || saving ? 'not-allowed' : 'pointer',
            opacity: info === null || saving ? 0.6 : 1,
            transition: 'background .2s',
            whiteSpace: 'nowrap',
          }}
        >
          {saving ? '⏳ กำลังบันทึก...' : isOn ? '🟢 เปิดระบบ' : '🔴 ปิดระบบ'}
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Dashboard
// ──────────────────────────────────────────────
function Dashboard({ token }) {
  const [stats, setStats] = useState(null)
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem('cd_admin_tab') || 'dashboard' } catch { return 'dashboard' }
  })
  const [selectedChat, setSelectedChat] = useState(null)

  function switchTab(key) {
    try { localStorage.setItem('cd_admin_tab', key) } catch {}
    setTab(key)
    setSelectedChat(null)
  }

  const loadStats = useCallback(async () => {
    const res = await fetch(`${API}/admin-api/dashboard/`, { headers: { 'X-Admin-Token': token } })
    if (res.ok) setStats(await res.json())
  }, [token])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { const iv = setInterval(loadStats, 10000); return () => clearInterval(iv) }, [loadStats])

  const tabs = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'chats', label: '💬 Chats', badge: stats?.chats_unread },
    { key: 'orders', label: '💸 เติมเครดิต' },
    { key: 'credits', label: '💳 API Credits' },
    { key: 'demos', label: '🎬 Demo Clips' },
    { key: 'site', label: '🌐 หน้าเว็บ' },
    { key: 'articles', label: '📝 บทความ' },
  ]

  return (
    <div className={styles.dashWrap}>
      <div className={styles.topbar}>
        <div className={styles.brand}>🛡️ ClipDD Admin</div>
        <div className={styles.tabs}>
          {tabs.map(t => (
            <button key={t.key} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
              onClick={() => switchTab(t.key)}>
              {t.label}
              {t.badge > 0 && <span className={styles.tabBadge}>{t.badge}</span>}
            </button>
          ))}
        </div>
        <button className={styles.logoutBtn} onClick={() => { clearAdminToken(); window.location.reload() }}>ออกจากระบบ</button>
      </div>

      {tab === 'dashboard' && (
        <div className={styles.content}>
          <CreditAlerts token={token} />
          <MaintenanceToggle token={token} />
          <div className={styles.statsGrid}>
            <StatCard icon="👥" label="Users ทั้งหมด" value={stats?.users_total} sub={`+${stats?.users_today ?? 0} วันนี้`} />
            <StatCard icon="🎬" label="Projects ทั้งหมด" value={stats?.projects_total} sub={`+${stats?.projects_today ?? 0} วันนี้`} />
            <StatCard icon="🎥" label="Videos สำเร็จ" value={stats?.videos_total} />
            <StatCard icon="💬" label="Chat Sessions" value={stats?.chats_total} sub={`${stats?.chats_escalated ?? 0} รอแอดมิน`} accent={stats?.chats_escalated > 0} />
          </div>
          {stats?.projects_by_status && (
            <div className={styles.statusSection}>
              <h2 className={styles.sectionTitle}>📋 Project Status</h2>
              <div className={styles.statusGrid}>
                {Object.entries(stats.projects_by_status).map(([s, n]) => (
                  <div key={s} className={`${styles.statusCard} ${s === 'failed' && n > 0 ? styles.statusCardFailed : ''}`}>
                    <div className={styles.statusCount}>{n}</div>
                    <div className={styles.statusLabel}>{s}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {stats?.recent_failures?.length > 0 && (
            <div className={styles.statusSection}>
              <h2 className={styles.sectionTitle}>🚨 Failed Projects ล่าสุด</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.recent_failures.map(f => (
                  <div key={f.id} style={{
                    background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.3)',
                    borderRadius: 10, padding: '10px 14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#fca5a5', fontSize: '0.85rem' }}>
                        #{f.id} · {f.product}
                      </span>
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{f.created_at} · {f.user}</span>
                    </div>
                    <div style={{ color: '#fca5a5', fontSize: '0.8rem', opacity: 0.85, wordBreak: 'break-all' }}>
                      {f.error || '(ไม่มีข้อความ error)'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'chats' && !selectedChat && (
        <div className={styles.content}>
          <ChatList token={token} onSelect={id => setSelectedChat(id)} />
        </div>
      )}

      {tab === 'chats' && selectedChat && (
        <div className={styles.content}>
          <ChatDetail sessionId={selectedChat} token={token} onBack={() => setSelectedChat(null)} />
        </div>
      )}

      {tab === 'orders' && (
        <div className={styles.content}>
          <PaymentOrdersSection token={token} />
        </div>
      )}

      {tab === 'credits' && (
        <div className={styles.content}>
          <CreditsSection token={token} />
        </div>
      )}

      {tab === 'demos' && (
        <div className={styles.content}>
          <DemoClipsSection token={token} />
        </div>
      )}

      {tab === 'site' && (
        <div className={styles.content}>
          <SiteEditor token={token} />
        </div>
      )}

      {tab === 'articles' && (
        <div className={styles.content}>
          <ArticlesSection token={token} />
        </div>
      )}

      <AdminChatWidget token={token} />
    </div>
  )
}

// ──────────────────────────────────────────────
// Root
// ──────────────────────────────────────────────
export default function MantapaPage() {
  const [token, setToken] = useState(null)
  useEffect(() => { const t = getAdminToken(); if (t) setToken(t) }, [])
  if (!token) return <LoginGate onAuth={t => setToken(t)} />
  return <Dashboard token={token} />
}
