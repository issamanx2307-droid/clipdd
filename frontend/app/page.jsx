'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import styles from './page.module.css'

// ── static defaults ────────────────────────────────────────────────
const DEFAULT_DEALS = [
  { id:1, emoji:'💡', title:'ไฟ Ring Light LED', desc:'แสงสวย เซลฟี่คลิปชัด ขายของออนไลน์ดูน่าเชื่อถือขึ้น', price:'฿299', badge:'ขายดี', bg:'linear-gradient(135deg,#FFF7ED,#FED7AA)', url:'/deals' },
  { id:2, emoji:'🎙️', title:'ไมโครโฟน Clip-on', desc:'เสียงพากย์ใสชัด ไม่มีเสียงรบกวน เหมาะกับ TikTok Live', price:'฿490', badge:'แนะนำ', bg:'linear-gradient(135deg,#F5F3FF,#DDD6FE)', url:'/deals' },
  { id:3, emoji:'📱', title:'ขาตั้งโทรศัพท์', desc:'ถ่ายคลิปคนเดียวได้ มุมกล้องปรับได้ 360 องศา', price:'฿199', badge:'ใหม่', bg:'linear-gradient(135deg,#F0F9FF,#BAE6FD)', url:'/deals' },
  { id:4, emoji:'🎬', title:'Green Screen ผ้าพื้นเขียว', desc:'เปลี่ยนแบ็คกราวนด์ได้ทุกแบบ ทำ effect ดูโปร', price:'฿350', badge:'ฮิต', bg:'linear-gradient(135deg,#F0FDF4,#BBF7D0)', url:'/deals' },
]

const DEFAULT_ARTICLES = [
  { id:1, cat:'เทคนิค TikTok', bg:'linear-gradient(135deg,#FFF7ED,#FED7AA)', catColor:'#FF7A00', title:'10 วิธีเพิ่มยอดวิวคลิปสินค้าบน TikTok ให้ได้ล้านวิวใน 2025', excerpt:'เทคนิคที่ร้านค้าหลายร้านใช้จนยอดขายพุ่ง ปรับได้ทันที ไม่ต้องใช้ทักษะตัดต่อ', readTime:'5 นาที', url:'/articles' },
  { id:2, cat:'สคริปต์คลิป', bg:'linear-gradient(135deg,#F5F3FF,#DDD6FE)', catColor:'#7C3AED', title:'สูตรเขียนสคริปต์ขายของสไตล์ Viral — Hook 3 วินาทีแรกต้องทำให้หยุดเลื่อน', excerpt:'โครงสร้างสคริปต์ที่ AI ของเราใช้ พร้อมตัวอย่างคลิปขายดีจริงของลูกค้า', readTime:'7 นาที', url:'/articles' },
  { id:3, cat:'เพิ่มยอดขาย', bg:'linear-gradient(135deg,#F0FDF4,#BBF7D0)', catColor:'#059669', title:'เปรียบเทียบ: ร้านที่ใช้ AI สร้างคลิปกับร้านที่ถ่ายเองธรรมดา ต่างกันแค่ไหน?', excerpt:'เคสจริงจากร้านค้าใน ClipDD วิเคราะห์ยอดวิว engagement และ conversion', readTime:'6 นาที', url:'/articles' },
]

const DEFAULT_STATS = [
  { value: '1,000+', label: 'ร้านค้าใช้งาน' },
  { value: '50,000+', label: 'คลิปที่สร้างแล้ว' },
  { value: '< 1 นาที', label: 'เวลาสร้างคลิป' },
  { value: '4.9 ★', label: 'คะแนนความพึงพอใจ' },
]

const DEFAULT_HERO = {
  badge: 'มีร้านค้าใช้งานแล้ว 1,000+ ร้าน',
  title_line1: 'สร้างคลิปขายของ',
  title_accent: 'TikTok อัตโนมัติ',
  title_sub: 'ด้วย AI ใน 60 วินาที',
  desc: 'ใส่สินค้า → AI เขียนสคริปต์ + พากย์เสียง + ตัดต่อวิดีโอให้อัตโนมัติ\nไม่ต้องมีทักษะตัดต่อ · ไม่ต้องจ้างช่างวิดีโอ',
  cta_primary: 'สมัครฟรี — ลองสร้าง 1 คลิป',
  cta_secondary: 'เข้าระบบสร้างคลิป →',
  note: '✓ ฟรี 1 คลิปแรก · ✓ ไม่ต้องบัตรเครดิต · ✓ เริ่มได้ทันที',
}

const STATS = DEFAULT_STATS

const CLIP_STYLES = [
  { id: 'all',     label: '🔥 ทั้งหมด' },
  { id: 'urgent',  label: '⚡ เร่งด่วน' },
  { id: 'review',  label: '⭐ รีวิว' },
  { id: 'drama',   label: '😱 ดราม่า' },
  { id: 'unbox',   label: '📦 Unboxing' },
  { id: 'market',  label: '🛒 ตลาดนัด' },
]

const CAT_COLOR = { urgent:'#FF7A00', review:'#7C3AED', drama:'#EF4444', unbox:'#0EA5E9', market:'#059669' }
const CAT_LABEL = { urgent:'เร่งด่วน', review:'รีวิว', drama:'ดราม่า', unbox:'Unboxing', market:'ตลาดนัด' }
const PLACEHOLDER_COUNT = 6

const DEMO_VIDEOS = [
  { slot:'urgent', label:'เร่งด่วน', badge:'#FF7A00', title:'Flash Sale / FOMO สูง',      bg:'linear-gradient(135deg,#FFF7ED,#FDBA74)', emoji:'⚡' },
  { slot:'review', label:'รีวิว',    badge:'#7C3AED', title:'น่าเชื่อถือ บอกต่อ',         bg:'linear-gradient(135deg,#F5F3FF,#C4B5FD)', emoji:'⭐' },
  { slot:'drama',  label:'ดราม่า',   badge:'#EF4444', title:'Before/After อารมณ์แรง',     bg:'linear-gradient(135deg,#FFF1F2,#FCA5A5)', emoji:'😱' },
  { slot:'unbox',  label:'Unboxing', badge:'#0EA5E9', title:'เปิดกล่อง reveal',            bg:'linear-gradient(135deg,#F0F9FF,#7DD3FC)', emoji:'📦' },
]

function VideoCard({ slot, label, badge, title, bg, emoji }) {
  const vidRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  function play() {
    const v = vidRef.current
    if (!v) return
    v.play().then(() => setPlaying(true)).catch(() => {})
  }
  function stop() {
    const v = vidRef.current
    if (!v) return
    v.pause(); v.currentTime = 0; setPlaying(false)
  }

  return (
    <div className={styles.heroCard}
      onMouseEnter={play} onMouseLeave={stop}
      onClick={() => playing ? stop() : play()}>
      <div className={styles.heroCardThumb}>
        <div className={styles.heroCardPlaceholder} style={{ background: bg, opacity: playing ? 0 : 1 }}>
          <span className={styles.heroCardEmoji}>{emoji}</span>
        </div>
        <video ref={vidRef} src={`/media/demos/${slot}.mp4`}
          className={styles.heroCardVideo} style={{ opacity: playing ? 1 : 0 }}
          muted loop playsInline preload="none" />
        <span className={styles.heroCardBadgeOverlay} style={{ background: badge + '22', color: badge }}>
          {label}
        </span>
      </div>
      <div className={styles.heroCardBody}>
        <p className={styles.heroCardTitle}>{title}</p>
      </div>
    </div>
  )
}

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

function ClipCard({ thumb }) {
  const vidRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const isVideo = thumb?.file_type === 'video'

  function play() {
    const v = vidRef.current; if (!v) return
    v.play().then(() => setPlaying(true)).catch(() => {})
  }
  function stop() {
    const v = vidRef.current; if (!v) return
    v.pause(); v.currentTime = 0; setPlaying(false)
  }

  return (
    <a href="/clips" className={styles.clipCard}
      onMouseEnter={isVideo ? play : undefined}
      onMouseLeave={isVideo ? stop : undefined}
      onClick={isVideo ? (e) => { e.preventDefault(); playing ? stop() : play() } : undefined}>
      <div className={styles.clipThumb}>
        {!thumb && <div className={styles.clipThumbPlaceholder} />}
        {thumb && !isVideo && <img src={thumb.file_url} alt={thumb.title} className={styles.clipThumbImg} />}
        {thumb && isVideo && <>
          <div className={styles.clipThumbPlaceholder} style={{ opacity: playing ? 0 : 1, position:'absolute', inset:0, background:'#111' }} />
          <video ref={vidRef} src={thumb.file_url} className={styles.clipThumbImg}
            style={{ opacity: playing ? 1 : 0, transition:'opacity .3s', position:'absolute', inset:0 }}
            muted loop playsInline preload="none" />
          {!playing && <span className={styles.clipPlayIcon}>▶</span>}
        </>}
      </div>
    </a>
  )
}

export default function Home() {
  const [activeStyle, setActiveStyle] = useState('all')
  const [hero, setHero] = useState(DEFAULT_HERO)
  const [stats, setStats] = useState(DEFAULT_STATS)
  const [deals, setDeals] = useState(DEFAULT_DEALS)
  const [articles, setArticles] = useState(DEFAULT_ARTICLES)
  const [thumbs, setThumbs] = useState([])   // [] = loaded but empty

  useEffect(() => {
    fetch('/api/site-content/').then(r => r.ok ? r.json() : null).then(data => {
      if (!data) return
      if (data.hero) setHero(data.hero)
      if (data.stats?.length) setStats(data.stats)
      if (data.deals?.length) setDeals(data.deals)
      if (data.articles?.length) setArticles(data.articles)
    }).catch(() => {})
    fetch('/api/clip-thumbnails/').then(r => r.ok ? r.json() : []).then(data => {
      setThumbs(Array.isArray(data) ? data : [])
    }).catch(() => {})
  }, [])

  // Shuffle once on load, show 6
  const displayThumbs = useMemo(() => {
    const arr = [...thumbs]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr.slice(0, 6)
  }, [thumbs])

  return (
    <main className={styles.main}>

      {/* ── NAV ── */}
      <nav className={styles.nav}>
        <span className={styles.logo}>
          Clip<span className={styles.logoAccent}>DD</span>
        </span>
        <div className={styles.navLinks}>
          <a href="#clips"    className={styles.navLink}>ตัวอย่างคลิป</a>
          <a href="#deals"    className={styles.navLink}>ดีล</a>
          <a href="#articles" className={styles.navLink}>บทความ</a>
          <a href="#how"      className={styles.navLink}>วิธีใช้</a>
          <a href="#pricing"  className={styles.navLink}>ราคา</a>
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
            🔥 {hero.badge}
          </div>
          <h1 className={styles.heroTitle}>
            {hero.title_line1}<br />
            <span className={styles.heroAccent}>{hero.title_accent}</span><br />
            <span style={{ fontSize:'65%', fontWeight:700, color:'#6B7280' }}>{hero.title_sub}</span>
          </h1>
          <p className={styles.heroDesc}>
            {hero.desc.split('\n').map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
          </p>
          <div className={styles.heroActions}>
            <a href="/register" className={styles.heroPrimary}>
              {hero.cta_primary}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
            <a href="/create" className={styles.heroSecondary}>
              {hero.cta_secondary}
            </a>
          </div>
          <p className={styles.heroNote}>
            {hero.note.split('·').map((s, i) => (
              <span key={i}>{i > 0 && <>&nbsp;·&nbsp;</>}<span>{s.trim()}</span></span>
            ))}
          </p>
        </AnimSection>

        {/* RIGHT — 2×2 demo video cards (hover to play) */}
        <div className={styles.heroCards}>
          {DEMO_VIDEOS.map(v => <VideoCard key={v.slot} {...v} />)}
        </div>
      </section>

      {/* ── STATS ── */}
      <div className={styles.stats}>
        <div className={styles.statsInner}>
          {stats.map(s => (
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

      {/* ── FUNNY CLIPS ── */}
      <AnimSection>
        <div className={styles.clipsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>😂 รวมคลิปขำๆ</h2>
            <a href="/clips" className={styles.sectionMore}>ดูทั้งหมด →</a>
          </div>
          <div className={styles.clipsGrid}>
            {(displayThumbs.length > 0 ? displayThumbs : Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => null)).map((thumb, i) => (
              <ClipCard key={thumb?.id ?? i} thumb={thumb} />
            ))}
          </div>
        </div>
      </AnimSection>

      {/* ── DEALS / AFFILIATE ── */}
      <AnimSection>
        <section className={styles.dealsSection} id="deals">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>🛒 อุปกรณ์แนะนำสำหรับคลิปขายของ</h2>
            <a href="/deals" className={styles.sectionMore}>ดูดีลทั้งหมด →</a>
          </div>
          <div className={styles.dealsGrid}>
            {deals.map(p => (
              <div key={p.id} className={styles.dealCard}>
                <div className={styles.dealThumb} style={{ background: p.bg }}>{p.emoji}</div>
                <div className={styles.dealBody}>
                  <span className={styles.dealBadge}>{p.badge}</span>
                  <h3 className={styles.dealTitle}>{p.title}</h3>
                  <p className={styles.dealDesc}>{p.desc}</p>
                  <div className={styles.dealFooter}>
                    <span className={styles.dealPrice}>{p.price}</span>
                    <a href={p.url || '/deals'} className={styles.dealBtn}>ดูราคา</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </AnimSection>

      {/* ── ARTICLES ── */}
      <AnimSection>
        <section className={styles.articlesSection} id="articles">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>📖 บทความน่าอ่าน</h2>
            <a href="/articles" className={styles.sectionMore}>ดูทั้งหมด →</a>
          </div>
          <div className={styles.articlesGrid}>
            {articles.map(a => (
              <article key={a.id} className={styles.articleCard}>
                <div className={styles.articleCover} style={{ background: a.bg }} />
                <div className={styles.articleBody}>
                  <span className={styles.articleCat} style={{ color: a.catColor, background: a.catColor + '18' }}>{a.cat}</span>
                  <h3 className={styles.articleTitle}>{a.title}</h3>
                  <p className={styles.articleExcerpt}>{a.excerpt}</p>
                  <div className={styles.articleFooter}>
                    <span className={styles.articleRead}>⏱ {a.readTime}</span>
                    <a href={a.url || '/articles'} className={styles.articleBtn}>อ่านต่อ →</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
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
            <a href="#clips"    className={styles.footerLink}>ตัวอย่างคลิป</a>
            <a href="/deals"    className={styles.footerLink}>ดีล</a>
            <a href="/articles" className={styles.footerLink}>บทความ</a>
            <a href="#pricing"  className={styles.footerLink}>ราคา</a>
            <a href="/terms"    className={styles.footerLink}>ข้อกำหนด</a>
            <a href="/privacy"  className={styles.footerLink}>ความเป็นส่วนตัว</a>
          </div>
          <p className={styles.footerCopy}>© 2025 ClipDD · สร้างคลิปขายของด้วย AI · All rights reserved</p>
        </div>
      </footer>

    </main>
  )
}
