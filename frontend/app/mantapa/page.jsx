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

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin-api/credits/`, { headers: { 'X-Admin-Token': token } })
      if (res.ok) setData(await res.json())
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
  if (!data) return null

  const openai = data.openai || {}
  const fal = data.fal || {}
  const gemini = data.gemini || {}

  return (
    <div className={styles.creditsSection}>
      <h2 className={styles.sectionTitle}>💳 API Credits</h2>
      <div className={styles.creditsGrid}>
        <CreditCard name="OpenAI" icon="🤖" statusOk={openai.status === 'ok' || openai.status === 'payg'}>
          {openai.status === 'ok' && openai.total_available != null && <>
            <div className={styles.creditAmount}>${Number(openai.total_available).toFixed(2)}</div>
            <div className={styles.creditDetail}>คงเหลือ / จาก ${Number(openai.total_granted || 0).toFixed(2)}</div>
            <div className={styles.creditBar}>
              <div className={styles.creditBarFill} style={{ width: `${Math.min(100, ((openai.total_available || 0) / (openai.total_granted || 1)) * 100)}%` }} />
            </div>
            <div className={styles.creditUsed}>ใช้ไป ${Number(openai.total_used || 0).toFixed(2)}</div>
          </>}
          {openai.status === 'ok' && openai.monthly_usage_usd != null && <>
            <div className={styles.creditAmount}>${Number(openai.monthly_usage_usd).toFixed(4)}</div>
            <div className={styles.creditDetail}>ใช้ไปเดือนนี้ ({openai.period})</div>
          </>}
          {openai.status === 'ok' && openai.note && openai.total_available == null && openai.monthly_usage_usd == null && <>
            <div className={styles.creditAmount}>✅</div>
            <div className={styles.creditDetail}>{openai.note}</div>
          </>}
          {openai.status === 'payg' && <>
            <div className={styles.creditAmount}>{openai.plan}</div>
            <div className={styles.creditDetail}>Limit ${openai.hard_limit_usd} / ${openai.soft_limit_usd} soft</div>
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
          <div className={styles.creditAmount}>{gemini.model}</div>
          <div className={styles.creditDetail}>{gemini.note}</div>
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
// Dashboard
// ──────────────────────────────────────────────
function Dashboard({ token }) {
  const [stats, setStats] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [selectedChat, setSelectedChat] = useState(null)

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
  ]

  return (
    <div className={styles.dashWrap}>
      <div className={styles.topbar}>
        <div className={styles.brand}>🛡️ ClipDD Admin</div>
        <div className={styles.tabs}>
          {tabs.map(t => (
            <button key={t.key} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
              onClick={() => { setTab(t.key); setSelectedChat(null) }}>
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
