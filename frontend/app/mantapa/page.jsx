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
    { key: 'credits', label: '💳 Credits' },
    { key: 'demos', label: '🎬 Demo Clips' },
    { key: 'site', label: '🌐 หน้าเว็บ' },
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
