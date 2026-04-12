import './globals.css'
import ChatWidget from './components/ChatWidget'
import GoogleProvider from './components/GoogleProvider'

const SITE_URL = 'https://clipdd.com'
const SITE_NAME = 'ClipDD'
const DEFAULT_TITLE = 'ClipDD — สร้างคลิปขายของ TikTok อัตโนมัติด้วย AI'
const DEFAULT_DESC  = 'AI สร้างคลิปขายของ TikTok ให้ครบ — สคริปต์ไวรัล เสียงพากย์ไทย ภาพสินค้า ตัดต่อ ทั้งหมดใน 1 นาที ฟรี 3 คลิปแรก ไม่ต้องใส่บัตรเครดิต'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESC,
  keywords: [
    'สร้างคลิป TikTok', 'AI สร้างวิดีโอ', 'คลิปขายของ', 'TikTok Shop',
    'AI TikTok', 'สร้างคลิปอัตโนมัติ', 'ขายของออนไลน์', 'คลิปโฆษณา AI',
    'ClipDD', 'สร้างคอนเทนต์ AI', 'วิดีโอขายสินค้า',
  ],
  authors: [{ name: 'ClipDD', url: SITE_URL }],
  creator: 'ClipDD',
  publisher: 'ClipDD',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    images: [
      { url: '/og-image.png', width: 1200, height: 630, alt: 'ClipDD — AI สร้างคลิปขายของ TikTok' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    images: ['/og-image.png'],
    creator: '@clipdd',
  },
  alternates: {
    canonical: SITE_URL,
    languages: { 'th-TH': SITE_URL },
  },
  verification: {
    google: '', // ใส่ Google Search Console verification code ภายหลัง
  },
  other: {
    'theme-color': '#0d0d14',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <GoogleProvider>
          {children}
          <ChatWidget />
        </GoogleProvider>
      </body>
    </html>
  )
}
