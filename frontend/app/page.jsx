export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-black text-white">
      <h1 className="text-5xl font-bold mb-4">ClipDD</h1>
      <p className="text-xl text-gray-400 mb-8">สร้างคลิปขายของ TikTok อัตโนมัติ</p>
      <a href="/create" className="bg-red-500 px-8 py-4 rounded-2xl text-xl font-bold hover:bg-red-600">
        ทดลองใช้ฟรี 3 คลิป
      </a>
    </main>
  )
}
