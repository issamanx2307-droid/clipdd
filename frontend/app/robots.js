export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/mantapa', '/api/', '/create'],
      },
    ],
    sitemap: 'https://clipdd.com/sitemap.xml',
    host: 'https://clipdd.com',
  }
}
