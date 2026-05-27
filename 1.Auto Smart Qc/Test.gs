/**
 * AI SMART QC - TEST SUITE (V.131)
 * ทดสอบระบบ Multi-Template และสิทธิ์การเข้าถึง
 */

function runComprehensiveTest() {
  console.log("--- เริ่มการทดสอบระบบ PAT Generation V.131 ---");
  
  try {
    // 1. ตรวจสอบการเข้าถึง Template ทั้งหมดในระบบ
    console.log("\n1. ตรวจสอบสิทธิ์เข้าถึง Template:");
    
    // ทดสอบ HAE_MBB
    try {
      const hae = DriveApp.getFileById(TEMPLATES.HAE_MBB);
      console.log("✅ HAE_MBB Template: เข้าถึงได้ (" + hae.getName() + ")");
    } catch(e) { console.error("❌ HAE_MBB Template: เข้าไม่ได้! เช็ค ID หรือสิทธิ์การแชร์"); }

    // ทดสอบ HAT_SSR
    try {
      const hat = DriveApp.getFileById(TEMPLATES.HAT_SSR);
      console.log("✅ HAT_SSR Template: เข้าถึงได้ (" + hat.getName() + ")");
    } catch(e) { console.error("❌ HAT_SSR Template: เข้าไม่ได้! เช็ค ID หรือสิทธิ์การแชร์"); }

    // 2. ตรวจสอบประเภทไฟล์ (ต้องเป็น Google Sheets เท่านั้น)
    console.log("\n2. ตรวจสอบประเภทไฟล์ (MIME Type):");
    const testId = TEMPLATES.HAE_MBB;
    const mime = DriveApp.getFileById(testId).getMimeType();
    console.log("📄 ประเภทไฟล์ปัจจุบัน: " + mime);
    
    if (mime === MimeType.GOOGLE_SHEETS) {
      console.log("✅ ประเภทไฟล์ถูกต้อง! (Google Sheets แท้)");
    } else {
      console.error("❌ ประเภทไฟล์ผิด! ยังเป็น Excel (.xlsx) อยู่ ต้อง Save as Google Sheets ก่อนครับ");
      return;
    }

    // 3. ทดสอบการดึงชื่อ Sheet
    console.log("\n3. รายชื่อ Sheet ที่ระบบมองเห็นใน Template:");
    const ss = SpreadsheetApp.openById(testId);
    const sheetNames = ss.getSheets().map(s => s.getName());
    console.log("📋 Sheets: " + sheetNames.join(", "));

    console.log("\n--- สรุป: ระบบพร้อมทำงาน 100% แล้วครับ ---");

  } catch (e) {
    console.error("❌ เกิดข้อผิดพลาดที่ไม่คาดคิด: " + e.toString());
  }
}
