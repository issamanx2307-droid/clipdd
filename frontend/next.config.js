/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'fal.media' },
      { protocol: 'https', hostname: '*.fal.media' },
      { protocol: 'https', hostname: 'v3.fal.media' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'https', hostname: 'clipdd.com' },
    ],
  },
}

module.exports = nextConfig
