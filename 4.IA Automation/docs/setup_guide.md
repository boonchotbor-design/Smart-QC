# คู่มือการติดตั้งระบบ E-commerce Automation

## ขั้นตอนที่ 1: การเตรียม Google Sheets
1. สร้าง Google Sheets ใหม่
2. ตั้งชื่อชีตว่า `Products`
3. สร้างคอลัมน์ตามลำดับดังนี้:
   - A: Product ID
   - B: Product Name
   - C: Image/Video URL
   - D: Product Features
   - E: Price
   - F: Affiliate/Shop Link
   - G: Generated Caption
   - H: Status
   - I: Facebook Post ID
   - J: TikTok Post ID
   - K: Created At
4. ตั้งค่า Status เริ่มต้นเป็น `Pending AI` สำหรับสินค้าที่ต้องการให้ AI ช่วยเขียนแคปชัน

## ขั้นตอนที่ 2: การตั้งค่า Google Apps Script (GAS)
1. ไปที่เมนู **Extensions > Apps Script**
2. คัดลอกโค้ดจากไฟล์ในโฟลเดอร์ `src/gas/` ไปวางในโครงการ GAS ของคุณ
3. ในไฟล์ `config.gs` ให้ใส่ API Keys และ Tokens ของคุณ:
   - `GEMINI_API_KEY`: ขอได้จาก [Google AI Studio](https://aistudio.google.com/)
   - `LINE_ACCESS_TOKEN`: ขอได้จาก [LINE Developers Console](https://developers.line.biz/)
   - `FB_PAGE_ACCESS_TOKEN` & `FB_PAGE_ID`: ขอได้จาก [Facebook Developers](https://developers.facebook.com/)

## ขั้นตอนที่ 3: การตั้งค่า LINE Webhook
1. ในหน้า Apps Script ให้กด **Deploy > New Deployment**
2. เลือก Type เป็น **Web App**
3. ตั้งค่า "Who has access" เป็น **Anyone**
4. Copy URL ที่ได้ ไปวางใน LINE Developers Console ในส่วนของ **Webhook URL** และกด Verify

## ขั้นตอนที่ 4: การเชื่อมต่อ Facebook Graph API
1. สร้าง App ใน Facebook Developers (ประเภท Business)
2. เพิ่ม Product **Facebook Login for Business** และ **Graph API Explorer**
3. ขอ Permission: `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`
4. ใช้ Page Access Token (แบบ Long-lived) เพื่อความคงทน

## ขั้นตอนที่ 5: แนวทางการโพสต์ TikTok
เนื่องจาก TikTok API มีความเข้มงวด:
- **วิธีที่ 1 (API):** ใช้ [TikTok Content Posting API](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post-video/) (ต้องขออนุมัติ App)
- **วิธีที่ 2 (Semi-Auto):** ให้ LINE แจ้งเตือนพร้อมส่งไฟล์วิดีโอ/แคปชันมาให้ แล้วเรากดเซฟลงเครื่องและโพสต์เอง (แนะนำสำหรับเริ่มต้น)
- **วิธีที่ 3 (Make.com):** ใช้ Make.com เชื่อมต่อ TikTok จะทำได้ง่ายกว่าเขียนโค้ดเอง 100%

## คำแนะนำเพิ่มเติม
- **Make.com:** หากต้องการลดความซับซ้อนของการเขียนโค้ด API (โดยเฉพาะ TikTok และ FB Reels) Make.com เป็นทางเลือกที่ดีมาก โดยคุณสามารถใช้ GAS ส่ง Webhook ไปที่ Make.com แทนได้
- **Trigger:** ใน GAS ให้ตั้งค่า Trigger (รูปนาฬิกา) ให้ฟังก์ชัน `processQueue` ทำงานทุกๆ 5 หรือ 10 นาที
