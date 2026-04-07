'use client'
import { useState } from 'react'
import styles from './page.module.css'

const PAIN_POINTS = [
  { icon: '❌', text: 'คิดคลิปไม่ออก' },
  { icon: '❌', text: 'ถ่ายไม่สวย' },
  { icon: '❌', text: 'ไม่รู้จะพูดอะไร' },
]

const STEPS = [
  { num: '01', title: 'ใส่สินค้า', desc: 'แค่พิมพ์ชื่อสินค้าและจุดเด่น' },
  { num: '02', title: 'เลือกสไตล์', desc: 'เร่งด่วน / รีวิว / ดราม่า' },
  { num: '03', title: 'ได้คลิปทันที', desc: 'ดาวน์โหลดพร้อมโพสต์เลย' },
]

export default function Home() {
  const [product, setProduct] = useState('')

  return (
    <main className={styles.main}>
      {/* Nav */}
      <nav className={styles.nav}>
        <span className={styles.logo}>Clip<span className={styles.logoAccent}>DD</span></span>
        <a href="/create" className={styles.navCta}>ทดลองฟรี</a>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.badge}>🔥 มีคนใช้แล้ว 1,000+ ร้าน</div>
        <h1 className={styles.heroTitle}>
          สร้างคลิปขายของ<br />
          <span className={styles.heroGradient}>TikTok อัตโนมัติ</span>
        </h1>
        <p className={styles.heroSub}>
          ใส่สินค้า → ได้คลิปพร้อมโพสต์ใน <strong>1 นาที</strong>
        </p>

        <div className={styles.heroInput}>
          <input
            id="hero-product-input"
            className={styles.input}
            placeholder="พิมพ์ชื่อสินค้าของคุณ..."
            value={product}
            onChange={e => setProduct(e.target.value)}
          />
          <a
            href={`/create${product ? `?product=${encodeURIComponent(product)}` : ''}`}
            className={styles.heroCta}
            id="hero-cta-btn"
          >
            ทดลองใช้ฟรี 3 คลิป →
          </a>
        </div>
        <p className={styles.heroNote}>ไม่ต้องใส่บัตรเครดิต · ฟรีทันที 3 คลิป</p>
      </section>

      {/* Pain Points */}
      <section className={styles.pain}>
        <div className={styles.painGrid}>
          <div className={styles.painLeft}>
            <h2 className={styles.sectionTitle}>แม่ค้า TikTok เจอปัญหาเหล่านี้ไหม?</h2>
            <ul className={styles.painList}>
              {PAIN_POINTS.map(p => (
                <li key={p.text} className={styles.painItem}>
                  <span>{p.icon}</span> {p.text}
                </li>
              ))}
            </ul>
            <div className={styles.painSolution}>
              <strong>👉 ClipDD แก้ให้หมด</strong>
              <p>AI สร้างสคริปต์ไวรัล + เสียงพากย์ + คลิปสำเร็จรูป</p>
            </div>
          </div>
          <div className={styles.painRight}>
            <div className={styles.mockPhone}>
              <div className={styles.mockScreen}>
                <div className={styles.mockHook}>🔥 หยุดก่อน!!</div>
                <div className={styles.mockProduct}>สินค้าของคุณ</div>
                <div className={styles.mockBody}>ใช้แล้วเห็นผลจริง<br/>ของกำลังฮิตใน TikTok</div>
                <div className={styles.mockCta}>กดตะกร้าตอนนี้!</div>
                <div className={styles.mockTags}>#TikTokขายของ #ของดี</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={styles.howto}>
        <h2 className={styles.sectionTitle} style={{textAlign:'center'}}>วิธีใช้งาน (3 ขั้นตอน)</h2>
        <div className={styles.steps}>
          {STEPS.map(s => (
            <div key={s.num} className={styles.step}>
              <div className={styles.stepNum}>{s.num}</div>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>พร้อมสร้างคลิปไวรัลแล้วใช่ไหม?</h2>
        <p className={styles.ctaSub}>ทดลองฟรี 3 คลิป ไม่ต้องใส่ข้อมูลบัตรเครดิต</p>
        <a href="/create" className={styles.ctaBtn} id="footer-cta-btn">
          เริ่มสร้างคลิปเลย →
        </a>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <span>© 2025 ClipDD · สร้างคลิปขายของ TikTok อัตโนมัติ</span>
      </footer>
    </main>
  )
}
