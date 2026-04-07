'use client'
import { useState } from 'react'
import styles from './auth.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data.non_field_errors?.[0] || data.detail || 'เกิดข้อผิดพลาด'
        setError(msg)
        return
      }
      localStorage.setItem('cd_token', data.token)
      localStorage.setItem('cd_user', JSON.stringify(data.user))
      const next = new URLSearchParams(window.location.search).get('next') || '/create'
      window.location.href = next
    } catch {
      setError('ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <a href="/" className={styles.logo}>Clip<span>DD</span></a>
      </nav>
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>เข้าสู่ระบบ</h1>
          <p className={styles.sub}>ยินดีต้อนรับกลับมา</p>
          {error && <div className={styles.error}>{error}</div>}
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>อีเมล</label>
              <input
                className={styles.input}
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>รหัสผ่าน</label>
              <input
                className={styles.input}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ →'}
            </button>
          </form>
          <p className={styles.switch}>
            ยังไม่มีบัญชี? <a href="/register" className={styles.link}>สมัครฟรี</a>
          </p>
        </div>
      </div>
    </div>
  )
}
