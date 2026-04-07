'use client'
import { useState, useEffect, useRef } from 'react'
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
    href: '/create',
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
  const [product, setProduct] = useState('')
  const [activeStyle, setActiveStyle] = useState('urgent')
  const [tIndex, setTIndex] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => setTIndex(i => (i + 1) % TESTIMONIALS.length), 4000)
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
        <a href="/create" className={styles.navCta}>ทดลองฟรี</a>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroGlow2} />

        <AnimSection className={styles.heroInner}>
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
            แค่พิมพ์ชื่อสินค้า — AI เขียนสคริปต์ไวรัล + พากย์เสียง + ตัดต่อวิดีโอให้อัตโนมัติ<br />
            <strong>ไม่ต้องมีทักษะตัดต่อ</strong> · <strong>ไม่ต้องจ้างช่างวิดีโอ</strong>
          </p>

          <div className={styles.heroInputWrap}>
            <input
              className={styles.input}
              placeholder="เช่น: ครีมกันแดด SPF50 ราคา 290 บาท..."
              value={product}
              onChange={e => setProduct(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (window.location.href = `/create${product ? `?product=${encodeURIComponent(product)}` : ''}`)}
            />
            <a
              href={`/create${product ? `?product=${encodeURIComponent(product)}` : ''}`}
              className={styles.heroCta}
            >
              <span>ทดลองสร้างฟรี 3 คลิป</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          <p className={styles.heroNote}>✓ ไม่ต้องใส่บัตรเครดิต &nbsp;·&nbsp; ✓ เริ่มได้ทันที &nbsp;·&nbsp; ✓ ฟรี 3 คลิปแรก</p>
        </AnimSection>

        {/* STATS BAR */}
        <div className={styles.statsBar}>
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
                  {activeStyle === 'urgent' && (
                    <div className={styles.screenContent}>
                      <div className={styles.scHook}>⚡ หยุดก่อน!! อย่าเลื่อนผ่าน</div>
                      <div className={styles.scProduct}>ครีมกันแดด SPF50</div>
                      <div className={styles.scBody}>ใช้แล้วหน้าไม่ดำ กันแดดติดทนทั้งวัน<br />โปรนี้เหลือแค่วันนี้วันเดียว!!</div>
                      <div className={styles.scTimer}>⏰ เหลือ 02:47 นาที</div>
                      <div className={styles.scCta}>กดตะกร้าด่วนเลย!</div>
                      <div className={styles.scTags}>#กันแดด #ของดีบอกต่อ #TikTokขายของ</div>
                    </div>
                  )}
                  {activeStyle === 'review' && (
                    <div className={styles.screenContent}>
                      <div className={styles.scHook}>⭐⭐⭐⭐⭐ รีวิวจริง</div>
                      <div className={styles.scProduct}>ใช้มาแล้ว 3 เดือน</div>
                      <div className={styles.scBody}>ก่อนหน้านี้หน้าดำมาก<br />หลังใช้ครีมนี้ผิวสว่างขึ้นชัดเลย<br />ราคาคุ้มมากๆ แนะนำเลย!</div>
                      <div className={styles.scCta}>ลิงก์อยู่ใน bio นะคะ</div>
                      <div className={styles.scTags}>#รีวิวสินค้า #ของดี</div>
                    </div>
                  )}
                  {activeStyle === 'drama' && (
                    <div className={styles.screenContent}>
                      <div className={styles.scHook}>😱 ทำไมไม่มีใครบอก?!</div>
                      <div className={styles.scProduct}>ความลับที่พนักงานซ่อนไว้</div>
                      <div className={styles.scBody}>ฉันเสียเงินไปหมื่นกว่าบาท<br />กับสปาแพงๆ ทั้งที่จริงๆ<br />แค่ตัวนี้ก็พอแล้ว!!</div>
                      <div className={styles.scCta}>แชร์ก่อนโดนลบ 🔥</div>
                      <div className={styles.scTags}>#เปิดโปง #ความจริง</div>
                    </div>
                  )}
                  {activeStyle === 'unbox' && (
                    <div className={styles.screenContent}>
                      <div className={styles.scHook}>📦 แกะกล่องพัสดุด้วยกัน!</div>
                      <div className={styles.scProduct}>สั่งมาแล้ว 3 วัน</div>
                      <div className={styles.scBody}>packaging สวยมาก<br />ของตรงปก คุณภาพดีกว่าที่คิด<br />ราคานี้คุ้มมากจริงๆ</div>
                      <div className={styles.scCta}>ลองดูสิ คุ้มมาก!</div>
                      <div className={styles.scTags}>#unboxing #haul #พัสดุมา</div>
                    </div>
                  )}
                  {/* Bottom Bar */}
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
              <a href="/create" className={styles.demoCtaBtn}>
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
          <a href="/create" className={styles.finalBtn}>
            เริ่มสร้างคลิปฟรีเลย →
          </a>
          <div className={styles.finalTrust}>
            <span>🔒 ปลอดภัย 100%</span>
            <span>⚡ เริ่มได้ใน 30 วินาที</span>
            <span>🎁 ฟรี 3 คลิปแรก</span>
          </div>
        </AnimSection>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <span className={styles.logo}>Clip<span className={styles.logoAccent}>DD</span></span>
            <p className={styles.footerTagline}>AI สร้างคลิปขายของ TikTok อัตโนมัติ</p>
          </div>
          <div className={styles.footerLinks}>
            <a href="/create" className={styles.footerLink}>เริ่มใช้งาน</a>
            <a href="#pricing" className={styles.footerLink}>ราคา</a>
            <a href="/contact" className={styles.footerLink}>ติดต่อ</a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2025 ClipDD · All rights reserved</span>
        </div>
      </footer>
    </main>
  )
}
