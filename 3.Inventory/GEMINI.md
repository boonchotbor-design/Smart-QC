# 📦 Inventory Smart System (V.6.7.5)

Project Context: A Google Apps Script application for managing hardware inventory (AIS/TRUE) using Web App (Bootstrap UI) and Telegram Bot with AI OCR capabilities.

## 🛠 Tech Stack
- **Backend:** Google Apps Script (`code.gs`)
- **Frontend:** HTML5, Bootstrap 5, JavaScript (`app.html`)
- **Integration:** Telegram Bot API, Google Drive OCR
- **Storage:** Google Sheets

## 🚀 Telegram Bot Setup (V.6.7.5)
- **Webhook:** ต้องตั้งค่าให้ชี้มาที่ Vercel เท่านั้น: `https://[YOUR_VERCEL_URL]/telegram-webhook`
- **GAS Permissions:** ใน Google Apps Script ต้อง Deploy เป็น Web App โดยตั้งค่า **"Who has access" เป็น "Anyone"** (สำคัญมาก)
- **Services:** ต้องเปิดใช้งาน **Drive API** ในส่วนของ Services ของ GAS Project
- **Environment Variables:** ใน Vercel ต้องมี `TELEGRAM_BOT_TOKEN`, `TELEGRAM_DESTINATION_ID` และ `GAS_WEB_APP_URL`

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

## 🐞 Bug Fixes & Stability (V.6.7.8)
- **Deep Scan Technology**: Implemented multi-attempt scanning with image pre-processing (Attempt 1: B&W, Attempt 2: High Contrast, Attempt 3: Native) to significantly improve success rate on modern high-res cameras (iPhone 15, Samsung S26).
- **Adaptive Filtering**: Added real-time image resizing and adaptive grayscale filtering before decoding to ensure the engine processes the most readable version of the code.
- **Improved Feedback**: Added visual feedback for each scan attempt and clearer error instructions if decoding fails.
- **Version Sync**: Synchronized version to V.6.7.8 across `code.gs`, `app.html`, and `index.js`.

## 🐞 Bug Fixes & Stability (V.6.7.7)
- **Enhanced Diagnostics**: Added token usage logging and detailed diagnostic route in `index.js`.
- **Version Sync**: Synchronized all success messages and version strings to V.6.7.3.
- **Robustness**: Improved error logging for Telegram push failures.

## 🐞 Bug Fixes & Stability (V.6.7.2)
- **Destination ID Fix**: Corrected the Telegram Destination ID to the user's personal ID `7378939928`.
- **Version Sync**: Synchronized version to V.6.7.2 across all components.

## 🐞 Bug Fixes & Stability (V.6.7.1)
- **Destination ID Update**: Updated the Telegram Destination ID to `8621299992` as requested by the user.
- **Version Sync**: Synchronized version to V.6.7.1 across all components.

## 🐞 Bug Fixes & Stability (V.6.7.0)
- **Emergency Token Update**: Updated the Telegram Bot token to the latest one (`...AZYwWk`) after the previous one was revoked.
- **Version Sync**: Synchronized version to V.6.7.0 across all components (`code.gs`, `index.js`, `app.html`).
- **Robustness**: Ensured `index.js` uses the new token as a fallback for immediate fix.

## 🐞 Bug Fixes & Stability (V.6.6.9)
- **Telegram Token Update**: Updated the Telegram Bot token to the new one provided by the user (`862129...`).
- **Token Fallback**: Implemented a fallback mechanism for `TELEGRAM_BOT_TOKEN` in `index.js` to ensure the bot works immediately after deployment.
- **Version Sync**: Synchronized version to V.6.6.9 across all components (`code.gs`, `index.js`, `app.html`).

## 🐞 Bug Fixes & Stability (V.6.6.8)
- **Multi-LINE Bot Support**: The system now supports multiple LINE accounts (TLN-Inventory, TLN-Inventory#2, TLN-Inventory#3). Notifications are sent through all configured bots to ensure delivery.
- **Dynamic Configuration**: Improved `index.js` to handle an array of LINE credentials, allowing for easier scaling of the notification system.
- **Version Sync**: Synchronized version to V.6.6.8 across all components.

## 🐞 Bug Fixes & Stability (V.6.6.7)
- **Region Fallback Engine**: Implemented a robust fallback in `saveMainData`. If Region is missing, the system automatically lookups the Master Data sheet using DUID before saving.
- **UI-Backend Sync**: Modified the Web App to use the processed header returned from GAS, ensuring that folder creation and notifications always use the most accurate Region detected.
- **Enhanced Diagnostics**: Added rich environment variable checks and detailed logging to `index.js` for better troubleshooting of LINE/Telegram notifications.
- **Version Sync**: Synchronized version to V.6.6.7 across all components.

## 🐞 Bug Fixes & Stability (V.6.6.6)
- **Enhanced Region Recording**: Fixed issue where Column C (Region) was not being recorded.
- **DUID Suffix Detection**: OCR now automatically extracts Region from DUID suffixes (e.g., `_ER`, `_BKK`).
- **Master Data Fallback**: If OCR fails to detect Region, the system now automatically looks up the Region from the 'data' master sheet using the DUID.
- **Detailed Debug Logging**: Added rich logging for the `save` action, including the full header payload for easier troubleshooting.
- **Version Sync**: Synchronized version to V.6.6.6 across all core components.

## 🐞 Bug Fixes & Stability (V.6.6.5)
- **Telegram OCR Auto-Save**: Telegram Bot now automatically saves images to Google Drive following the `Region > DUID` structure.
- **Robust Region Detection**: Improved OCR regex to accurately detect Region (ER, BKK, etc.) from various bill formats.
- **Folder Hierarchy Guard**: Implemented `Unknown_Region` fallback to prevent folders from being created in the root directory.
- **Large Image Support**: Increased Vercel payload limit to 50MB and optimized timeout (60s) for high-resolution OCR processing.
- **Enhanced Search Template**: Refined Telegram response style with continuous item indexing and `📄` bill emoji.
- **Crash Prevention**: Fixed LINE middleware crash when environment variables are missing.
- **Version Sync**: Synchronized version to V.6.6.5 across `code.gs`, `index.js`, `app.html`, and `test-system.js`.

## 🐞 Bug Fixes & Stability (V.6.6.3)
- **AI OCR Integration:** Restored `parsePickingList` and implemented `processOCR` in `code.gs` using Google Drive API.
- **Telegram Image Handling:** Enabled Telegram Bot to handle Picking List images, perform OCR, and automatically record data to the spreadsheet.
- **Enhanced Notification:** Refined the Telegram notification template to include Bill No in the header and improved overall formatting with professional dividers.
- **Version Sync:** Updated version to V.6.6.3 across all components.

## 🐞 Bug Fixes & Stability (V.6.6.2)
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
