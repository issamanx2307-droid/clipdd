export const metadata = {
  title: 'ข้อกำหนดการใช้งาน',
  description: 'ข้อกำหนดและเงื่อนไขการใช้บริการ ClipDD — AI สร้างคลิปขายของ TikTok อัตโนมัติ',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://clipdd.com/terms' },
}

export default function TermsPage() {
  return (
    <div style={{ background: '#0d0d14', minHeight: '100vh', color: '#e2e8f0', fontFamily: "'Noto Sans Thai', sans-serif" }}>
      <nav style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: '1.2rem' }}>
          Clip<span style={{ color: '#6366f1' }}>DD</span>
        </a>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>/ ข้อกำหนดการใช้งาน</span>
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>ข้อกำหนดการใช้งาน</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: 40 }}>
          มีผลบังคับใช้ตั้งแต่วันที่ 1 มกราคม 2568 | อัปเดตล่าสุด: มกราคม 2568
        </p>

        <Section title="1. การยอมรับข้อกำหนด">
          <p>การเข้าใช้งาน ลงทะเบียน หรือใช้บริการ ClipDD ("บริการ") บนเว็บไซต์ clipdd.com ถือว่าท่านได้อ่าน เข้าใจ และยอมรับข้อกำหนดและเงื่อนไขฉบับนี้ทั้งหมด หากท่านไม่ยอมรับ กรุณาหยุดใช้บริการทันที</p>
        </Section>

        <Section title="2. คำอธิบายบริการ">
          <p>ClipDD เป็นแพลตฟอร์ม SaaS ที่ใช้ปัญญาประดิษฐ์ (AI) ช่วยสร้างวิดีโอสั้นสำหรับการขายสินค้าบนแพลตฟอร์มโซเชียลมีเดีย โดยกระบวนการประกอบด้วย:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li style={{ marginBottom: 6 }}>การสร้างสคริปต์ขายของด้วย GPT-4o-mini</li>
            <li style={{ marginBottom: 6 }}>การสร้างภาพสินค้าด้วย Flux Schnell (fal.ai)</li>
            <li style={{ marginBottom: 6 }}>การสร้างวิดีโอเคลื่อนไหวด้วย Kling AI v1.5 (fal.ai)</li>
            <li style={{ marginBottom: 6 }}>การสร้างเสียงพากย์ภาษาไทยด้วย OpenAI TTS</li>
            <li style={{ marginBottom: 6 }}>การประมวลผลวิดีโอขั้นสุดท้ายด้วย FFmpeg</li>
          </ul>
        </Section>

        <Section title="3. บัญชีผู้ใช้">
          <p>3.1 ท่านต้องมีอายุ 18 ปีบริบูรณ์หรือได้รับความยินยอมจากผู้ปกครองตามกฎหมายเพื่อใช้บริการ</p>
          <p>3.2 ท่านรับผิดชอบในการรักษาความปลอดภัยของรหัสผ่านและบัญชีของตนเอง</p>
          <p>3.3 ท่านต้องให้ข้อมูลที่ถูกต้องและเป็นปัจจุบันในการลงทะเบียน</p>
          <p>3.4 บัญชีหนึ่งบัญชีต่อหนึ่งบุคคลหรือองค์กร ห้ามแชร์หรือโอนบัญชี</p>
        </Section>

        <Section title="4. การใช้งานที่อนุญาต">
          <p>ท่านสามารถใช้บริการเพื่อ:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li style={{ marginBottom: 6 }}>สร้างวิดีโอโฆษณาและการตลาดสำหรับสินค้าและบริการของตนเอง</li>
            <li style={{ marginBottom: 6 }}>สร้างคอนเทนต์เพื่อโพสต์บนโซเชียลมีเดียส่วนตัวหรือธุรกิจ</li>
            <li style={{ marginBottom: 6 }}>ใช้งานเชิงพาณิชย์ตามแพ็กเกจที่สมัครไว้</li>
          </ul>
        </Section>

        <Section title="5. การใช้งานที่ต้องห้าม">
          <p>ท่านไม่สามารถใช้บริการเพื่อ:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li style={{ marginBottom: 6 }}>สร้างเนื้อหาที่ผิดกฎหมาย หมิ่นประมาท ลามกอนาจาร หรือละเมิดสิทธิ์ผู้อื่น</li>
            <li style={{ marginBottom: 6 }}>สร้างเนื้อหาที่เป็นเท็จ หลอกลวง หรือฉ้อโกงผู้บริโภค</li>
            <li style={{ marginBottom: 6 }}>ละเมิดทรัพย์สินทางปัญญาของบุคคลที่สาม</li>
            <li style={{ marginBottom: 6 }}>ใช้บริการในลักษณะที่อาจส่งผลเสียต่อระบบหรือผู้ใช้รายอื่น</li>
            <li style={{ marginBottom: 6 }}>Reverse engineer, ถอดรหัส หรือพยายามเข้าถึงซอร์สโค้ดของบริการ</li>
            <li style={{ marginBottom: 6 }}>ขายต่อหรือให้เช่าสิทธิ์การใช้บริการแก่บุคคลที่สามโดยไม่ได้รับอนุญาต</li>
          </ul>
        </Section>

        <Section title="6. ทรัพย์สินทางปัญญา">
          <p>6.1 <strong>เนื้อหาที่ท่านสร้าง:</strong> วิดีโอที่สร้างโดย ClipDD จากข้อมูลสินค้าของท่านถือเป็นสิทธิ์ของท่าน ท่านสามารถใช้เชิงพาณิชย์ได้ตามเงื่อนไขของ AI model ที่ใช้สร้าง</p>
          <p>6.2 <strong>แพลตฟอร์ม ClipDD:</strong> โค้ด UI ดีไซน์ เครื่องหมายการค้า และทรัพย์สินทางปัญญาทั้งหมดของ ClipDD เป็นกรรมสิทธิ์ของบริษัท</p>
          <p>6.3 <strong>เนื้อหาที่ท่านอัปโหลด:</strong> ท่านรับประกันว่ามีสิทธิ์เต็มในรูปภาพสินค้าที่อัปโหลด และให้สิทธิ์ ClipDD ใช้เพื่อสร้างวิดีโอเท่านั้น</p>
        </Section>

        <Section title="7. AI และเนื้อหาที่สร้างอัตโนมัติ">
          <p>7.1 ClipDD ใช้บริการ AI ของบุคคลที่สาม (OpenAI, fal.ai) ในการสร้างเนื้อหา ผลลัพธ์อาจแตกต่างกันในแต่ละครั้ง</p>
          <p>7.2 ClipDD ไม่รับประกันความถูกต้อง ความสมบูรณ์ หรือความเหมาะสมของเนื้อหาที่ AI สร้างขึ้น</p>
          <p>7.3 ท่านมีหน้าที่ตรวจสอบเนื้อหาก่อนโพสต์และรับผิดชอบต่อเนื้อหาที่เผยแพร่ทั้งหมด</p>
        </Section>

        <Section title="8. ราคาและการชำระเงิน">
          <p>8.1 ราคาและแพ็กเกจเป็นไปตามที่แสดงในหน้าเว็บไซต์ ณ ขณะที่สมัคร</p>
          <p>8.2 การสมัครแบบรายเดือนจะต่ออายุอัตโนมัติจนกว่าจะยกเลิก</p>
          <p>8.3 ไม่มีการคืนเงินสำหรับคลิปที่สร้างสำเร็จแล้ว ยกเว้นกรณีที่ระบบขัดข้องจากฝั่ง ClipDD</p>
          <p>8.4 ClipDD ขอสงวนสิทธิ์ในการปรับราคาโดยแจ้งล่วงหน้า 30 วัน</p>
        </Section>

        <Section title="9. ข้อจำกัดความรับผิด">
          <p>ClipDD ให้บริการ "ตามสภาพที่เป็น" (As-Is) โดยไม่รับประกันใดๆ ทั้งสิ้น รวมถึงแต่ไม่จำกัดเพียง ความเหมาะสมสำหรับวัตถุประสงค์เฉพาะ ClipDD จะไม่รับผิดชอบต่อความเสียหายทางอ้อม ความเสียหายพิเศษ หรือผลกำไรที่สูญเสียไป ไม่ว่าในกรณีใดก็ตาม</p>
        </Section>

        <Section title="10. การยุติบริการ">
          <p>ClipDD ขอสงวนสิทธิ์ในการระงับหรือยุติบัญชีที่ละเมิดข้อกำหนดนี้โดยไม่ต้องแจ้งล่วงหน้า ท่านสามารถยกเลิกบัญชีได้ตลอดเวลาผ่านหน้าตั้งค่า</p>
        </Section>

        <Section title="11. กฎหมายที่บังคับใช้">
          <p>ข้อกำหนดนี้อยู่ภายใต้กฎหมายไทย ข้อพิพาทใดๆ ให้อยู่ในเขตอำนาจศาลไทย</p>
        </Section>

        <Section title="12. การเปลี่ยนแปลงข้อกำหนด">
          <p>ClipDD อาจปรับปรุงข้อกำหนดนี้เป็นครั้งคราว การใช้บริการต่อเนื่องหลังจากมีการเปลี่ยนแปลงถือว่าท่านยอมรับข้อกำหนดใหม่</p>
        </Section>

        <Section title="13. ติดต่อเรา">
          <p>หากมีคำถามเกี่ยวกับข้อกำหนดนี้ ติดต่อได้ที่:{' '}
            <a href="mailto:support@clipdd.com" style={{ color: '#6366f1' }}>support@clipdd.com</a>
          </p>
        </Section>
      </main>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
        © 2025 ClipDD ·{' '}
        <a href="/privacy" style={{ color: 'inherit' }}>นโยบายความเป็นส่วนตัว</a> ·{' '}
        <a href="/" style={{ color: 'inherit' }}>กลับหน้าหลัก</a>
      </footer>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{
        fontSize: '1.1rem', fontWeight: 700, color: '#a5b4fc',
        marginBottom: 12, paddingBottom: 8,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {title}
      </h2>
      <div style={{ lineHeight: 1.8, color: 'rgba(255,255,255,0.75)', fontSize: '0.92rem' }}>
        {children}
      </div>
    </section>
  )
}
