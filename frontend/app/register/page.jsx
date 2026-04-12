'use client'
import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import styles from '../login/auth.module.css'

const GOOGLE_ENABLED = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)

async function getFingerprint() {
  try {
    const FingerprintJS = (await import('@fingerprintjs/fingerprintjs')).default
    const fp = await FingerprintJS.load()
    const result = await fp.get()
    return result.visitorId
  } catch {
    return ''
  }
}

function GoogleRegisterButton({ loading, setLoading, setError }) {
  const loginWithGoogle = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setLoading(true)
      setError('')
      try {
        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        const userInfo = await userRes.json()
        const res = await fetch('/api/auth/google/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: tokenResponse.access_token,
            email: userInfo.email,
            name: userInfo.name,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.detail || 'Google Sign-In ล้มเหลว')
          return
        }
        localStorage.setItem('cd_token', data.token)
        localStorage.setItem('cd_user', JSON.stringify(data.user))
        window.location.href = '/create'
      } catch {
        setError('ไม่สามารถเชื่อมต่อได้')
      } finally {
        setLoading(false)
      }
    },
    onError: () => setError('Google Sign-In ถูกยกเลิก'),
  })

  return (
    <button className={styles.googleBtn} onClick={() => loginWithGoogle()} disabled={loading} type="button">
      <svg width="20" height="20" viewBox="0 0 48 48">
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      </svg>
      {loading ? 'กำลังสมัคร...' : 'สมัครด้วย Google (แนะนำ)'}
    </button>
  )
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
        setError(data.email?.[0] || data.password?.[0] || data.detail || 'เกิดข้อผิดพลาด')
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
          <h1 className={styles.title}>สมัครใช้ฟรี</h1>
          <p className={styles.sub}>รับ 1 คลิปฟรีทันที ไม่ต้องใส่บัตรเครดิต</p>

          {error && <div className={styles.error}>{error}</div>}

          {GOOGLE_ENABLED && (
            <>
              <GoogleRegisterButton loading={loading} setLoading={setLoading} setError={setError} />
              <div className={styles.divider}><span>หรือสมัครด้วย email</span></div>
            </>
          )}

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
                placeholder="********"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? 'กำลังสมัคร...' : 'สมัครฟรี + รับ 1 คลิปเลย →'}
            </button>
          </form>
          <p className={styles.switch}>มีบัญชีแล้ว? <a href="/login" className={styles.link}>เข้าสู่ระบบ</a></p>
        </div>
      </div>
    </div>
  )
}
