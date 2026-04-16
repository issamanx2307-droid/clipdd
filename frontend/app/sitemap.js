export default async function sitemap() {
  const base = 'https://clipdd.com'
  const now = new Date()

  const staticPages = [
    { url: base,               lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/login`,    lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/articles`, lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/terms`,    lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${base}/privacy`,  lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
  ]

  let articlePages = []
  try {
    const res = await fetch(`${base}/api/articles/`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const articles = await res.json()
      articlePages = articles.map(a => ({
        url: `${base}/articles/${a.slug}`,
        lastModified: a.published_at ? new Date(a.published_at) : now,
        changeFrequency: 'monthly',
        priority: 0.7,
      }))
    }
  } catch {}

  return [...staticPages, ...articlePages]
}
