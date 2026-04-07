'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateClip() {
  const router = useRouter()
  const [product, setProduct] = useState('')
  const [keyPoints, setKeyPoints] = useState('')
  const [tone, setTone] = useState('urgency')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!product) return
    setLoading(true)
    try {
      const res = await fetch('/api/projects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_name: product, key_points: keyPoints, tone })
      })
      const data = await res.json()
      router.push(`/projects/${data.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">สร้างคลิปขายของ</h1>

      <input
        className="w-full border rounded-xl p-3 text-lg"
        placeholder="ชื่อสินค้า เช่น ครีมหน้าใส"
        value={product}
        onChange={e => setProduct(e.target.value)}
      />
      <textarea
        className="w-full border rounded-xl p-3"
        placeholder="จุดเด่น เช่น ลดสิว ขาวไว ราคาถูก"
        rows={3}
        value={keyPoints}
        onChange={e => setKeyPoints(e.target.value)}
      />

      <div className="flex gap-2">
        {['urgency','review','drama'].map(t => (
          <button key={t}
            onClick={() => setTone(t)}
            className={`flex-1 py-2 rounded-xl border text-sm ${tone === t ? 'bg-black text-white' : ''}`}>
            {t === 'urgency' ? 'เร่งด่วน' : t === 'review' ? 'รีวิว' : 'ดราม่า'}
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !product}
        className="w-full bg-red-500 text-white py-4 rounded-2xl text-xl font-bold disabled:opacity-50">
        {loading ? 'กำลังสร้าง...' : 'สร้างคลิป'}
      </button>
    </div>
  )
}
