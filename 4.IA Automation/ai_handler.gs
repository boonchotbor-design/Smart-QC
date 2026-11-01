// ============================================================
// ai_handler.gs — เวอร์ชั่นกู้คืน Quota (Smart Quota Search)
// ============================================================

function generateCaption(productName, keyFeatures, affiliateLink, extraNotes) {
  const prompt = `คุณคือผู้เชี่ยวชาญด้านการเขียน Copy ขายสินค้าออนไลน์สำหรับคนไทย

จงเขียนแคปชันขายสินค้าสำหรับ Facebook โดยใช้ข้อมูลนี้:
- ชื่อสินค้า: ${productName}
- จุดเด่น: ${keyFeatures}
- ลิงก์ซื้อ: ${affiliateLink}

กฎเหล็ก:
1. ตอบเฉพาะ "เนื้อหาแคปชัน" เท่านั้น
2. ห้ามมีหัวข้อ, ห้ามมีคำอธิบาย, ห้ามมีเครื่องหมาย * หรือบอกรายละเอียดเครื่องมือ
3. เริ่มต้นด้วย Hook ที่น่าตื่นเต้นทันที
4. ภาษาเป็นกันเองแบบวัยรุ่นไทย

คำเตือน: ห้ามส่งข้อมูลอื่นมานอกจากตัวเนื้อหาที่จะเอาไปโพสต์จริงๆ`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    // 1. ดึงรายชื่อโมเดลทั้งหมดที่ Key นี้ใช้ได้จริง
    const urlList = `https://generativelanguage.googleapis.com/v1beta/models?key=${CONFIG.GEMINI_API_KEY}`;
    const resList = UrlFetchApp.fetch(urlList, { muteHttpExceptions: true });
    const jsonList = JSON.parse(resList.getContentText());

    if (resList.getResponseCode() !== 200) {
      throw new Error(`ดึงรายชื่อรุ่นไม่ได้: ${resList.getContentText()}`);
    }

    // 2. จัดลำดับรุ่น: ดันตระกูล 1.5-flash ขึ้นก่อน เพราะมักจะมี Quota ฟรีเยอะกว่า 2.x/3.x
    const availableModels = jsonList.models
      .filter(m => m.supportedGenerationMethods.includes('generateContent'))
      .map(m => m.name)
      .sort((a, b) => {
        if (a.includes('1.5-flash')) return -1;
        if (b.includes('1.5-flash')) return 1;
        return 0;
      });

    console.log(`พบรุ่นทั้งหมด ${availableModels.length} รุ่น. กำลังค้นหารุ่นที่ Quota ว่าง...`);

    let lastError = '';
    // 3. ลองรันทีละรุ่น (สูงสุด 10 รุ่นแรก)
    for (let i = 0; i < Math.min(availableModels.length, 10); i++) {
      const modelName = availableModels[i];
      const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
      
      try {
        console.log(`Trying model [${i+1}]: ${modelName}...`);
        const response = UrlFetchApp.fetch(url, options);
        const resCode = response.getResponseCode();
        const resText = response.getContentText();
        
        if (resCode === 200) {
          const json = JSON.parse(resText);
          console.log(`✅ สำเร็จด้วยรุ่น: ${modelName}`);
          return json.candidates[0].content.parts[0].text.trim();
        } else {
          lastError = JSON.parse(resText).error?.message || resText;
          console.warn(`❌ รุ่น ${modelName} Quota เต็ม: ${lastError.substring(0, 100)}`);
          // รอสักนิดก่อนลองรุ่นถัดไป
          Utilities.sleep(500);
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    throw new Error(`ลองครบ 10 รุ่นแล้ว Quota ยังเต็มอยู่ครับ. กรุณารอ 1 นาทีแล้วลองใหม่ หรือใช้ API Key อื่น. (Error ล่าสุด: ${lastError})`);

  } catch (e) {
    throw new Error(`Smart Discovery Failed: ${e.message}`);
  }
}

// ── รันแคปชันสำหรับทุกแถวที่เป็น PENDING ─────────────────
function processAllPending() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const data = sheet.getRange(2, 1, lastRow - 1, CONFIG.COL.ERROR_LOG).getValues();

  data.forEach((row, i) => {
    const rowNum = i + 2;
    if (row[CONFIG.COL.STATUS - 1] !== CONFIG.STATUS.PENDING) return;

    try {
      console.log(`Processing row ${rowNum}: ${row[1]}`);
      const caption = generateCaption(row[1], row[2], row[5], row[8]);
      
      sheet.getRange(rowNum, CONFIG.COL.AI_CAPTION).setValue(caption);
      sheet.getRange(rowNum, CONFIG.COL.STATUS).setValue(CONFIG.STATUS.AI_DONE);

      const msgId = sendLineFlexMessage(row[0], row[1], caption, row[3], row[5], row[6]);
      sheet.getRange(rowNum, CONFIG.COL.LINE_MSG_ID).setValue(msgId);
      sheet.getRange(rowNum, CONFIG.COL.STATUS).setValue(CONFIG.STATUS.PENDING_REVIEW);
      
      Utilities.sleep(2000);
    } catch (e) {
      logError(rowNum, e.message);
    }
  });
}
