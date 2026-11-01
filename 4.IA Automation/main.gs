// ============================================================
// main.gs — เวอร์ชั่นสมบูรณ์ (เมนูใน Sheets + Reels + Token)
// ============================================================

/**
 * 🆕 เมนูพิเศษ: จะโผล่ขึ้นมาใน Google Sheets ของคุณ
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 ระบบโพสต์อัตโนมัติ')
    .addItem('🔑 อัปเดต Facebook Token', 'promptForToken')
    .addItem('🧪 ทดสอบระบบ', 'testSystem')
    .addToUi();
}

/**
 * 🔑 ฟังก์ชันรับรหัสจากหน้าจอ Sheets และบันทึกถาวร
 */
function promptForToken() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('🔑 อัปเดตรหัส Facebook', 'ก๊อปปี้ Access Token จากหน้า Facebook Explorer มาวางที่นี่แล้วกด OK:', ui.ButtonSet.OK_CANCEL);
  
  if (response.getSelectedButton() == ui.Button.OK) {
    const userToken = response.getResponseText().trim();
    if (!userToken) return;
    
    // ค้นหารหัส Page Token ถาวร
    const url = `https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`;
    try {
      const res = UrlFetchApp.fetch(url);
      const pages = JSON.parse(res.getContentText()).data;
      let found = false;
      pages.forEach(p => {
        if (p.id === '102412824529229') {
          const cleanToken = p.access_token.trim().replace(/\s+/g, '');
          // บันทึกลงระบบ Google Properties ทันที (รหัสไม่เพี้ยน)
          PropertiesService.getScriptProperties().setProperty('FB_PAGE_TOKEN', cleanToken);
          ui.alert('✅ สำเร็จ! บันทึกรหัสถาวรเรียบร้อยแล้วครับ ลุยต่อได้เลย!');
          sendLineText('🤖 ระบบบันทึก Page Token ถาวรสำเร็จ! พร้อมโพสต์ครับ');
          found = true;
        }
      });
      if (!found) ui.alert('❌ ไม่พบเพจในรหัสนี้ กรุณาเช็คสิทธิ์ใน Facebook App ครับ');
    } catch (e) { ui.alert('❌ ล้มเหลว: ' + e.message); }
  }
}

function postApprovedProduct(rowNum) {
  const sheet = getSheet(); 
  const row = sheet.getRange(rowNum, 1, 1, 17).getValues()[0];
  const mType = String(row[4]).toUpperCase();
  const caption = row[9];
  const mediaUrl = row[3];
  const affiliateLink = row[5];
  const productName = row[1];
  
  try {
    let fbId;
    if (mType === 'REEL') {
      fbId = postFacebookReel(caption, mediaUrl);
    } else if (mType === 'VIDEO') {
      fbId = postFacebookVideo(caption, mediaUrl, affiliateLink);
    } else {
      fbId = postFacebookImage(caption, mediaUrl, affiliateLink);
    }
    
    sheet.getRange(rowNum, 14).setValue(fbId); 
    sheet.getRange(rowNum, 16).setValue(new Date().toISOString()); 
    sheet.getRange(rowNum, 12).setValue('POSTED');
    
    sendLineText(`✅ โพสต์สำเร็จ!\n📦 ${productName}\n🎬 ประเภท: ${mType}\n📘 FB: fb.com/${fbId}`);
  } catch (e) {
    logError(rowNum, e.message);
    sendLineText(`❌ โพสต์ไม่สำเร็จ: ${e.message}`);
  }
}

function runEvery6Hours() { processAllPending(); }

function testSystem() { 
  try {
    const cap = generateCaption('สินค้าทดสอบ', 'ดีมาก', 'https://test.com');
    sendLineText(`🧪 Gemini OK! ✅\n\nตัวอย่างแคปชัน:\n${cap.substring(0, 100)}...`);
  } catch (e) { sendLineText('❌ Gemini Failed: ' + e.message); }
}
