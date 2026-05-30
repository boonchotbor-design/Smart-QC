# 📦 Inventory Smart System (V.6.6.2)

Project Context: A Google Apps Script application for managing hardware inventory (AIS/TRUE) using Web App (Bootstrap UI) and Telegram Bot with AI OCR capabilities.

## 🛠 Tech Stack
- **Backend:** Google Apps Script (`code.gs`)
- **Frontend:** HTML5, Bootstrap 5, JavaScript (`app.html`)
- **Integration:** Telegram Bot API, Google Drive OCR
- **Storage:** Google Sheets

## 🚀 Telegram Bot Setup (V.6.5.4)
- **Webhook:** ต้องตั้งค่าให้ชี้มาที่ Vercel เท่านั้น: `https://[YOUR_VERCEL_URL]/telegram-webhook`
- **GAS Permissions:** ใน Google Apps Script ต้อง Deploy เป็น Web App โดยตั้งค่า **"Who has access" เป็น "Anyone"** (สำคัญมาก)
- **Environment Variables:** ใน Vercel ต้องมี `TELEGRAM_BOT_TOKEN` และ `GAS_WEB_APP_URL` (ต้องเป็น URL ของ GAS ที่ลงท้ายด้วย `/exec`)

## 🚀 Workflow
1. **Research:** Analyze `code.gs` (logic) and `app.html` (UI) before changes.
2. **Strategy:** Propose changes ensuring compatibility between Web App and Telegram Bot.
3. **Execution:** Surgical edits using `replace` or `write_file`.
4. **Validation:** Verify function logic and UI responsiveness.
5. **Deployment:** Redeploy to Vercel after changing `index.js` and ensure GAS is deployed as "Anyone".

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

## 🐞 Bug Fixes & Stability (V.6.6.2)
- **Robust Error Handling:** Added failure handlers and console logging to all `google.script.run` calls in `app.html` to prevent silent failures and identify "not responding" issues.
- **Diagnostic Endpoint:** Added a diagnostic endpoint (`/`) to `index.js` to verify environment variables and system health.
- **Improved index.js:** Added better try-catch blocks and checks for missing configuration in `index.js`.
- **Top-Row Logic:** Refined `saveMainData` in `code.gs` with better checks for empty records.
- **Version Sync:** Updated version to V.6.6.2 across `code.gs`, `app.html`, and `index.js`.

## 🐞 Bug Fixes & Stability (V.6.6.1)
- **Top-Row Recording:** Modified `saveMainData` to insert new records at row 2 (immediately below the header) instead of appending to the bottom. This improves usability for sheets with 2000+ rows.
- **Telegram & LINE Restoration:** Restored the missing `/notify` and `/telegram-webhook` endpoints in `index.js`.
- **Notification Template:** Updated the notification format to match the requested template with detailed item information.
- **Version Sync:** Updated version to V.6.6.1 across `code.gs`, `app.html`, and `index.js`.

## 🐞 Bug Fixes & Stability (V.6.5.4)
- **Column Mapping Lock:** Locked DUID to Column A (Index 0) across all sheets as requested.
- **Header-Based Detection:** Implemented robust header detection for all sheet interactions (DUID, Region, Owners, Models, etc.) to handle variations in sheet structure.
- **Transaction Alignment:** Updated `saveMainData` to use the new Column A alignment (DUID at index 0) and removed the redundant 'No' column.
- **Search Optimization:** Improved `searchByDuidOnly` to correctly read metadata from the 'data' master sheet and items from transaction sheets.

## 🐞 Bug Fixes & Stability (V.6.1.5)
- **Spreadsheet Mapping Fix:** Corrected column mapping in `saveMainData` to match the actual spreadsheet structure.
- **Notification Restoration:** Restored Line notification format to the rich text style with emojis as requested by the user.
- **Field Restoration:** Re-added 'Owner Warehouse' and 'Owner Receiver' fields to the UI with searchable datalists.
- **Camera Permission Fix:** Improved error handling for `NotAllowedError`. Added specific instructions and `alert` to guide users on how to reset camera permissions in their browser.
- **Scanner Optimization:** Simplified `html5-qrcode` initialization and removed redundant permission requests to prevent conflicts on mobile browsers.
- **Version Sync:** Synchronized version numbers across `app.html` and `code.gs`.

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
