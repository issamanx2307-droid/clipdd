import './globals.css'
import ChatWidget from './components/ChatWidget'

export const metadata = {
  title: 'ClipDD — สร้างคลิปขายของ TikTok อัตโนมัติ',
  description: 'ใส่สินค้า → ได้คลิปพร้อมโพสต์ใน 1 นาที AI สร้างสคริปต์ไวรัล เสียงพากย์ไทย ฟรี 1 คลิป',
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
        {children}
        <ChatWidget />
      </body>
    </html>
  )
}
