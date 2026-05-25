# AI PAT Inspector (V.119)

ระบบตรวจสอบงานติดตั้ง Site AIS อัตโนมัติด้วย AI (Groq Vision) ผ่าน LINE และ Telegram

## คุณสมบัติเด่น (V.119)
- **Detailed Feedback:** เพิ่มระบบวิเคราะห์รูปภาพเชิงลึกและแจ้งเตือนข้อผิดพลาดที่ชัดเจน
- **Duplicate Fix:** ปรับปรุงตรรกะป้องกันการส่งงานซ้ำซ้อน
- **High Reliability:** ปรับปรุงระบบ Lock และ Cache เพื่อป้องกัน Bot ค้าง
- **Fast Response:** เข้าถึง Database (Google Sheets) ได้รวดเร็วขึ้นผ่าน ID โดยตรง
- **Responsive Logic:** ระบบตอบกลับอัตโนมัติ (Auto-Reply) และคำสั่งเช็คสถานะ (`/status`)
- **AI Analytics:** วิเคราะห์รูปภาพงานติดตั้งอัตโนมัติด้วย Llama 3.2 Vision (Groq API)
- **Dual Platform:** รองรับทั้ง LINE Bot และ Telegram Bot
- **Admin Control:** ระบบ Admin Manual Approve/Reject ผ่านแชท

## โครงสร้างไฟล์
- `Code.js`: ตรรกะหลักของระบบ (เวอร์ชัน V.104)
- `appsscript.json`: การตั้งค่า Google Apps Script และ Advanced Services
