'use client'
import { useState, useRef, useEffect } from 'react'
import styles from './page.module.css'

const STATS = [
  { value: '1,000+', label: 'ร้านค้าใช้งาน' },
  { value: '50,000+', label: 'คลิปที่สร้างแล้ว' },
  { value: '< 1 นาที', label: 'เวลาสร้างคลิป' },
  { value: '4.9 ★', label: 'คะแนนความพึงพอใจ' },
]

const CLIP_STYLES = [
  { id: 'all',     label: '🔥 ทั้งหมด' },
  { id: 'urgent',  label: '⚡ เร่งด่วน' },
  { id: 'review',  label: '⭐ รีวิว' },
  { id: 'drama',   label: '😱 ดราม่า' },
  { id: 'unbox',   label: '📦 Unboxing' },
  { id: 'market',  label: '🛒 ตลาดนัด' },
]

const EXAMPLE_CLIPS = [
  { id:1, emoji:'💄', style:'เร่งด่วน', styleColor:'#FF7A00', bg:'linear-gradient(135deg,#FFF7ED,#FED7AA)', title:'ครีมบำรุงผิวหน้า ลด 50% วันนี้วันเดียว!', views:'128K', cat:'urgent' },
  { id:2, emoji:'👕', style:'รีวิว',    styleColor:'#7C3AED', bg:'linear-gradient(135deg,#F5F3FF,#DDD6FE)', title:'เสื้อผ้าแฟชั่นเกาหลี ราคาถูกสุดในไทย', views:'98K',  cat:'review' },
  { id:3, emoji:'🍳', style:'Unboxing', styleColor:'#0EA5E9', bg:'linear-gradient(135deg,#F0F9FF,#BAE6FD)', title:'หม้อทอดไร้น้ำมัน เปิดกล่องพร้อมทดสอบ', views:'203K', cat:'unbox' },
  { id:4, emoji:'💊', style:'ดราม่า',  styleColor:'#EF4444', bg:'linear-gradient(135deg,#FFF1F2,#FECDD3)', title:'อาหารเสริมลดน้ำหนัก ผลลัพธ์จริงไม่โกหก', views:'76K',  cat:'drama' },
  { id:5, emoji:'👟', style:'เร่งด่วน', styleColor:'#FF7A00', bg:'linear-gradient(135deg,#FFF7ED,#FED7AA)', title:'รองเท้าผ้าใบสไตล์เกาหลี เหลือ 10 คู่สุดท้าย', views:'145K', cat:'urgent' },
  { id:6, emoji:'🎒', style:'รีวิว',   styleColor:'#7C3AED', bg:'linear-gradient(135deg,#F5F3FF,#DDD6FE)', title:'กระเป๋าเป้ multi-function ใช้ได้ทุกวัน', views:'89K',  cat:'review' },
]

const HERO_CARDS = [
  { emoji:'⚡', label:'เร่งด่วน', bg:'linear-gradient(135deg,#FFF7ED,#FDBA74)', badge:'#FF7A00', title:'ลด 50% วันนี้วันเดียว!', views:'128K' },
  { emoji:'⭐', label:'รีวิว',   bg:'linear-gradient(135deg,#F5F3FF,#C4B5FD)', badge:'#7C3AED', title:'รีวิวจริง ลูกค้าเชื่อถือ', views:'98K' },
  { emoji:'😱', label:'ดราม่า', bg:'linear-gradient(135deg,#FFF1F2,#FCA5A5)', badge:'#EF4444', title:'เรื่องนี้ต้องบอกต่อ!', views:'76K' },
  { emoji:'📦', label:'Unboxing',bg:'linear-gradient(135deg,#F0F9FF,#7DD3FC)', badge:'#0EA5E9', title:'เปิดกล่อง ทดสอบสด', views:'203K' },
]

const PLANS = [
  {
    name: 'ทดลองฟรี', price: '0', unit: 'บาท', desc: 'ไม่ต้องใส่บัตรเครดิต',
    features: ['1 คลิป ฟรีทันที', 'ทุกสไตล์', 'เสียงพากย์ AI', 'ดาวน์โหลดได้'],
    cta: 'เริ่มฟรีเลย', href: '/register', highlight: false,
  },
  {
    name: 'Pro', price: '299', unit: 'บาท/เดือน', desc: 'สำหรับร้านที่ต้องการเติบโต',
    features: ['ไม่จำกัดจำนวนคลิป', 'ทุกสไตล์', 'เสียงพากย์ AI ทุกรูปแบบ', 'ซับไตเติลอัตโนมัติ', 'Export HD'],
    cta: 'เริ่มต้น Pro', href: '/register', highlight: true,
  },
  {
    name: 'Business', price: '799', unit: 'บาท/เดือน', desc: 'สำหรับธุรกิจหลายแบรนด์',
    features: ['ทุกอย่างใน Pro', 'หลาย Workspace', 'API Access', 'Support 24/7', 'Custom Voice'],
    cta: 'ติดต่อเรา', href: '/contact', highlight: false,
  },
]

function AnimSection({ children, className }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={`${className || ''} ${visible ? styles.visible : styles.hidden}`}>
      {children}
    </div>
  )
}

export default function Home() {
  const [activeStyle, setActiveStyle] = useState('all')

  const filtered = activeStyle === 'all'
    ? EXAMPLE_CLIPS
    : EXAMPLE_CLIPS.filter(c => c.cat === activeStyle)

  return (
    <main className={styles.main}>

      {/* ── NAV ── */}
      <nav className={styles.nav}>
        <span className={styles.logo}>
          Clip<span className={styles.logoAccent}>DD</span>
        </span>
        <div className={styles.navLinks}>
          <a href="#clips"   className={styles.navLink}>ตัวอย่างคลิป</a>
          <a href="#how"     className={styles.navLink}>วิธีใช้</a>
          <a href="#pricing" className={styles.navLink}>ราคา</a>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <a href="/login"    className={styles.navLink}>เข้าสู่ระบบ</a>
          <a href="/register" className={styles.navCta}>สมัครฟรี</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <AnimSection>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            🔥 มีร้านค้าใช้งานแล้ว 1,000+ ร้าน
          </div>
          <h1 className={styles.heroTitle}>
            สร้างคลิปขายของ<br />
            <span className={styles.heroAccent}>TikTok อัตโนมัติ</span><br />
            <span style={{ fontSize:'65%', fontWeight:700, color:'#6B7280' }}>ด้วย AI ใน 60 วินาที</span>
          </h1>
          <p className={styles.heroDesc}>
            ใส่สินค้า → AI เขียนสคริปต์ + พากย์เสียง + ตัดต่อวิดีโอให้อัตโนมัติ<br />
            ไม่ต้องมีทักษะตัดต่อ · ไม่ต้องจ้างช่างวิดีโอ
          </p>
          <div className={styles.heroActions}>
            <a href="/register" className={styles.heroPrimary}>
              สมัครฟรี — ลองสร้าง 1 คลิป
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
            <a href="/create" className={styles.heroSecondary}>
              เข้าระบบสร้างคลิป →
            </a>
          </div>
          <p className={styles.heroNote}>
            <span>✓ ฟรี 1 คลิปแรก</span> &nbsp;·&nbsp; <span>✓ ไม่ต้องบัตรเครดิต</span> &nbsp;·&nbsp; <span>✓ เริ่มได้ทันที</span>
          </p>
        </AnimSection>

        {/* RIGHT — 2×2 clip style cards */}
        <div className={styles.heroCards}>
          {HERO_CARDS.map(card => (
            <div key={card.label} className={styles.heroCard}>
              <div className={styles.heroCardThumb} style={{ background: card.bg }}>
                {card.emoji}
              </div>
              <div className={styles.heroCardBody}>
                <span className={styles.heroCardBadge} style={{ background: card.badge + '20', color: card.badge }}>
                  {card.label}
                </span>
                <p className={styles.heroCardTitle}>{card.title}</p>
                <p className={styles.heroCardViews}>👁 {card.views} views</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── STATS ── */}
      <div className={styles.stats}>
        <div className={styles.statsInner}>
          {STATS.map(s => (
            <div key={s.label}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CATEGORY PILLS ── */}
      <AnimSection>
        <div className={styles.pillsSection} id="clips">
          <p className={styles.pillsLabel}>สไตล์คลิป</p>
          <div className={styles.pills}>
            {CLIP_STYLES.map(s => (
              <button
                key={s.id}
                className={`${styles.pill} ${activeStyle === s.id ? styles.pillActive : ''}`}
                onClick={() => setActiveStyle(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </AnimSection>

      {/* ── EXAMPLE CLIPS ── */}
      <AnimSection>
        <div className={styles.clipsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>ตัวอย่างคลิปที่ AI สร้าง</h2>
            <a href="/register" className={styles.sectionMore}>สร้างของคุณเอง →</a>
          </div>
          <div className={styles.clipsGrid}>
            {filtered.map(clip => (
              <div key={clip.id} className={styles.clipCard}>
                <div className={styles.clipThumb} style={{ background: clip.bg }}>
                  {clip.emoji}
                  <span className={styles.clipStyleBadge} style={{ background: clip.styleColor }}>
                    {clip.style}
                  </span>
                </div>
                <div className={styles.clipBody}>
                  <p className={styles.clipTitle}>{clip.title}</p>
                  <div className={styles.clipMeta}>
                    <span className={styles.clipViews}>👁 {clip.views} views</span>
                  </div>
                  <a href="/register" className={styles.clipBtn}>สร้างคลิปแบบนี้</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimSection>

      {/* ── HOW IT WORKS ── */}
      <AnimSection>
        <section className={styles.howSection} id="how">
          <div className={styles.howInner}>
            <h2 className={styles.howTitle}>ใช้งานง่าย 3 ขั้นตอน</h2>
            <p className={styles.howSub}>ไม่ต้องมีทักษะพิเศษ ใครก็ทำได้</p>
            <div className={styles.howSteps}>
              {[
                { n:'1', title:'ใส่ข้อมูลสินค้า', desc:'ชื่อสินค้า จุดเด่น ราคา เลือกสไตล์คลิปที่ต้องการ' },
                { n:'2', title:'AI ประมวลผล', desc:'สคริปต์ + เสียงพากย์ + ตัดต่อวิดีโออัตโนมัติใน 60 วินาที' },
                { n:'3', title:'ดาวน์โหลด & โพสต์', desc:'รับไฟล์ MP4 พร้อมโพสต์ TikTok ทันที ไม่ต้องแก้ไขเพิ่ม' },
              ].map(step => (
                <div key={step.n} className={styles.howStep}>
                  <div className={styles.howNum}>{step.n}</div>
                  <h3 className={styles.howStepTitle}>{step.title}</h3>
                  <p className={styles.howStepDesc}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimSection>

      {/* ── PRICING ── */}
      <AnimSection>
        <section className={styles.pricingSection} id="pricing">
          <h2 className={styles.pricingTitle}>ราคาที่คุ้มค่า</h2>
          <p className={styles.pricingSub}>เริ่มฟรี ไม่ต้องใส่บัตรเครดิต</p>
          <div className={styles.pricingGrid}>
            {PLANS.map(plan => (
              <div key={plan.name} className={`${styles.planCard} ${plan.highlight ? styles.planCardHighlight : ''}`}>
                <p className={styles.planName}>{plan.name}</p>
                <p className={styles.planPrice}>
                  {plan.price} <span className={styles.planUnit}>{plan.unit}</span>
                </p>
                <p className={styles.planDesc}>{plan.desc}</p>
                <ul className={styles.planFeatures}>
                  {plan.features.map(f => (
                    <li key={f} className={styles.planFeature}>{f}</li>
                  ))}
                </ul>
                <a href={plan.href} className={styles.planCta}>{plan.cta}</a>
              </div>
            ))}
          </div>
        </section>
      </AnimSection>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerLogo}>
            Clip<span className={styles.footerLogoAccent}>DD</span>
          </span>
          <div className={styles.footerLinks}>
            <a href="#clips"   className={styles.footerLink}>ตัวอย่างคลิป</a>
            <a href="#pricing" className={styles.footerLink}>ราคา</a>
            <a href="/terms"   className={styles.footerLink}>ข้อกำหนด</a>
            <a href="/privacy" className={styles.footerLink}>ความเป็นส่วนตัว</a>
          </div>
          <p className={styles.footerCopy}>© 2025 ClipDD · สร้างคลิปขายของด้วย AI · All rights reserved</p>
        </div>
      </footer>

    </main>
  )
}
