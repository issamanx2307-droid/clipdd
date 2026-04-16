import { notFound } from 'next/navigation'
import styles from './article.module.css'

async function fetchArticle(slug) {
  try {
    const res = await fetch(`https://clipdd.com/api/articles/${slug}/`, {
      next: { revalidate: 60 },
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }) {
  const article = await fetchArticle(params.slug)
  if (!article) return { title: 'บทความ | ClipDD' }
  return {
    title: `${article.meta_title || article.title} | ClipDD`,
    description: article.meta_description || article.excerpt,
    openGraph: {
      title: article.meta_title || article.title,
      description: article.meta_description || article.excerpt,
      url: `https://clipdd.com/articles/${article.slug}`,
      siteName: 'ClipDD',
      locale: 'th_TH',
      type: 'article',
      publishedTime: article.published_at,
    },
    alternates: { canonical: `https://clipdd.com/articles/${article.slug}` },
  }
}

export default async function ArticlePage({ params }) {
  const article = await fetchArticle(params.slug)
  if (!article) notFound()

  const pubDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('th-TH', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  return (
    <main className={styles.main}>
      {/* ── NAV ── */}
      <nav className={styles.nav}>
        <a href="/" className={styles.navLogo}>
          <span className={styles.navLogoAccent}>Clip</span>DD
        </a>
        <a href="/articles" className={styles.navBack}>← กลับหน้าบทความ</a>
        <a href="/create" className={styles.navCta}>+ สร้างคลิปฟรี</a>
      </nav>

      {/* ── ARTICLE ── */}
      <article className={styles.article}>
        {/* Header */}
        <header className={styles.header}>
          {article.category && (
            <span className={styles.cat}
              style={{ color: article.cat_color, background: article.cat_color + '20' }}>
              {article.category}
            </span>
          )}
          <h1 className={styles.title}>{article.title}</h1>
          {article.excerpt && <p className={styles.excerpt}>{article.excerpt}</p>}
          <div className={styles.meta}>
            {article.read_time && <span>⏱ {article.read_time}</span>}
            {pubDate && <span>📅 {pubDate}</span>}
          </div>
        </header>

        {/* Cover */}
        <div className={styles.cover} style={{ background: article.cover_bg }} />

        {/* Content */}
        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </article>

      {/* ── CTA ── */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>อ่านแล้ว อยากลองทำจริงไหม?</h2>
        <p className={styles.ctaDesc}>ให้ AI สร้างคลิปขายของ TikTok ให้คุณใน 60 วินาที — ฟรีคลิปแรก</p>
        <div className={styles.ctaBtns}>
          <a href="/create" className={styles.ctaBtnPrimary}>🚀 สร้างคลิปฟรีเลย</a>
          <a href="/articles" className={styles.ctaBtnSecondary}>อ่านบทความอื่น →</a>
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
