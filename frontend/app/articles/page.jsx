import { Suspense } from 'react'
import styles from './articles.module.css'

export const metadata = {
  title: 'วิธีหาเงินให้ได้จริงจากติ้กต้อก | ClipDD',
  description: 'รวมเทคนิค วิธีหาเงินจาก TikTok ให้ได้จริง — สคริปต์ขายดี, ยอดวิวพุ่ง, ปิดการขายง่าย สำหรับแม่ค้าออนไลน์ไทย',
  openGraph: {
    title: 'วิธีหาเงินให้ได้จริงจากติ้กต้อก | ClipDD',
    description: 'รวมเทคนิค วิธีหาเงินจาก TikTok ให้ได้จริง สำหรับแม่ค้าออนไลน์ไทย',
    url: 'https://clipdd.com/articles',
    siteName: 'ClipDD',
    locale: 'th_TH',
    type: 'website',
  },
  alternates: { canonical: 'https://clipdd.com/articles' },
}

const CAT_COLORS = [
  'linear-gradient(135deg,#FFF7ED,#FED7AA)',
  'linear-gradient(135deg,#F5F3FF,#DDD6FE)',
  'linear-gradient(135deg,#F0FDF4,#BBF7D0)',
  'linear-gradient(135deg,#F0F9FF,#BAE6FD)',
  'linear-gradient(135deg,#FFF1F2,#FECDD3)',
]

async function fetchArticles() {
  try {
    const res = await fetch('https://clipdd.com/api/articles/', {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export default async function ArticlesPage() {
  const articles = await fetchArticles()

  return (
    <main className={styles.main}>
      {/* ── NAV ── */}
      <nav className={styles.nav}>
        <a href="/" className={styles.navLogo}>
          <span className={styles.navLogoAccent}>Clip</span>DD
        </a>
        <div className={styles.navLinks}>
          <a href="/#clips" className={styles.navLink}>ตัวอย่างคลิป</a>
          <a href="/#deals" className={styles.navLink}>ดีล</a>
          <a href="/articles" className={`${styles.navLink} ${styles.navLinkActive}`}>หาเงินจาก TikTok</a>
          <a href="/#pricing" className={styles.navLink}>ราคา</a>
        </div>
        <a href="/create" className={styles.navCta}>+ สร้างคลิปฟรี</a>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>💰 คู่มือฉบับสมบูรณ์</div>
        <h1 className={styles.heroTitle}>
          วิธีหาเงินให้ได้จริง<br />
          <span className={styles.heroAccent}>จากติ้กต้อก</span>
        </h1>
        <p className={styles.heroDesc}>
          รวมเทคนิคจากแม่ค้าออนไลน์ที่ขายดีจริง · สคริปต์คลิปที่ได้ผล · วิธีปิดการขายบน TikTok Live
        </p>
        <div className={styles.heroStats}>
          <span>📖 {articles.length > 0 ? articles.length : '10+'} บทความ</span>
          <span>⏱ อ่านเร็ว 5–10 นาที</span>
          <span>✅ เคสจริงจากแม่ค้าไทย</span>
        </div>
      </section>

      {/* ── ARTICLES GRID ── */}
      <section className={styles.section}>
        {articles.length === 0 ? (
          <EmptyState />
        ) : (
          <div className={styles.grid}>
            {articles.map((a, i) => (
              <ArticleCard key={a.id} article={a} colorIdx={i % CAT_COLORS.length} />
            ))}
          </div>
        )}
      </section>

      {/* ── CTA BANNER ── */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaBannerInner}>
          <h2 className={styles.ctaTitle}>อ่านแล้ว อยากลองทำจริงไหม?</h2>
          <p className={styles.ctaDesc}>ให้ AI สร้างคลิปขายของ TikTok ให้คุณใน 60 วินาที — ฟรีคลิปแรก</p>
          <a href="/create" className={styles.ctaBtn}>🚀 สร้างคลิปฟรีเลย</a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          <a href="/" className={styles.footerLink}>หน้าแรก</a>
          <a href="/articles" className={styles.footerLink}>บทความ</a>
          <a href="/terms" className={styles.footerLink}>ข้อกำหนด</a>
          <a href="/privacy" className={styles.footerLink}>ความเป็นส่วนตัว</a>
        </div>
        <p className={styles.footerCopy}>© {new Date().getFullYear()} ClipDD · สร้างคลิป TikTok ด้วย AI</p>
      </footer>
    </main>
  )
}

function ArticleCard({ article, colorIdx }) {
  const bg = article.cover_bg || CAT_COLORS[colorIdx]
  return (
    <a href={`/articles/${article.slug}`} className={styles.card}>
      <div className={styles.cardCover} style={{ background: bg }}>
        <span className={styles.cardCat}
          style={{ color: article.cat_color, background: article.cat_color + '20' }}>
          {article.category}
        </span>
      </div>
      <div className={styles.cardBody}>
        <h2 className={styles.cardTitle}>{article.title}</h2>
        {article.excerpt && <p className={styles.cardExcerpt}>{article.excerpt}</p>}
        <div className={styles.cardFooter}>
          <span className={styles.cardRead}>⏱ {article.read_time}</span>
          <span className={styles.cardBtn}>อ่านต่อ →</span>
        </div>
      </div>
    </a>
  )
}

function EmptyState() {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>📝</div>
      <h2 className={styles.emptyTitle}>กำลังเตรียมบทความ</h2>
      <p className={styles.emptyDesc}>ทีมงานกำลังเขียนบทความเทคนิค TikTok สำหรับแม่ค้าไทย — กลับมาเร็วๆ นี้</p>
      <a href="/" className={styles.emptyBtn}>← กลับหน้าแรก</a>
    </div>
  )
}
