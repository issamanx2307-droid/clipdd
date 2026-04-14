export default function ClipsPage() {
  return (
    <main style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#FFFDF8', fontFamily:'Noto Sans Thai, system-ui, sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'4rem', marginBottom:16 }}>🎬</div>
        <h1 style={{ fontSize:'1.8rem', fontWeight:900, color:'#1F2937', margin:'0 0 12px' }}>คลังคลิปตัวอย่าง</h1>
        <p style={{ color:'#6B7280', fontSize:'1rem', marginBottom:32 }}>เร็วๆ นี้ — กำลังรวบรวมคลิปตัวอย่างสุดเจ๋ง</p>
        <a href="/" style={{ background:'#FF7A00', color:'#fff', padding:'12px 28px', borderRadius:999, fontWeight:700, fontSize:'0.95rem', textDecoration:'none' }}>
          ← กลับหน้าแรก
        </a>
      </div>
    </main>
  )
}
