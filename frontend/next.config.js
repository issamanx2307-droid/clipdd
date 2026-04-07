/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Allow images from any domain
  images: {
    domains: ['localhost', 'clipdd.com'],
  },
}

module.exports = nextConfig
