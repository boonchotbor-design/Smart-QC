# AI PAT Inspector (V.138)

ระบบตรวจสอบงานติดตั้ง Site AIS อัตโนมัติด้วย AI (Groq Vision) ผ่าน LINE และ Telegram

## คุณสมบัติเด่น (V.138)
- **Telegram Webhook Handling:** เพิ่มระบบจัดการ Callback Query สำหรับการ Approve/Reject ผ่าน Telegram โดยตรง
- **Manual Control:** Admin สามารถตรวจสอบและกดยืนยันผล (Approve) หรือปฏิเสธ (Reject) ผ่านแชทได้ทันที
- **V.138 Super-Match Engine:** ปรับปรุงความแม่นยำในการเลือก Template และการวางรูปภาพใน PAT Report
- **Detailed Feedback:** ระบบวิเคราะห์รูปภาพเชิงลึกพร้อมเหตุผลภาษาไทยที่ชัดเจน
- **Duplicate Fix:** ตรรกะป้องกันการตรวจซ้ำซ้อนด้วย `PAT_CHECKED` description
- **High Reliability:** ระบบ Lock และ Cache ป้องกันการทำงานชนกันใน Batch ใหญ่
- **Fast Response:** เข้าถึง Database ผ่าน ID โดยตรงและระบบ API ที่รวดเร็วขึ้น
- **AI Analytics:** ใช้ Llama 3.2 Vision (90B) สำหรับความแม่นยำสูงสุด

## โครงสร้างไฟล์
- `Code.js`: ตรรกะหลักของระบบ (เวอร์ชัน V.138)
- `DashboardApp.jsx`: หน้าจอ Dashboard และระบบควบคุม Batch Process (V.138)
- `Test.gs`: ชุดทดสอบระบบ Template และสิทธิ์การเข้าถึง (V.138)
