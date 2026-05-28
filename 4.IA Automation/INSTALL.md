# คู่มือติดตั้ง Google Apps Script — ระบบโพสต์สินค้าอัตโนมัติ

## ขั้นตอนที่ 1 — เปิด Apps Script

1. เปิด Google Sheets ของคุณ
2. เมนู **Extensions → Apps Script**
3. จะเปิดหน้าต่าง Apps Script ขึ้นมา

---

## ขั้นตอนที่ 2 — สร้างไฟล์และวางโค้ด

ลบไฟล์ `Code.gs` ที่มีอยู่แล้วสร้างไฟล์ใหม่ 6 ไฟล์:

| ไฟล์ | วิธีสร้าง |
|------|-----------|
| `config.gs` | + → Script file → ตั้งชื่อ config |
| `ai_handler.gs` | + → Script file → ตั้งชื่อ ai_handler |
| `line_handler.gs` | + → Script file → ตั้งชื่อ line_handler |
| `webhook.gs` | + → Script file → ตั้งชื่อ webhook |
| `fb_handler.gs` | + → Script file → ตั้งชื่อ fb_handler |
| `tiktok_handler.gs` | + → Script file → ตั้งชื่อ tiktok_handler |
| `main.gs` | + → Script file → ตั้งชื่อ main |

คัดลอกโค้ดจากแต่ละไฟล์ .gs วางในไฟล์ที่ตรงกัน

---

## ขั้นตอนที่ 3 — กรอก API Keys ใน config.gs

```javascript
const CONFIG = {
  SHEET_ID:          'YOUR_GOOGLE_SHEET_ID',       // จาก URL ของ Sheets
  GEMINI_API_KEY:    'YOUR_GEMINI_API_KEY',         // aistudio.google.com
  LINE_CHANNEL_TOKEN:'YOUR_LINE_CHANNEL_ACCESS_TOKEN',
  LINE_USER_ID:      'YOUR_LINE_USER_ID',
  FB_PAGE_ID:        'YOUR_FACEBOOK_PAGE_ID',
  FB_PAGE_TOKEN:     'YOUR_FACEBOOK_PAGE_ACCESS_TOKEN',
  TIKTOK_ACCESS_TOKEN:'YOUR_TIKTOK_ACCESS_TOKEN',
  ...
};
```

---

## ขั้นตอนที่ 4 — Deploy เป็น Web App (รับ LINE Webhook)

1. กด **Deploy → New deployment**
2. เลือก Type: **Web app**
3. ตั้งค่า:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. กด Deploy → คัดลอก **Web App URL**

URL จะมีรูปแบบ:
```
https://script.google.com/macros/s/XXXXXXX/exec
```

---

## ขั้นตอนที่ 5 — ตั้งค่า LINE Webhook

1. ไปที่ https://developers.line.biz/
2. เลือก Channel ของคุณ → **Messaging API**
3. **Webhook URL** → วาง Web App URL จากขั้นตอนที่ 4
4. กด **Verify** → ต้องได้ Success
5. เปิด **Use webhook: ON**

---

## ขั้นตอนที่ 6 — ทดสอบระบบ

1. ใน Apps Script เลือกฟังก์ชัน `testSystem`
2. กด ▶ Run
3. ตรวจสอบ LINE ว่าได้รับข้อความทดสอบ

---

## ขั้นตอนที่ 7 — ตั้ง Time Trigger

1. เลือกฟังก์ชัน `setupTriggers`
2. กด ▶ Run
3. อนุมัติ Permission ที่ขอ
4. Trigger จะรัน `processAllPending` ทุก 6 ชั่วโมงอัตโนมัติ

---

## การใช้งานประจำวัน

1. เพิ่มสินค้าใน Sheets → ใส่ status = **PENDING**
2. รอระบบรัน หรือรัน `processAllPending` มือ
3. กด **✅ Approve** หรือ **❌ Reject** บน LINE
4. ระบบโพสต์และแจ้งผลกลับมา LINE อัตโนมัติ

พิมพ์ **"status"** ใน LINE เพื่อดูสรุปสถานะสินค้าทั้งหมด

---

## วิธีรับ API Keys

| Service | URL |
|---------|-----|
| Gemini API Key | https://aistudio.google.com/app/apikey |
| LINE Channel Token | https://developers.line.biz → Messaging API |
| LINE User ID | เปิดแชท → ดู User ID ในหน้า Profile |
| Facebook Page Token | https://developers.facebook.com → Graph API Explorer |
| TikTok Access Token | https://developers.tiktok.com → Content Posting API |
