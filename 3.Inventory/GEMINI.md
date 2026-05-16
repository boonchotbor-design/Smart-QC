# 📦 Inventory Smart System (V.6.0.6)

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

## 🐞 Bug Fixes & Stability (V.6.0.6)
- **Field Simplification:** Removed Internal Project, Internal Phase, Internal WON, Site Code, and Project Code for a leaner workflow.
- **Flexible Photo Upload:** Removed `capture="environment"` to allow users to choose between taking a photo or importing from the gallery.
- **Dynamic Owners:** Converted 'Owner Warehouse' and 'Owner Receiver' to searchable datalists that allow adding new entries.
- **Improved OCR:** Refined OCR to focus on essential fields like Bill Number.
- **UI Cleanup:** Optimized `app.html` for better mobile experience and less clutter.

## ⚠️ Important Rules
- **Deployment:** When updating code, always **Deploy as Web App** and select **"New Version"** to ensure changes take effect.
- **Telegram Token:** Do NOT expose `TELEGRAM_BOT_TOKEN` in logs or public commits.
- **Data Integrity:** The Google Sheet structure is maintained; removed fields will now save as empty strings to ensure backward compatibility with existing reporting tools.
- **Mobile First:** All UI changes in `app.html` must be tested for mobile responsiveness.
