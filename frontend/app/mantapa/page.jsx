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
    setLoading(true)
    setErr('')
    try {
      const res = await fetch(`${API}/admin-api/dashboard/`, {
        headers: { 'X-Admin-Token': pw },
      })
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
        <input
          className={styles.loginInput}
          type="password"
          placeholder="Admin Password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          autoFocus
        />
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
function StatCard({ icon, label, value, sub }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statBody}>
        <div className={styles.statValue}>{value ?? '—'}</div>
        <div className={styles.statLabel}>{label}</div>
        {sub && <div className={styles.statSub}>{sub}</div>}
      </div>
    </div>
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
    const res = await fetch(`${API}/admin-api/chats/${sessionId}/`, {
      headers: { 'X-Admin-Token': token },
    })
    if (res.ok) setData(await res.json())
  }, [sessionId, token])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const iv = setInterval(load, 5000)
    return () => clearInterval(iv)
  }, [load])
  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [data])

  async function sendReply(e) {
    e.preventDefault()
    if (!reply.trim() || sending) return
    setSending(true)
    await fetch(`${API}/admin-api/chats/${sessionId}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
      body: JSON.stringify({ content: reply }),
    })
    setReply('')
    setSending(false)
    load()
  }

  async function releaseAI() {
    await fetch(`${API}/admin-api/chats/${sessionId}/release/`, {
      method: 'POST',
      headers: { 'X-Admin-Token': token },
    })
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
              <span className={styles.msgRole}>{m.role === 'user' ? '👤' : m.role === 'admin' ? '🛡️' : '🤖'}</span>
              <span className={styles.msgTime}>{new Date(m.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
              {m.escalate && <span className={styles.escalateTag}>⚠️ Escalate</span>}
            </div>
            <div className={`${styles.msgBubble} ${m.escalate ? styles.msgBubbleEscalate : ''}`}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className={styles.replyRow} onSubmit={sendReply}>
        <textarea
          className={styles.replyInput}
          placeholder="พิมพ์ข้อความตอบกลับ..."
          value={reply}
          onChange={e => setReply(e.target.value)}
          rows={2}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e) } }}
        />
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

  const load = useCallback(async () => {
    const res = await fetch(`${API}/admin-api/chats/`, { headers: { 'X-Admin-Token': token } })
    if (res.ok) setChats(await res.json())
  }, [token])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const iv = setInterval(load, 5000)
    return () => clearInterval(iv)
  }, [load])

  return (
    <div className={styles.chatListWrap}>
      <h2 className={styles.sectionTitle}>💬 Chat Sessions</h2>
      {chats.length === 0 && <p className={styles.empty}>ยังไม่มีการแชท</p>}
      {chats.map(c => (
        <div key={c.id} className={`${styles.chatItem} ${c.human_takeover ? styles.chatItemEscalated : ''}`} onClick={() => onSelect(c.id)}>
          <div className={styles.chatItemTop}>
            <span className={styles.chatName}>{c.user_name || c.user_email}</span>
            <span className={styles.chatTime}>{new Date(c.last_message_at).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className={styles.chatItemBot}>
            <span className={styles.chatPreview}>{c.last_role === 'user' ? '👤' : c.last_role === 'admin' ? '🛡️' : '🤖'} {c.last_message?.slice(0, 60)}{c.last_message?.length > 60 ? '...' : ''}</span>
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
// Dashboard Stats
// ──────────────────────────────────────────────
function Dashboard({ token }) {
  const [stats, setStats] = useState(null)
  const [tab, setTab] = useState('dashboard') // 'dashboard' | 'chats'
  const [selectedChat, setSelectedChat] = useState(null)

  const loadStats = useCallback(async () => {
    const res = await fetch(`${API}/admin-api/dashboard/`, { headers: { 'X-Admin-Token': token } })
    if (res.ok) setStats(await res.json())
  }, [token])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => {
    const iv = setInterval(loadStats, 10000)
    return () => clearInterval(iv)
  }, [loadStats])

  return (
    <div className={styles.dashWrap}>
      <div className={styles.topbar}>
        <div className={styles.brand}>🛡️ ClipDD Admin</div>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'dashboard' ? styles.tabActive : ''}`} onClick={() => { setTab('dashboard'); setSelectedChat(null) }}>📊 Dashboard</button>
          <button className={`${styles.tab} ${tab === 'chats' ? styles.tabActive : ''}`} onClick={() => { setTab('chats'); setSelectedChat(null) }}>
            💬 Chats
            {stats?.chats_unread > 0 && <span className={styles.tabBadge}>{stats.chats_unread}</span>}
          </button>
        </div>
        <button className={styles.logoutBtn} onClick={() => { clearAdminToken(); window.location.reload() }}>ออกจากระบบ</button>
      </div>

      {tab === 'dashboard' && (
        <div className={styles.content}>
          <div className={styles.statsGrid}>
            <StatCard icon="👥" label="Users ทั้งหมด" value={stats?.users_total} sub={`+${stats?.users_today ?? 0} วันนี้`} />
            <StatCard icon="🎬" label="Projects ทั้งหมด" value={stats?.projects_total} sub={`+${stats?.projects_today ?? 0} วันนี้`} />
            <StatCard icon="🎥" label="Videos สำเร็จ" value={stats?.videos_total} />
            <StatCard icon="💬" label="Chat Sessions" value={stats?.chats_total} sub={`${stats?.chats_escalated ?? 0} รอแอดมิน`} />
          </div>

          {stats?.projects_by_status && (
            <div className={styles.statusSection}>
              <h2 className={styles.sectionTitle}>📋 Project Status</h2>
              <div className={styles.statusGrid}>
                {Object.entries(stats.projects_by_status).map(([s, n]) => (
                  <div key={s} className={styles.statusCard}>
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
    </div>
  )
}

// ──────────────────────────────────────────────
// Root
// ──────────────────────────────────────────────
export default function MantapaPage() {
  const [token, setToken] = useState(null)

  useEffect(() => {
    const t = getAdminToken()
    if (t) setToken(t)
  }, [])

  if (!token) return <LoginGate onAuth={t => setToken(t)} />
  return <Dashboard token={token} />
}
