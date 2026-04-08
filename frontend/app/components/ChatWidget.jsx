'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './ChatWidget.module.css'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('cd_token')
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'สวัสดีครับ 👋 มีอะไรให้ช่วยไหม? ถามเรื่องการใช้งาน, เช็ค status, หรือแก้ไข prompt ได้เลย' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const [humanMode, setHumanMode] = useState(false)
  const bottomRef = useRef(null)
  const seenMsgIds = useRef(new Set())
  const token = getToken()

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100) }
  }, [open, messages])

  // Poll for admin replies
  const pollAdminReplies = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/support/chat/poll/', {
        headers: { Authorization: `Token ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setHumanMode(data.human_takeover)
      const newMsgs = (data.new_messages || []).filter(m => !seenMsgIds.current.has(m.id))
      if (newMsgs.length > 0) {
        newMsgs.forEach(m => seenMsgIds.current.add(m.id))
        setMessages(prev => [...prev, ...newMsgs.map(m => ({ role: 'assistant', content: m.content, fromAdmin: true }))])
        if (!open) setUnread(n => n + newMsgs.length)
      }
    } catch {}
  }, [token, open])

  useEffect(() => {
    if (!token) return
    const iv = setInterval(pollAdminReplies, 5000)
    return () => clearInterval(iv)
  }, [pollAdminReplies, token])

  async function sendMessage(e) {
    e?.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/support/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Token ${token}` } : {}) },
        body: JSON.stringify({ message: userMsg }),
      })
      const data = await res.json()
      setHumanMode(data.human_takeover)
      const reply = data.reply || 'ขออภัย ระบบขัดข้อง กรุณาลองใหม่'
      setMessages(prev => [...prev, { role: 'assistant', content: reply, escalate: data.escalate }])
      if (!open) setUnread(n => n + 1)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Chat Window */}
      {open && (
        <div className={styles.window}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.avatar}>{humanMode ? '👤' : '🤖'}</div>
              <div>
                <div className={styles.headerName}>ClipDD Assistant</div>
                <div className={styles.headerStatus}>
                  <span className={styles.statusDot} /> {humanMode ? 'ทีมงานกำลังดูแล' : 'ออนไลน์'}
                </div>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className={styles.messages}>
            {messages.map((m, i) => (
              <div key={i} className={`${styles.msg} ${m.role === 'user' ? styles.msgUser : styles.msgBot}`}>
                {m.role === 'assistant' && <div className={styles.msgAvatar}>🤖</div>}
                <div className={`${styles.bubble} ${m.escalate ? styles.bubbleEscalate : ''}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className={`${styles.msg} ${styles.msgBot}`}>
                <div className={styles.msgAvatar}>🤖</div>
                <div className={styles.bubble}>
                  <span className={styles.typing}><span /><span /><span /></span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form className={styles.inputRow} onSubmit={sendMessage}>
            <input
              className={styles.chatInput}
              placeholder="พิมพ์ข้อความ..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button type="submit" className={styles.sendBtn} disabled={!input.trim() || loading}>
              ➤
            </button>
          </form>
        </div>
      )}

      {/* Bubble Button */}
      <button className={styles.bubble_btn} onClick={() => setOpen(o => !o)}>
        {open ? '✕' : '💬'}
        {!open && unread > 0 && <span className={styles.badge}>{unread}</span>}
      </button>
    </>
  )
}
