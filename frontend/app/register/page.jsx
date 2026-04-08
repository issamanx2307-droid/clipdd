'use client'
import { useState } from 'react'
import styles from '../login/auth.module.css'

async function getFingerprint() {
  try {
    const FingerprintJS = (await import('@fingerprintjs/fingerprintjs')).default
    const fp = await FingerprintJS.load()
    const result = await fp.get()
    return result.visitorId
  } catch { return '' }
}

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fingerprint = await getFingerprint()
      const res = await fetch('/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, fingerprint }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data.email?.[0] || data.password?.[0] || data.detail || 'เกิดข้อผิดพลาด'
        setError(msg)
        return
      }
      localStorage.setItem('cd_token', data.token)
      localStorage.setItem('cd_user', JSON.stringify(data.user))
      window.location.href = '/create'
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
          <h1 className={styles.title}>สมัครใช้งานฟรี</h1>
          <p className={styles.sub}>รับ 3 คลิปฟรีทันที ไม่ต้องใส่บัตรเครดิต</p>
          {error && <div className={styles.error}>{error}</div>}
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>ชื่อ (ไม่บังคับ)</label>
              <input
                className={styles.input}
                type="text"
                placeholder="ชื่อร้านหรือชื่อคุณ"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>อีเมล</label>
              <input
                className={styles.input}
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>รหัสผ่าน (อย่างน้อย 8 ตัว)</label>
              <input
                className={styles.input}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? 'กำลังสมัคร...' : '🎁 สมัครฟรี + รับ 3 คลิปเลย →'}
            </button>
          </form>
          <p className={styles.switch}>
            มีบัญชีแล้ว? <a href="/login" className={styles.link}>เข้าสู่ระบบ</a>
          </p>
        </div>
      </div>
    </div>
  )
}
