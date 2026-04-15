'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const API = '/api'

const PACKAGES = [
  {
    id: '1',
    credits: 1,
    amount: 89,
    label: '1 เครดิต',
    note: 'สร้างได้ 1 คลิป',
    badge: null,
  },
  {
    id: '5',
    credits: 5,
    amount: 399,
    label: '5 เครดิต',
    note: 'ประหยัดกว่า 20%',
    badge: '🔥 คุ้มกว่า',
  },
]

export default function TopupPage() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)

  const [selected, setSelected] = useState('5')
  const [paySettings, setPaySettings] = useState(null)
  const [slipFile, setSlipFile] = useState(null)
  const [slipPreview, setSlipPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState(null)  // { ok, text }

  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  const fileRef = useRef(null)

  // Auth check
  useEffect(() => {
    const t = localStorage.getItem('cd_token')
    const u = localStorage.getItem('cd_user')
    if (!t) { router.replace('/login'); return }
    setToken(t)
    if (u) { try { setUser(JSON.parse(u)) } catch {} }
  }, [router])

  // Load payment settings (public, no auth needed)
  useEffect(() => {
    fetch(`${API}/payment-settings/`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPaySettings(d) })
      .catch(() => {})
  }, [])

  // Load own orders
  const loadOrders = async (t) => {
    if (!t) return
    setLoadingOrders(true)
    try {
      const res = await fetch(`${API}/orders/`, {
        headers: { Authorization: `Token ${t}` },
      })
      if (res.ok) setOrders(await res.json())
    } catch {}
    finally { setLoadingOrders(false) }
  }

  useEffect(() => {
    if (token) loadOrders(token)
  }, [token])

  function pickSlip(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSlipFile(file)
    setSlipPreview(URL.createObjectURL(file))
    setSubmitResult(null)
  }

  async function submit(e) {
    e.preventDefault()
    if (!slipFile || submitting) return
    setSubmitting(true)
    setSubmitResult(null)
    try {
      const fd = new FormData()
      fd.append('package', selected)
      fd.append('slip_image', slipFile)
      const res = await fetch(`${API}/orders/`, {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
        body: fd,
      })
      const data = await res.json()
      if (res.ok) {
        setSubmitResult({ ok: true, text: data.detail })
        setSlipFile(null)
        setSlipPreview(null)
        if (fileRef.current) fileRef.current.value = ''
        loadOrders(token)
      } else {
        setSubmitResult({ ok: false, text: data.detail || 'เกิดข้อผิดพลาด' })
      }
    } catch (err) {
      setSubmitResult({ ok: false, text: `เชื่อมต่อไม่ได้: ${err.message}` })
    } finally {
      setSubmitting(false)
    }
  }

  const selectedPkg = PACKAGES.find(p => p.id === selected)

  const STATUS_LABELS = {
    pending: { label: '⏳ รอตรวจสลิป', color: '#f59e0b' },
    approved: { label: '✅ อนุมัติแล้ว', color: '#10b981' },
    rejected: { label: '❌ ปฏิเสธ', color: '#ef4444' },
  }

  if (!token) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: '#09090f',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '24px 16px 60px',
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <a href="/create" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.9rem' }}>← กลับ</a>
          <div style={{ flex: 1 }} />
          {user && (
            <div style={{
              background: 'rgba(229,62,62,.15)', border: '1px solid rgba(229,62,62,.3)',
              borderRadius: 999, padding: '4px 14px', fontSize: '0.82rem', color: '#fca5a5',
            }}>
              💳 เครดิตคงเหลือ {user.credits ?? '—'}
            </div>
          )}
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 6 }}>เติมเครดิต</h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 28 }}>
          โอนเงินแล้วแนบสลิป — แอดมินตรวจสอบและเพิ่มเครดิตภายใน 24 ชั่วโมง
        </p>

        {/* Package Selection */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            เลือกแพ็กเกจ
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {PACKAGES.map(pkg => {
              const isActive = selected === pkg.id
              return (
                <button
                  key={pkg.id}
                  onClick={() => setSelected(pkg.id)}
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg,rgba(229,62,62,.25),rgba(229,62,62,.1))'
                      : 'rgba(255,255,255,.04)',
                    border: `2px solid ${isActive ? '#E53E3E' : 'rgba(255,255,255,.1)'}`,
                    borderRadius: 14,
                    padding: '18px 16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    position: 'relative',
                    transition: 'all .2s',
                  }}
                >
                  {pkg.badge && (
                    <div style={{
                      position: 'absolute', top: -10, right: 12,
                      background: '#E53E3E', color: '#fff',
                      fontSize: '0.7rem', fontWeight: 700,
                      padding: '2px 10px', borderRadius: 999,
                    }}>
                      {pkg.badge}
                    </div>
                  )}
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: 2 }}>
                    {pkg.credits} เครดิต
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: isActive ? '#f87171' : '#94a3b8', marginBottom: 4 }}>
                    ฿{pkg.amount}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{pkg.note}</div>
                  {isActive && (
                    <div style={{
                      position: 'absolute', top: 10, right: 12,
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#E53E3E',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', color: '#fff', fontWeight: 700,
                    }}>✓</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Bank Details */}
        <div style={{
          background: 'rgba(255,255,255,.04)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 14,
          padding: '20px',
          marginBottom: 24,
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#94a3b8', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ช่องทางชำระเงิน
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Bank info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 4 }}>ธนาคาร</div>
              <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>
                {paySettings?.bank_name || 'ธนาคารออมสิน (GSB)'}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 4 }}>เลขที่บัญชี</div>
              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '1.1rem', letterSpacing: '0.05em', marginBottom: 12 }}>
                {paySettings?.account || '020 481 751 756'}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 4 }}>ชื่อบัญชี</div>
              <div style={{ fontWeight: 600, color: '#e2e8f0' }}>
                {paySettings?.account_name || 'นางสาวพัทธนันท์ ป้อมสุวรรณ'}
              </div>
            </div>

            {/* QR Code */}
            {paySettings?.qr_url && (
              <div style={{ flexShrink: 0, textAlign: 'center' }}>
                <img
                  src={paySettings.qr_url}
                  alt="QR โอนเงิน"
                  style={{ width: 130, height: 130, borderRadius: 8, background: '#fff', padding: 4, display: 'block' }}
                />
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 6 }}>สแกน QR</div>
              </div>
            )}
          </div>

          {/* Amount reminder */}
          <div style={{
            marginTop: 16,
            background: 'rgba(229,62,62,.1)',
            border: '1px solid rgba(229,62,62,.3)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: '0.88rem',
            color: '#fca5a5',
          }}>
            💸 โอน <strong>฿{selectedPkg?.amount}</strong> สำหรับ {selectedPkg?.credits} เครดิต
          </div>
        </div>

        {/* Slip Upload Form */}
        <form onSubmit={submit}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            แนบสลิปโอนเงิน
          </div>

          {/* Preview */}
          {slipPreview && (
            <div style={{ marginBottom: 12, textAlign: 'center' }}>
              <img
                src={slipPreview}
                alt="slip preview"
                style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 10, border: '1px solid rgba(255,255,255,.1)' }}
              />
            </div>
          )}

          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: 'rgba(255,255,255,.06)',
            border: '2px dashed rgba(255,255,255,.2)',
            borderRadius: 12,
            padding: '18px',
            cursor: 'pointer',
            marginBottom: 16,
            fontSize: '0.9rem',
            color: '#94a3b8',
            transition: 'border-color .2s',
          }}>
            📎 {slipFile ? slipFile.name : 'เลือกรูปสลิป (.jpg / .png)'}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={pickSlip}
              required
            />
          </label>

          {submitResult && (
            <div style={{
              marginBottom: 14,
              padding: '12px 16px',
              borderRadius: 10,
              background: submitResult.ok ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)',
              border: `1px solid ${submitResult.ok ? 'rgba(16,185,129,.4)' : 'rgba(239,68,68,.4)'}`,
              color: submitResult.ok ? '#6ee7b7' : '#fca5a5',
              fontSize: '0.88rem',
            }}>
              {submitResult.text}
            </div>
          )}

          <button
            type="submit"
            disabled={!slipFile || submitting}
            style={{
              width: '100%',
              background: !slipFile || submitting ? 'rgba(229,62,62,.4)' : '#E53E3E',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '14px',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: !slipFile || submitting ? 'not-allowed' : 'pointer',
              transition: 'background .2s',
            }}
          >
            {submitting ? '⏳ กำลังส่ง...' : `✅ ยืนยันการโอนเงิน ฿${selectedPkg?.amount}`}
          </button>
        </form>

        {/* Order History */}
        <div style={{ marginTop: 40 }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#94a3b8', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ประวัติการเติมเครดิต
          </div>
          {loadingOrders ? (
            <div style={{ color: '#64748b', fontSize: '0.88rem' }}>กำลังโหลด...</div>
          ) : orders.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '0.88rem' }}>ยังไม่มีประวัติการเติมเครดิต</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {orders.map(o => {
                const st = STATUS_LABELS[o.status] || { label: o.status, color: '#94a3b8' }
                return (
                  <div key={o.id} style={{
                    background: 'rgba(255,255,255,.04)',
                    border: '1px solid rgba(255,255,255,.08)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    flexWrap: 'wrap',
                  }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
                        {o.credits} เครดิต — ฿{o.amount}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{o.created_at}</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: st.color }}>
                      {st.label}
                    </div>
                    {o.status === 'rejected' && o.admin_note && (
                      <div style={{ width: '100%', fontSize: '0.8rem', color: '#fca5a5', marginTop: 4 }}>
                        เหตุผล: {o.admin_note}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
