# 📦 Inventory Smart System (V.5.9.4)

Project Context: A Google Apps Script application for managing hardware inventory (AIS/TRUE) using Web App (Bootstrap UI) and Telegram Bot with AI OCR capabilities.

## 🛠 Tech Stack
- **Backend:** Google Apps Script (`code.gs`)
- **Frontend:** HTML5, Bootstrap 5, JavaScript (`app.html`)
- **Integration:** Telegram Bot API, Google Drive OCR
- **Storage:** Google Sheets

## 🚀 Workflow
1. **Research:** Analyze `code.gs` (logic) and `app.html` (UI) before changes.
2. **Strategy:** Propose changes ensuring compatibility between Web App and Telegram Bot.
3. **Execution:** Surgical edits using `replace` or `write_file`.
4. **Validation:** Verify function logic and UI responsiveness.

## 📝 Recommended Prompts

### 🔍 Research & Analysis
- "ช่วยวิเคราะห์ฟังก์ชัน `parsePickingList` ใน `code.gs` ว่าปัจจุบันอ่านข้อมูลอะไรได้บ้าง และมีจุดไหนที่ยังตกหล่น"
- "ตรวจสอบ `SPREADSHEET_ID` และโครงสร้าง Column ที่ระบบคาดหวังใน Google Sheets"

### 🛠 Feature Enhancements
- "เพิ่มหมวดหมู่สินค้า (Item Type) ใหม่ใน `app.html` และปรับให้ `code.gs` บันทึกลง Sheet ได้ถูกต้อง"
- "ปรับปรุงระบบ OCR ให้รองรับรูปแบบใบงานใหม่ โดยเพิ่ม Regex ในฟังก์ชัน `parsePickingList`"
- "เพิ่มฟังก์ชันตรวจสอบจำนวนคงเหลือ (Stock Check) ก่อนทำการบันทึกรายการ OUT"

### 🐞 Bug Fixing
- "ทำไม Telegram Bot ถึงไม่อ่านรูปภาพ? ช่วยตรวจสอบ `handleTelegramOCR` และการตั้งค่า Webhook"
- "แก้ไขปัญหา UI ของเครื่องมือสแกน QR Code ที่แสดงผลผิดเพี้ยนบนหน้าจอมือถือบางรุ่น"

## 🐞 Bug Fixes & Stability (V.5.9.6)
- **Android Compatibility:** Removed `capture="environment"` from file inputs. This ensures that all Android devices can choose between the Camera and Files, resolving the issue where some devices couldn't take photos.
- **Scanner Stability:** Optimized `qrbox` and `fps` for more reliable barcode scanning.
- **Improved Validation:** Server-side responses now return objects `{success, message}` for both Web App and Telegram.

## ⚠️ Important Rules
- **Deployment:** When updating code, always **Deploy as Web App** and select **"New Version"** to ensure changes take effect.
- **Telegram Token:** Do NOT expose `TELEGRAM_BOT_TOKEN` in logs or public commits.
- **Data Integrity:** When changing `saveMultiData`, ensure `saveToSheet` (for Telegram) is also updated to maintain consistency.
- **Mobile First:** All UI changes in `app.html` must be tested for mobile responsiveness.
