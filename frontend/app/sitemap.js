export default function sitemap() {
  const base = 'https://clipdd.com'
  const now = new Date()
  return [
    { url: base,               lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/login`,    lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/terms`,    lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${base}/privacy`,  lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
  ]
}
