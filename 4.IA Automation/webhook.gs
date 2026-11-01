// ============================================================
// webhook.gs — เวอร์ชั่นรองรับคำสั่ง "เริ่ม" และ "เริ่มคลิป"
// ============================================================

function doPost(e) {
  const res = ContentService.createTextOutput(JSON.stringify({status:'ok'})).setMimeType(ContentService.MimeType.JSON);
  if (!e || !e.postData) return res;
  
  try {
    const events = JSON.parse(e.postData.contents).events || [];
    events.forEach(ev => {
      if (ev.type === 'postback') {
        handlePostback(ev);
      } else if (ev.type === 'message' && ev.message.text) {
        const txt = ev.message.text.trim().toLowerCase();
        if (txt === 'เริ่ม' || txt === 'start') {
          startDemo();
        } else if (txt === 'เริ่มคลิป' || txt === 'reel') {
          startReelDemo();
        } else if (txt === 'status' || txt === 'สถานะ') {
          sendStatusSummary();
        }
      }
    });
  } catch (err) { console.error('doPost error:', err.message); }
  
  return res;
}

function startDemo() {
  const sheet = getSheet();
  const data = [ 'P-'+Date.now().toString().slice(-4), 'หูฟัง ProMax', 'เบสแน่น|กันน้ำ', 'https://picsum.photos/800/600.jpg', 'IMAGE', 'https://www.google.com', 'FACEBOOK' ];
  const row = sheet.getLastRow()+1;
  sheet.getRange(row, 1, 1, 7).setValues([data]);
  sheet.getRange(row, 12).setValue('PENDING');
  sendLineText('🚀 กำลังสร้างโพสต์รูปภาพตัวอย่าง...');
  processAllPending();
}

function startReelDemo() {
  const sheet = getSheet();
  const videoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4'; 
  const data = [ 'R-'+Date.now().toString().slice(-4), 'คลิปทดสอบ Reels', 'วิดีโอตัวอย่างความชัดสูง', videoUrl, 'REEL', 'https://www.google.com', 'FACEBOOK' ];
  const row = sheet.getLastRow()+1;
  sheet.getRange(row, 1, 1, 7).setValues([data]);
  sheet.getRange(row, 12).setValue('PENDING');
  sendLineText('🚀 กำลังสร้างคลิป Reels ทดสอบ...');
  processAllPending();
}

// ── ฟังก์ชันอื่นๆ ยังคงเดิม ──
function handlePostback(event) {
  const data = parseQueryString(event.postback.data);
  const rowNum = findRowByProductId(data.product_id);
  if (!rowNum) return;
  if (data.action === 'approve') {
    getSheet().getRange(rowNum, 12).setValue('APPROVED');
    postApprovedProduct(rowNum);
  } else {
    getSheet().getRange(rowNum, 12).setValue('REJECTED');
    sendLineText('🚫 Rejected แล้ว');
  }
}

function findRowByProductId(productId) {
  const ids = getSheet().getRange(2, 1, getSheet().getLastRow()-1, 1).getValues();
  for (let i=0; i<ids.length; i++) { if (String(ids[i][0]) === String(productId)) return i+2; }
  return null;
}

function parseQueryString(str) {
  const res = {};
  str.split('&').forEach(p => { const [k,v] = p.split('='); res[k] = v; });
  return res;
}

function sendStatusSummary() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) { sendLineText('ไม่มีข้อมูลครับ'); return; }
  const stats = sheet.getRange(2, 12, lastRow-1, 1).getValues();
  const counts = { PENDING:0, AI_DONE:0, PENDING_REVIEW:0, APPROVED:0, REJECTED:0, POSTED:0, ERROR:0 };
  stats.forEach(s => { if (counts[s[0]] !== undefined) counts[s[0]]++; });
  const msg = `📊 สรุปสถานะ\n⏳ PENDING: ${counts.PENDING}\n🚀 Posted: ${counts.POSTED}\n❌ Rejected: ${counts.REJECTED}\n🔴 Error: ${counts.ERROR}`;
  sendLineText(msg);
}
