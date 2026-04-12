export const metadata = {
  title: 'นโยบายความเป็นส่วนตัว',
  description: 'นโยบายความเป็นส่วนตัวของ ClipDD — วิธีที่เราเก็บและใช้ข้อมูลส่วนบุคคลของท่าน ตาม PDPA',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://clipdd.com/privacy' },
}

export default function PrivacyPage() {
  return (
    <div style={{ background: '#0d0d14', minHeight: '100vh', color: '#e2e8f0', fontFamily: "'Noto Sans Thai', sans-serif" }}>
      <nav style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: '1.2rem' }}>
          Clip<span style={{ color: '#6366f1' }}>DD</span>
        </a>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>/ นโยบายความเป็นส่วนตัว</span>
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>นโยบายความเป็นส่วนตัว</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: 8 }}>
          มีผลบังคับใช้ตั้งแต่วันที่ 1 มกราคม 2568 | อัปเดตล่าสุด: มกราคม 2568
        </p>
        <p style={{
          color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem', marginBottom: 40,
          padding: '12px 16px', background: 'rgba(99,102,241,0.1)',
          borderLeft: '3px solid #6366f1', borderRadius: '0 8px 8px 0',
        }}>
          ClipDD ให้ความสำคัญกับความเป็นส่วนตัวของท่านและปฏิบัติตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
        </p>

        <Section title="1. ผู้ควบคุมข้อมูลส่วนบุคคล">
          <p><strong>ClipDD</strong> (clipdd.com) เป็นผู้ควบคุมข้อมูลส่วนบุคคลตามความหมายในกฎหมาย PDPA</p>
          <p>ติดต่อเจ้าหน้าที่คุ้มครองข้อมูล:{' '}
            <a href="mailto:privacy@clipdd.com" style={{ color: '#6366f1' }}>privacy@clipdd.com</a>
          </p>
        </Section>

        <Section title="2. ข้อมูลที่เราเก็บรวบรวม">
          <p><strong>2.1 ข้อมูลที่ท่านให้โดยตรง</strong></p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li style={{ marginBottom: 6 }}>ชื่อ-นามสกุล และที่อยู่อีเมล (เมื่อสมัครสมาชิก)</li>
            <li style={{ marginBottom: 6 }}>ข้อมูลการชำระเงิน (ประมวลผลผ่าน payment gateway — ClipDD ไม่เก็บหมายเลขบัตร)</li>
            <li style={{ marginBottom: 6 }}>ข้อมูลสินค้าและรูปภาพที่อัปโหลดเพื่อสร้างคลิป</li>
          </ul>
          <p style={{ marginTop: 12 }}><strong>2.2 ข้อมูลที่เก็บอัตโนมัติ</strong></p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li style={{ marginBottom: 6 }}>IP address, ประเภทเบราว์เซอร์, ระบบปฏิบัติการ</li>
            <li style={{ marginBottom: 6 }}>หน้าที่เยี่ยมชม เวลา และการโต้ตอบกับระบบ</li>
            <li style={{ marginBottom: 6 }}>Cookies และ Local Storage เพื่อการเข้าสู่ระบบ</li>
          </ul>
        </Section>

        <Section title="3. วัตถุประสงค์การใช้ข้อมูล">
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li style={{ marginBottom: 6 }}><strong>การให้บริการ:</strong> ใช้ข้อมูลสินค้าในการสร้างวิดีโอ AI ตามที่ร้องขอ</li>
            <li style={{ marginBottom: 6 }}><strong>บัญชีผู้ใช้:</strong> จัดการบัญชีและการยืนยันตัวตน</li>
            <li style={{ marginBottom: 6 }}><strong>การชำระเงิน:</strong> ประมวลผลการสมัครสมาชิกและธุรกรรม</li>
            <li style={{ marginBottom: 6 }}><strong>การสนับสนุน:</strong> ตอบคำถามและแก้ไขปัญหา</li>
            <li style={{ marginBottom: 6 }}><strong>การปรับปรุงบริการ:</strong> วิเคราะห์การใช้งานเพื่อพัฒนาแพลตฟอร์ม</li>
            <li style={{ marginBottom: 6 }}><strong>การสื่อสาร:</strong> ส่งการแจ้งเตือนเกี่ยวกับบริการ (ไม่ใช่สแปม)</li>
          </ul>
        </Section>

        <Section title="4. การเปิดเผยข้อมูลแก่บุคคลที่สาม">
          <p>ClipDD อาจแชร์ข้อมูลกับ:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li style={{ marginBottom: 6 }}><strong>OpenAI (สหรัฐอเมริกา):</strong> ใช้สร้างสคริปต์และเสียงพากย์ — ข้อมูลสินค้าที่ท่านให้เท่านั้น</li>
            <li style={{ marginBottom: 6 }}><strong>fal.ai (สหรัฐอเมริกา):</strong> ใช้สร้างภาพและวิดีโอ Kling AI</li>
            <li style={{ marginBottom: 6 }}><strong>Google (OAuth):</strong> หากท่านเลือกเข้าสู่ระบบด้วย Google</li>
            <li style={{ marginBottom: 6 }}><strong>ผู้ให้บริการ Cloud:</strong> สำหรับประมวลผลและจัดเก็บข้อมูล</li>
          </ul>
          <p>เราไม่ขายหรือให้เช่าข้อมูลส่วนบุคคลแก่บุคคลที่สามเพื่อวัตถุประสงค์ทางการตลาด</p>
        </Section>

        <Section title="5. การเก็บรักษาและความปลอดภัย">
          <p>5.1 เราเก็บข้อมูลตราบเท่าที่จำเป็นสำหรับวัตถุประสงค์ที่ระบุ หรือตามที่กฎหมายกำหนด</p>
          <p>5.2 รูปภาพและวิดีโอที่สร้างจะเก็บไว้ 90 วันหลังจากสร้าง จากนั้นจะถูกลบอัตโนมัติ</p>
          <p>5.3 เราใช้การเข้ารหัส HTTPS, Token authentication และมาตรการรักษาความปลอดภัยที่เหมาะสม</p>
        </Section>

        <Section title="6. สิทธิ์ของท่านตาม PDPA">
          <p>ท่านมีสิทธิ์ดังต่อไปนี้:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li style={{ marginBottom: 6 }}><strong>สิทธิ์เข้าถึง:</strong> ขอดูข้อมูลที่เราเก็บเกี่ยวกับท่าน</li>
            <li style={{ marginBottom: 6 }}><strong>สิทธิ์แก้ไข:</strong> ขอแก้ไขข้อมูลที่ไม่ถูกต้อง</li>
            <li style={{ marginBottom: 6 }}><strong>สิทธิ์ลบ:</strong> ขอลบข้อมูลส่วนบุคคลของท่าน</li>
            <li style={{ marginBottom: 6 }}><strong>สิทธิ์คัดค้าน:</strong> คัดค้านการประมวลผลข้อมูลในบางกรณี</li>
            <li style={{ marginBottom: 6 }}><strong>สิทธิ์โอนย้าย:</strong> ขอรับข้อมูลในรูปแบบที่อ่านได้ด้วยเครื่อง</li>
            <li style={{ marginBottom: 6 }}><strong>สิทธิ์ถอนความยินยอม:</strong> ถอนความยินยอมได้ตลอดเวลา</li>
          </ul>
          <p>ใช้สิทธิ์โดยติดต่อ:{' '}
            <a href="mailto:privacy@clipdd.com" style={{ color: '#6366f1' }}>privacy@clipdd.com</a>{' '}
            เราจะตอบกลับภายใน 30 วัน
          </p>
        </Section>

        <Section title="7. Cookies">
          <p>เราใช้ Cookie สำหรับ:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li style={{ marginBottom: 6 }}><strong>Cookie จำเป็น:</strong> Token สำหรับการเข้าสู่ระบบ (ไม่สามารถปฏิเสธได้)</li>
            <li style={{ marginBottom: 6 }}><strong>Local Storage:</strong> เก็บ session token และการตั้งค่าของท่าน</li>
          </ul>
          <p>เราไม่ใช้ Tracking cookies หรือ Third-party advertising cookies</p>
        </Section>

        <Section title="8. การโอนข้อมูลระหว่างประเทศ">
          <p>ข้อมูลบางส่วนอาจถูกประมวลผลนอกประเทศไทย (เช่น OpenAI, fal.ai ในสหรัฐอเมริกา) เราดำเนินการตามมาตรการคุ้มครองที่เหมาะสมตาม PDPA มาตรา 29</p>
        </Section>

        <Section title="9. เด็กและเยาวชน">
          <p>บริการของเราไม่ได้มุ่งเป้าไปยังบุคคลอายุต่ำกว่า 18 ปี เราไม่เก็บข้อมูลส่วนบุคคลจากเด็กโดยรู้เห็น หากพบว่ามีการเก็บข้อมูลดังกล่าว เราจะดำเนินการลบทันที</p>
        </Section>

        <Section title="10. การเปลี่ยนแปลงนโยบาย">
          <p>เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว การเปลี่ยนแปลงสำคัญจะแจ้งผ่านอีเมลหรือการแจ้งเตือนในแอป</p>
        </Section>

        <Section title="11. ติดต่อเรา">
          <p>สอบถามข้อมูลหรือใช้สิทธิ์ตาม PDPA:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li style={{ marginBottom: 6 }}>อีเมล: <a href="mailto:privacy@clipdd.com" style={{ color: '#6366f1' }}>privacy@clipdd.com</a></li>
            <li style={{ marginBottom: 6 }}>เว็บไซต์: <a href="https://clipdd.com" style={{ color: '#6366f1' }}>clipdd.com</a></li>
          </ul>
        </Section>
      </main>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
        © 2025 ClipDD ·{' '}
        <a href="/terms" style={{ color: 'inherit' }}>ข้อกำหนดการใช้งาน</a> ·{' '}
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
