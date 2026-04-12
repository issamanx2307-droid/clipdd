'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './page.module.css'

const STATS = [
  { value: '1,000+', label: 'ร้านค้าใช้งาน' },
  { value: '50,000+', label: 'คลิปที่สร้างแล้ว' },
  { value: '< 1 นาที', label: 'เวลาสร้างคลิป' },
  { value: '4.9 ★', label: 'คะแนนความพึงพอใจ' },
]

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI เขียนสคริปต์ขายของ',
    desc: 'GPT เขียน hook ที่ดึงดูด + script ขายของที่พิสูจน์แล้วว่าได้ผล',
  },
  {
    icon: '🎙️',
    title: 'เสียงพากย์อัตโนมัติ',
    desc: 'เสียง AI ที่ฟังดูเป็นธรรมชาติ เลือกได้ทั้งชาย-หญิง น้ำเสียงมีชีวิตชีวา',
  },
  {
    icon: '🎬',
    title: 'ตัดต่อวิดีโออัตโนมัติ',
    desc: 'ใส่ภาพสินค้า + ซับไตเติล + เพลงพื้นหลัง พร้อม export ในรูปแบบ TikTok',
  },
  {
    icon: '🔥',
    title: 'สไตล์ที่พิสูจน์แล้วว่าไวรัล',
    desc: 'เร่งด่วน / รีวิวสินค้า / ดราม่า / Unboxing — เลือกฟอร์แมตที่ใช่',
  },
  {
    icon: '📱',
    title: 'พร้อมโพสต์ทันที',
    desc: 'ขนาดสัดส่วน 9:16 สำหรับ TikTok โดยเฉพาะ ดาวน์โหลดได้เลยใน 1 คลิก',
  },
  {
    icon: '♾️',
    title: 'สร้างได้ไม่จำกัด',
    desc: 'แพ็กเกจ Premium สร้างได้ทุกวัน ไม่มีลิมิต เปลี่ยนสินค้าได้ตลอด',
  },
]

const STYLES = [
  { id: 'urgent', label: 'เร่งด่วน', icon: '⚡', color: '#ff6b35', desc: 'FOMO สูง กดออเดอร์ทันที' },
  { id: 'review', label: 'รีวิว', icon: '⭐', color: '#ffd700', desc: 'น่าเชื่อถือ ลูกค้าเชื่อ' },
  { id: 'drama', label: 'ดราม่า', icon: '😱', color: '#ff2d55', desc: 'เล่าเรื่อง ดูดความสนใจ' },
  { id: 'unbox', label: 'Unboxing', icon: '📦', color: '#00d4ff', desc: 'เปิดกล่อง สนุก น่าซื้อ' },
]

const TESTIMONIALS = [
  {
    name: 'คุณแพร',
    shop: 'ร้านเครื่องสำอาง @praeshop',
    avatar: '💄',
    text: 'เมื่อก่อนทำคลิปวันละ 1 อัน ใช้เวลา 2 ชั่วโมง ตอนนี้ทำ 10 อันต่อวัน ยอดขายเพิ่ม 3 เท่าในเดือนแรก!',
    result: 'ยอดขาย +300%',
  },
  {
    name: 'คุณต้น',
    shop: 'ร้านเสื้อผ้า @ton_fashion',
    avatar: '👕',
    text: 'ลองฟรี 3 คลิปแล้วปิดการขายได้ทันที สมัครแพ็กเกจเลยเลย ROI คืนทุนภายใน 1 อาทิตย์',
    result: 'คืนทุนใน 7 วัน',
  },
  {
    name: 'คุณนิ้ง',
    shop: 'ร้านอาหารเสริม @ning_health',
    avatar: '💊',
    text: 'ไม่ถนัดทำคลิปเลย แต่ ClipDD ทำให้คลิปออกมาดูเป็นมืออาชีพมาก ลูกค้าถามว่าจ้างทีมงานมาไหม',
    result: 'ดูเหมือนมีทีมงาน',
  },
]

const PLANS = [
  {
    name: 'ทดลองฟรี',
    price: '0',
    unit: 'บาท',
    desc: 'ไม่ต้องใส่บัตรเครดิต',
    features: ['3 คลิป ฟรีทันที', 'ทุกสไตล์', 'เสียงพากย์ AI', 'ดาวน์โหลดได้'],
    cta: 'เริ่มฟรีเลย',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '299',
    unit: 'บาท/เดือน',
    desc: 'สำหรับร้านที่ต้องการเติบโต',
    features: ['ไม่จำกัดจำนวนคลิป', 'ทุกสไตล์', 'เสียงพากย์ AI ทุกรูปแบบ', 'ซับไตเติลอัตโนมัติ', 'Export HD', 'ลำดับความสำคัญสูง'],
    cta: 'เริ่มต้น Pro',
    href: '/subscribe?plan=pro',
    highlight: true,
  },
  {
    name: 'Business',
    price: '799',
    unit: 'บาท/เดือน',
    desc: 'สำหรับธุรกิจหลายแบรนด์',
    features: ['ทุกอย่างใน Pro', 'หลาย Workspace', 'API Access', 'Webhook', 'Support ด่วน 24/7', 'Custom Voice'],
    cta: 'ติดต่อเรา',
    href: '/contact',
    highlight: false,
  },
]

function useInView(ref) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); observer.disconnect() }
    }, { threshold: 0.15 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return inView
}

function VideoDemo({ activeStyle }) {
  const videoRef = useRef(null)
  const wrapRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [muted, setMuted] = useState(true)

  // Observe when phone enters viewport
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setVisible(true)
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // When style changes or becomes visible, reload video
  useEffect(() => {
    const v = videoRef.current
    if (!v || !visible) return
    setLoaded(false)
    v.load()
    const onCanPlay = () => { setLoaded(true); v.play().catch(() => {}) }
    v.addEventListener('canplay', onCanPlay, { once: true })
    return () => v.removeEventListener('canplay', onCanPlay)
  }, [activeStyle, visible])

  const STYLE_META = {
    urgent: { color: '#ff6b35', label: '⚡ เร่งด่วน' },
    review: { color: '#22c55e', label: '⭐ รีวิว' },
    drama:  { color: '#9333ea', label: '😱 ดราม่า' },
    unbox:  { color: '#06b6d4', label: '📦 Unboxing' },
  }
  const meta = STYLE_META[activeStyle]

  return (
    <div ref={wrapRef} className={styles.videoDemoWrap}>
      {visible && (
        <video
          ref={videoRef}
          key={activeStyle}
          className={styles.demoVideo}
          autoPlay
          muted={muted}
          loop
          playsInline
          preload="none"
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.4s' }}
        >
          <source src={`/media/demos/${activeStyle}.mp4`} type="video/mp4" />
        </video>
      )}
      {/* Loading skeleton */}
      {(!visible || !loaded) && (
        <div className={styles.videoSkeleton} style={{ background: `linear-gradient(180deg, #111 0%, ${meta.color}22 100%)` }}>
          <span style={{ fontSize: '2rem' }}>{meta.label}</span>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>กำลังโหลด...</span>
        </div>
      )}
      <button
        className={styles.soundBtn}
        onClick={() => {
          setMuted(m => !m)
          if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted
            if (!videoRef.current.muted) videoRef.current.play().catch(() => {})
          }
        }}
        title={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  )
}

function AnimSection({ children, className }) {
  const ref = useRef(null)
  const visible = useInView(ref)
  return (
    <div ref={ref} className={`${className || ''} ${visible ? styles.visible : styles.hidden}`}>
      {children}
    </div>
  )
}

export default function Home() {
  const [activeStyle, setActiveStyle] = useState('urgent')
  const [tIndex, setTIndex] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => setTIndex(i => (i + 1) % TESTIMONIALS.length), 4000)
    return () => clearInterval(iv)
  }, [])

  // Auto-cycle styles in hero
  useEffect(() => {
    const ids = STYLES.map(s => s.id)
    const iv = setInterval(() => setActiveStyle(s => {
      const i = ids.indexOf(s)
      return ids[(i + 1) % ids.length]
    }), 3500)
    return () => clearInterval(iv)
  }, [])

  return (
    <main className={styles.main}>

      {/* ── NAV ── */}
      <nav className={styles.nav}>
        <span className={styles.logo}>
          Clip<span className={styles.logoAccent}>DD</span>
          <span className={styles.logoBeta}>AI</span>
        </span>
        <div className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>ฟีเจอร์</a>
          <a href="#how" className={styles.navLink}>วิธีใช้</a>
          <a href="#pricing" className={styles.navLink}>ราคา</a>
        </div>
        <a href="/register" className={styles.navCta}>สมัครฟรี</a>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroGlow2} />

        <div className={styles.heroLayout}>
          {/* LEFT — copy */}
          <AnimSection className={styles.heroLeft}>
            <div className={styles.badge}>
              <span className={styles.badgeDot} />
              🔥 มีร้านค้าใช้งานแล้ว 1,000+ ร้าน
            </div>

            <h1 className={styles.heroTitle}>
              สร้างคลิปขายของ<br />
              <span className={styles.heroGradientText}>TikTok อัตโนมัติ</span><br />
              <span className={styles.heroSub2}>ด้วย AI ใน 60 วินาที</span>
            </h1>

            <p className={styles.heroDesc}>
              ใส่สินค้า → AI เขียนสคริปต์ไวรัล + พากย์เสียง + ตัดต่อวิดีโอให้อัตโนมัติ<br />
              <strong>ไม่ต้องมีทักษะตัดต่อ</strong> · <strong>ไม่ต้องจ้างช่างวิดีโอ</strong>
            </p>

            <a href="/register" className={styles.heroCta}>
              <span>สมัครฟรี — ทดลองสร้าง 1 คลิป</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
            <p className={styles.heroNote}>✓ ไม่ต้องใส่บัตรเครดิต &nbsp;·&nbsp; ✓ เริ่มได้ทันที &nbsp;·&nbsp; ✓ ฟรี 1 คลิปแรก</p>

            {/* inline stats on desktop */}
            <div className={styles.heroInlineStats}>
              {STATS.map(s => (
                <div key={s.label} className={styles.heroStatItem}>
                  <span className={styles.heroStatValue}>{s.value}</span>
                  <span className={styles.heroStatLabel}>{s.label}</span>
                </div>
              ))}
            </div>
          </AnimSection>

          {/* RIGHT — phone with live demo */}
          <div className={styles.heroRight}>
            <div className={styles.phoneGlow} />
            <div className={styles.phone}>
              <div className={styles.phoneNotch} />
              <div className={styles.phoneScreen}>
                <VideoDemo activeStyle={activeStyle} />
                <div className={styles.phoneSidebar}>
                  <div className={styles.sideAction}>❤️<br /><span>24.5K</span></div>
                  <div className={styles.sideAction}>💬<br /><span>892</span></div>
                  <div className={styles.sideAction}>↗️<br /><span>แชร์</span></div>
                </div>
              </div>
            </div>
            {/* Style tabs under phone */}
            <div className={styles.heroStyleTabs}>
              {STYLES.map(s => (
                <button
                  key={s.id}
                  className={`${styles.heroStyleTab} ${activeStyle === s.id ? styles.heroStyleTabActive : ''}`}
                  style={activeStyle === s.id ? { borderColor: s.color, color: s.color } : {}}
                  onClick={() => setActiveStyle(s.id)}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* STATS BAR — mobile only (hidden on desktop, shown inline above) */}
        <div className={styles.statsBarMobile}>
          {STATS.map(s => (
            <div key={s.label} className={styles.statItem}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── DEMO PREVIEW ── */}
      <section className={styles.demo} id="demo">
        <AnimSection className={styles.demoInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>ดูตัวอย่าง</span>
            <h2 className={styles.sectionTitle}>ผลลัพธ์ที่คุณได้รับ</h2>
            <p className={styles.sectionDesc}>เลือกสไตล์ → AI สร้างสคริปต์และคลิปให้อัตโนมัติ</p>
          </div>

          <div className={styles.demoLayout}>
            {/* Style Picker */}
            <div className={styles.stylePicker}>
              <p className={styles.styleLabel}>เลือกสไตล์คลิป</p>
              {STYLES.map(s => (
                <button
                  key={s.id}
                  className={`${styles.styleBtn} ${activeStyle === s.id ? styles.styleBtnActive : ''}`}
                  style={activeStyle === s.id ? { borderColor: s.color, boxShadow: `0 0 20px ${s.color}30` } : {}}
                  onClick={() => setActiveStyle(s.id)}
                >
                  <span className={styles.styleBtnIcon}>{s.icon}</span>
                  <div>
                    <div className={styles.styleBtnTitle}>{s.label}</div>
                    <div className={styles.styleBtnDesc}>{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Phone Mockup */}
            <div className={styles.phoneWrap}>
              <div className={styles.phoneGlow} />
              <div className={styles.phone}>
                <div className={styles.phoneNotch} />
                <div className={styles.phoneScreen}>
                  <VideoDemo activeStyle={activeStyle} />
                  {/* TikTok sidebar overlay */}
                  <div className={styles.phoneSidebar}>
                    <div className={styles.sideAction}>❤️<br /><span>24.5K</span></div>
                    <div className={styles.sideAction}>💬<br /><span>892</span></div>
                    <div className={styles.sideAction}>↗️<br /><span>แชร์</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className={styles.demoSteps}>
              <p className={styles.styleLabel}>ขั้นตอนการสร้าง</p>
              {[
                { num: '01', icon: '⌨️', title: 'พิมพ์ชื่อสินค้า', desc: 'บอก AI แค่ชื่อสินค้าและจุดเด่น' },
                { num: '02', icon: '🎨', title: 'เลือกสไตล์', desc: 'เลือกฟอร์แมตที่เหมาะกับสินค้า' },
                { num: '03', icon: '⬇️', title: 'ดาวน์โหลด', desc: 'คลิปพร้อม โพสต์ TikTok ได้เลย' },
              ].map(s => (
                <div key={s.num} className={styles.demoStep}>
                  <div className={styles.demoStepNum}>{s.icon}</div>
                  <div>
                    <div className={styles.demoStepTitle}>{s.title}</div>
                    <div className={styles.demoStepDesc}>{s.desc}</div>
                  </div>
                </div>
              ))}
              <a href="/register" className={styles.demoCtaBtn}>
                ลองสร้างคลิปฟรีเลย →
              </a>
            </div>
          </div>
        </AnimSection>
      </section>

      {/* ── FEATURES ── */}
      <section className={styles.features} id="features">
        <AnimSection className={styles.featuresInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>ฟีเจอร์</span>
            <h2 className={styles.sectionTitle}>ทุกอย่างที่ต้องการ ครบในที่เดียว</h2>
          </div>
          <div className={styles.featureGrid}>
            {FEATURES.map(f => (
              <div key={f.title} className={styles.featureCard}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </AnimSection>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className={styles.howto} id="how">
        <AnimSection className={styles.howtoInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>วิธีใช้งาน</span>
            <h2 className={styles.sectionTitle}>ง่ายกว่าที่คิด ใน 3 ขั้นตอน</h2>
          </div>
          <div className={styles.howSteps}>
            {[
              { num: '01', icon: '📝', title: 'ใส่ข้อมูลสินค้า', desc: 'พิมพ์ชื่อสินค้า ราคา จุดเด่น ใช้เวลา 30 วินาที' },
              { num: '02', icon: '🤖', title: 'AI ทำงาน', desc: 'เขียนสคริปต์ + พากย์เสียง + ตัดต่อวิดีโอ อัตโนมัติ' },
              { num: '03', icon: '🚀', title: 'โพสต์ TikTok', desc: 'ดาวน์โหลดคลิปพร้อมแฮชแท็ก โพสต์ได้เลยทันที' },
            ].map((s, i) => (
              <div key={s.num} className={styles.howStep}>
                <div className={styles.howStepNum}>{s.num}</div>
                {i < 2 && <div className={styles.howStepArrow}>→</div>}
                <div className={styles.howStepIcon}>{s.icon}</div>
                <h3 className={styles.howStepTitle}>{s.title}</h3>
                <p className={styles.howStepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </AnimSection>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className={styles.testimonials}>
        <AnimSection className={styles.testimonialsInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>รีวิวจริง</span>
            <h2 className={styles.sectionTitle}>แม่ค้าที่ใช้บอกว่าอย่างไร?</h2>
          </div>
          <div className={styles.tGrid}>
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                className={`${styles.tCard} ${tIndex === i ? styles.tCardActive : ''}`}
              >
                <div className={styles.tResult}>{t.result}</div>
                <p className={styles.tText}>"{t.text}"</p>
                <div className={styles.tAuthor}>
                  <span className={styles.tAvatar}>{t.avatar}</span>
                  <div>
                    <div className={styles.tName}>{t.name}</div>
                    <div className={styles.tShop}>{t.shop}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.tDots}>
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                className={`${styles.tDot} ${tIndex === i ? styles.tDotActive : ''}`}
                onClick={() => setTIndex(i)}
              />
            ))}
          </div>
        </AnimSection>
      </section>

      {/* ── PRICING ── */}
      <section className={styles.pricing} id="pricing">
        <AnimSection className={styles.pricingInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>ราคา</span>
            <h2 className={styles.sectionTitle}>เริ่มฟรี ขยายได้ตามธุรกิจ</h2>
            <p className={styles.sectionDesc}>ยกเลิกได้ตลอดเวลา ไม่มีสัญญาผูกมัด</p>
          </div>
          <div className={styles.planGrid}>
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`${styles.planCard} ${plan.highlight ? styles.planHighlight : ''}`}
              >
                {plan.highlight && <div className={styles.planBadge}>🔥 ยอดนิยม</div>}
                <div className={styles.planName}>{plan.name}</div>
                <div className={styles.planPrice}>
                  <span className={styles.planPriceNum}>{plan.price}</span>
                  <span className={styles.planUnit}> {plan.unit}</span>
                </div>
                <p className={styles.planDesc}>{plan.desc}</p>
                <ul className={styles.planFeatures}>
                  {plan.features.map(f => (
                    <li key={f} className={styles.planFeature}>
                      <span className={styles.planCheck}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.href}
                  className={`${styles.planCta} ${plan.highlight ? styles.planCtaHighlight : ''}`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </AnimSection>
      </section>

      {/* ── FINAL CTA ── */}
      <section className={styles.finalCta}>
        <div className={styles.finalGlow} />
        <AnimSection className={styles.finalInner}>
          <h2 className={styles.finalTitle}>
            พร้อมสร้างคลิปไวรัล<br />แล้วใช่ไหม?
          </h2>
          <p className={styles.finalDesc}>
            เริ่มต้นฟรี ไม่ต้องใส่บัตรเครดิต ทดลองสร้าง 3 คลิปแรกได้เลยทันที
          </p>
          <a href="/register" className={styles.finalBtn}>
            เริ่มสร้างคลิปฟรีเลย →
          </a>
          <div className={styles.finalTrust}>
            <span>🔒 ปลอดภัย 100%</span>
            <span>⚡ เริ่มได้ใน 30 วินาที</span>
            <span>🎁 ฟรี 3 คลิปแรก</span>
          </div>
        </AnimSection>
      </section>

      {/* ── SEO Structured Data ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "SoftwareApplication",
              "name": "ClipDD",
              "url": "https://clipdd.com",
              "applicationCategory": "MultimediaApplication",
              "operatingSystem": "Web",
              "description": "AI สร้างคลิปขายของ TikTok อัตโนมัติ — สคริปต์ เสียงพากย์ไทย ภาพ ตัดต่อ ใน 1 นาที",
              "offers": [
                { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "THB", "description": "3 คลิปฟรี" },
                { "@type": "Offer", "name": "Pro", "price": "299", "priceCurrency": "THB", "description": "ไม่จำกัดคลิป/เดือน" }
              ],
              "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "ratingCount": "120" }
            },
            {
              "@type": "Organization",
              "name": "ClipDD",
              "url": "https://clipdd.com",
              "logo": "https://clipdd.com/logo.png",
              "sameAs": []
            },
            {
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "ClipDD คืออะไร?",
                  "acceptedAnswer": { "@type": "Answer", "text": "ClipDD คือบริการ AI ที่สร้างคลิปขายของ TikTok อัตโนมัติ ตั้งแต่สคริปต์ เสียงพากย์ไทย ภาพสินค้า จนถึงตัดต่อ ทั้งหมดใน 1 นาที" }
                },
                {
                  "@type": "Question",
                  "name": "ใช้ฟรีได้ไหม?",
                  "acceptedAnswer": { "@type": "Answer", "text": "ได้เลย สมัครฟรีได้ 3 คลิปแรก ไม่ต้องใส่บัตรเครดิต" }
                },
                {
                  "@type": "Question",
                  "name": "คลิปที่ได้ใช้โพสต์ TikTok ได้เลยไหม?",
                  "acceptedAnswer": { "@type": "Answer", "text": "ได้เลย ไฟล์ MP4 ขนาด 9:16 พร้อมโพสต์ TikTok, Reels, Shorts ทันที" }
                }
              ]
            }
          ]
        })}}
      />

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <span className={styles.logo}>Clip<span className={styles.logoAccent}>DD</span></span>
            <p className={styles.footerTagline}>AI สร้างคลิปขายของ TikTok อัตโนมัติ</p>
          </div>
          <div className={styles.footerLinks}>
            <a href="/register" className={styles.footerLink}>เริ่มใช้งาน</a>
            <a href="#pricing" className={styles.footerLink}>ราคา</a>
            <a href="/terms" className={styles.footerLink}>ข้อกำหนด</a>
            <a href="/privacy" className={styles.footerLink}>ความเป็นส่วนตัว</a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2025 ClipDD · All rights reserved · <a href="/terms" style={{color:'inherit',opacity:0.6}}>Terms</a> · <a href="/privacy" style={{color:'inherit',opacity:0.6}}>Privacy</a></span>
        </div>
      </footer>
    </main>
  )
}
