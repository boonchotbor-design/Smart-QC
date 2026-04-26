// =========================================================================
// === AI SMART QC BOT - V.80 (ULTRA SPEED & STABLE) ===
// =========================================================================

const VERSION = "V.80 (SPEED-SYNC)"; 
const FOLDER_ID = "1W0o5cNuejntiY7v9__f4LiAH3BH-bNpA"; 
const ARCHIVE_FOLDER_ID = "1dYRMNaTQsQfxsS-4z9GaWMIA3gQHq6h7"; 
const SHEET_NAME = "Dashboard"; 

const PROJECT_LIST = ["HAE", "TME", "HAB", "TMT"];
const TYPE_LIST = ["MBB", "POWER"];

const TELEGRAM_BOT_TOKEN = "8625222790:AAHjU70oWGm88NyUaXaWIDJveo3b2KpnG90"; 
const TELEGRAM_TARGET_ID = "7378939928"; 

// *** อัปเดต URL จากการ Deploy ใหม่ที่นี่ ***
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzT58yquJTh4hf0_jk10Gj7UnIeKwWNHrFcJJAKakZYC2K3YEGPy9fGMTP7urcS0yYqSg/exec"; 

function doPost(e) {
  const cache = CacheService.getScriptCache();
  try {
    if (!e.postData || !e.postData.contents) return ContentService.createTextOutput("OK");
    const data = JSON.parse(e.postData.contents);
    
    // ป้องกันการประมวลผลซ้ำ (Telegram Retry)
    if (data.update_id && cache.get("v80_" + data.update_id)) return ContentService.createTextOutput("OK");
    if (data.update_id) cache.put("v80_" + data.update_id, "1", 600);
    
    handleTelegramWebhook(data);
  } catch (err) {
    console.error("Critical Error: " + err.toString());
  }
  return ContentService.createTextOutput("OK");
}

function handleTelegramWebhook(data) {
  const props = PropertiesService.getScriptProperties();
  
  // --- [1] จัดการปุ่มกด (Callback) ---
  if (data.callback_query) {
    const cb = data.callback_query;
    const cid = cb.message.chat.id;
    const mid = cb.message.message_id;
    const uid = "TG_" + cb.from.id;
    const val = cb.data;
    
    callTG("answerCallbackQuery", { callback_query_id: cb.id });

    if (val === "cancel") {
      clearUser(uid);
      return editTG(cid, mid, "❌ ยกเลิกเรียบร้อย\nพิมพ์ 'ส่งงาน' เพื่อเริ่มใหม่");
    } 
    
    if (val.startsWith("pj|")) {
      const pj = val.split("|")[1];
      props.setProperties({ [uid+"_p"]: pj, [uid+"_s"]: "W_TY" });
      return editTGInline(cid, mid, `📁 โปรเจกต์: <b>${pj}</b>\n⚡ <b>ขั้นตอนที่ 2:</b> เลือกประเภทงานครับ`, TYPE_LIST.map(t => ({ text: t, data: "ty|"+t })));
    } 
    
    if (val.startsWith("ty|")) {
      const ty = val.split("|")[1];
      const pj = props.getProperty(uid+"_p") || "HAE"; // Default ถ้าหลุด
      props.setProperties({ [uid+"_t"]: ty, [uid+"_s"]: "W_SI" });
      return editTG(cid, mid, `📁 โปรเจกต์: <b>${pj}</b>\n⚡ ประเภท: <b>${ty}</b>\n\n🏢 <b>ขั้นตอนที่ 3:</b> กรุณาพิมพ์รหัส Site ครับ`);
    }

    if (val.startsWith("app|")) return processManualApprove(val.split("|")[1], cid);
    return;
  }

  // --- [2] จัดการข้อความ (Message) ---
  const msg = data.message || data.edited_message;
  if (!msg) return;

  const cid = msg.chat.id;
  const uid = "TG_" + msg.from.id;
  let text = (msg.text || "").trim();
  const s = props.getProperty(uid + "_s") || "IDLE";

  // คำสั่งเริ่มงาน
  if (text === "ส่งงาน" || text === "/start" || text === "สั่งงาน") {
    clearUser(uid); 
    props.setProperty(uid + "_s", "W_PJ");
    return sendTGInline(cid, "🏗️ <b>ขั้นตอนที่ 1:</b> เลือก Project ครับ", PROJECT_LIST.map(p => ({ text: p, data: "pj|"+p })));
  }

  // คำสั่งยกเลิก/จบงาน
  if (text === "ยกเลิก" || text === "จบงาน" || text === "เสร็จแล้ว") {
    if ((text === "จบงาน" || text === "เสร็จแล้ว") && s === "W_PH") {
      sendTG(cid, "✅ <b>รับทราบ!</b> ปิดรับรูปและสั่ง AI ตรวจทันทีครับ\n(รอผลประมวลผลประมาณ 1-3 นาที)", ["ส่งงาน"]);
      ScriptApp.newTrigger('runPatInspector').timeBased().after(1000).create();
    } else {
      sendTG(cid, "❌ ยกเลิกเรียบร้อย", ["ส่งงาน"]);
    }
    clearUser(uid); 
    return;
  }

  // ขั้นตอนที่ 3: รับรหัส Site (จุดที่เคยนิ่ง)
  if (s === "W_SI" && text !== "") {
    const pj = props.getProperty(uid+"_p") || "HAE";
    const ty = props.getProperty(uid+"_t") || "MBB";
    
    // ส่งข้อความ "กำลังสร้างโฟลเดอร์" เพื่อไม่ให้ Telegram Timeout
    const loadingMsg = sendTG(cid, "⏳ กำลังเตรียมโฟลเดอร์ Google Drive...");
    const lMid = JSON.parse(loadingMsg.getContentText()).result.message_id;

    try {
      const mainFolder = DriveApp.getFolderById(FOLDER_ID);
      const folderName = `${pj}_${ty}_${text}`;
      const folder = getOrCreateSubFolder(mainFolder, folderName);
      
      props.setProperties({ [uid+"_site"]: text, [uid+"_s"]: "W_PH" });

      const msgTxt = `✅ <b>โฟลเดอร์พร้อม!</b>\n🏢 Site: <b>${text}</b>\n\n🔗 <a href="${folder.getUrl()}">เปิดโฟลเดอร์ Drive</a>\n📸 ทยอยส่งรูปเข้าแชทนี้ได้เลยครับ\n\n(เสร็จแล้วกดปุ่ม <b>'จบงาน'</b> ด้านล่าง)`;
      
      // ลบข้อความ Loading และส่งข้อความจริง
      callTG("deleteMessage", { chat_id: cid, message_id: lMid });
      return sendTG(cid, msgTxt, ["จบงาน", "ยกเลิก"]);
      
    } catch (e) {
      return sendTG(cid, "❌ Error ในการสร้างโฟลเดอร์: " + e.toString());
    }
  }

  // รับรูปภาพ
  if (msg.photo && s === "W_PH") return processImage("TG", uid, cid, msg.photo[msg.photo.length - 1].file_id);
  
  // ถ้าพิมพ์อะไรมาเฉยๆ โดยไม่มีสถานะ
  if (text !== "" && s === "IDLE") {
    return sendTG(cid, "⚠️ ไม่พบขั้นตอนการทำงาน\nกรุณาพิมพ์ <b>'ส่งงาน'</b> เพื่อเริ่มใหม่ครับ");
  }
}

function processImage(p, uid, cid, mid) {
  const props = PropertiesService.getScriptProperties();
  try {
    const pj = props.getProperty(uid+"_p") || "Unknown";
    const ty = props.getProperty(uid+"_t") || "Unknown";
    const site = props.getProperty(uid+"_site") || "Unknown";
    const folder = getOrCreateSubFolder(DriveApp.getFolderById(FOLDER_ID), `${pj}_${ty}_site`);
    const blob = getTGImg(mid);
    folder.createFile(blob).setName(`${site}_${Date.now()}.jpg`).setDescription(`SENDER: TG|${uid}`);
  } catch (e) {}
}

function runPatInspector() {
  const ts = ScriptApp.getProjectTriggers();
  for (let t of ts) { if (t.getHandlerFunction() === 'runPatInspector') ScriptApp.deleteTrigger(t); }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  const mainFolder = DriveApp.getFolderById(FOLDER_ID);
  const mainArc = DriveApp.getFolderById(ARCHIVE_FOLDER_ID);
  const files = getAllRecursiveFiles(mainFolder);
  for (let f of files) {
    if (f.getDescription() && f.getDescription().includes("PAT_CHECKED")) continue;
    try {
      const parentName = f.getParents().hasNext() ? f.getParents().next().getName() : "Unknown";
      const ai = analyzeAI(f);
      const status = ai.status.toUpperCase();
      sheet.appendRow([new Date(), f.getName(), ai.sheetReference, status, ai.reason, f.getUrl(), f.getId()]);
      const targetFolder = getOrCreateSubFolder(getOrCreateSubFolder(mainArc, parentName), status === "PASS" ? ai.sheetReference : "FAIL_" + ai.sheetReference);
      f.moveTo(targetFolder);
      f.setDescription(`PAT_CHECKED: ${status} | ${f.getDescription() || ""}`);
      if (status !== "PASS") sendUniversalAlert(f.getName(), ai.sheetReference, ai.reason, f.getUrl(), f.getId());
    } catch (e) {}
  }
}

function analyzeAI(file) {
  const API_KEY = "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"; 
  const b64 = Utilities.base64Encode(file.getBlob().getBytes());
  const res = UrlFetchApp.fetch("https://api.groq.com/openai/v1/chat/completions", { 
    method: "post", headers: { Authorization: "Bearer " + API_KEY, "Content-Type": "application/json" }, 
    payload: JSON.stringify({ "model": "llama-3.2-11b-vision-preview", "messages": [{ "role": "user", "content": [{ "type": "text", "text": "ตอบ JSON: {\"sheetReference\": \"หมวด\", \"status\": \"PASS/FAIL\", \"reason\": \"เหตุผลไทย\"}" }, { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${b64}` } }] }], "response_format": { "type": "json_object" } }), 
    muteHttpExceptions: true 
  });
  try { return JSON.parse(JSON.parse(res.getContentText()).choices[0].message.content); } catch (e) {}
  return { status: "FAIL", reason: "AI Service Error", sheetReference: "AI_ERROR" };
}

function sendUniversalAlert(fn, cat, reason, url, fid) {
  const tgKb = { inline_keyboard: [[{ text: "✅ อนุมัติ", callback_data: "app|" + fid }, { text: "🔍 ดูรูป", url: url }]] };
  const txt = `🚨 <b>ตรวจพบงานไม่ผ่าน</b>\nไฟล์: ${fn}\nหมวด: ${cat}\nสาเหตุ: ${reason}`;
  UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, { method: "post", contentType: "application/json", payload: JSON.stringify({ chat_id: TELEGRAM_TARGET_ID, text: txt, parse_mode: "HTML", reply_markup: tgKb }), muteHttpExceptions: true });
}

function sendTG(cid, txt, buttons) {
  let kb = { keyboard: [], resize_keyboard: true, one_time_keyboard: true };
  if (buttons) {
    let row = [];
    buttons.forEach(b => { row.push({ text: String(b) }); if (row.length === 2) { kb.keyboard.push(row); row = []; } });
    if (row.length > 0) kb.keyboard.push(row);
  } else { kb = { remove_keyboard: true }; }
  return callTG("sendMessage", { chat_id: cid, text: txt, parse_mode: "HTML", reply_markup: kb, disable_web_page_preview: true });
}

function sendTGInline(cid, txt, btns) {
  const kb = { inline_keyboard: [] };
  let row = [];
  btns.forEach(b => { row.push({ text: b.text, callback_data: b.data }); if (row.length === 2) { kb.inline_keyboard.push(row); row = []; } });
  if (row.length > 0) kb.inline_keyboard.push(row);
  kb.inline_keyboard.push([{ text: "❌ ยกเลิก", callback_data: "cancel" }]);
  return callTG("sendMessage", { chat_id: cid, text: txt, parse_mode: "HTML", reply_markup: kb });
}

function editTGInline(cid, mid, txt, btns) {
  const kb = { inline_keyboard: [] };
  let row = [];
  btns.forEach(b => { row.push({ text: b.text, callback_data: b.data }); if (row.length === 2) { kb.inline_keyboard.push(row); row = []; } });
  if (row.length > 0) kb.inline_keyboard.push(row);
  kb.inline_keyboard.push([{ text: "❌ ยกเลิก", callback_data: "cancel" }]);
  return callTG("editMessageText", { chat_id: cid, message_id: mid, text: txt, parse_mode: "HTML", reply_markup: kb });
}

function editTG(cid, mid, txt) {
  return callTG("editMessageText", { chat_id: cid, message_id: mid, text: txt, parse_mode: "HTML" });
}

function callTG(m, p) {
  return UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${m}`, { method: "post", contentType: "application/json", payload: JSON.stringify(p), muteHttpExceptions: true });
}

function getTGImg(id) {
  const res = JSON.parse(UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${id}`));
  return UrlFetchApp.fetch(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${res.result.file_path}`).getBlob();
}

function clearUser(uid) {
  const props = PropertiesService.getScriptProperties();
  ["_s", "_p", "_t", "_site"].forEach(k => props.deleteProperty(uid + k));
}

function getOrCreateSubFolder(p, n) { 
  const f = p.getFoldersByName(n); 
  return f.hasNext() ? f.next() : p.createFolder(n); 
}

function getAllRecursiveFiles(folder) {
  let files = [];
  const rf = folder.getFiles(); while (rf.hasNext()) files.push(rf.next());
  const sub = folder.getFolders(); while (sub.hasNext()) files = files.concat(getAllRecursiveFiles(sub.next()));
  return files;
}

function FIX_ล้างระบบและยึดอำนาจ() {
  const url = WEBHOOK_URL;
  UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${url}&drop_pending_updates=true`);
  PropertiesService.getScriptProperties().deleteAllProperties();
  console.log("ล้างระบบและยึดอำนาจสำเร็จ! เชื่อมต่อกับ " + url);
}
