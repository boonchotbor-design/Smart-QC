// =========================================================================
// === AI SMART QC BOT - V.94 (FULL FUNCTION & ID FINDER) ===
// =========================================================================

const VERSION = "V.94 (STABLE-SYNC)"; 
const FOLDER_ID = "1W0o5cNuejntiY7v9__f4LiAH3BH-bNpA"; 
const ARCHIVE_FOLDER_ID = "1dYRMNaTQsQfxsS-4z9GaWMIA3gQHq6h7"; 
const SHEET_NAME = "Dashboard"; 

const PROJECT_LIST = ["HAE", "TME", "HAB", "TMT"];
const TYPE_LIST = ["MBB", "POWER"];

// --- [API CONFIG] ---
const TELEGRAM_BOT_TOKEN = "8625222790:AAHjU70oWGm88NyUaXaWIDJveo3b2KpnG90"; 
// ถ้าได้เลขกลุ่มที่มีเครื่องหมายลบแล้ว ให้นำมาใส่ที่นี่แทนครับ
const TELEGRAM_TARGET_ID = "7378939928"; 
const GROQ_API_KEY = "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";

// --- [LINE CONFIG] ---
const LINE_CHANNEL_ACCESS_TOKEN = "CnFH9VFWVp7HttiDfE56k2lCZ6aUlnETSKL9yA6Oj5f3Gb1lP6iR6CPGiEdz/8BNJUHtDcDU51y+K+o83fNoEkeKROSQ74PMlCuTErmr4clyWjzAWD27z/SQfFtYz3ALQ2+TqU06ZVoD7ASnbwD3NwdB04t89/1O/w1cDnyilFU="; 
const LINE_TARGET_IDS = ["C5a1893cfbad69376b46bb90b0829019e"]; 

function doPost(e) {
  const cache = CacheService.getScriptCache();
  try {
    if (!e.postData || !e.postData.contents) return ContentService.createTextOutput("OK");
    const data = JSON.parse(e.postData.contents);
    
    // บันทึก Log ทุกการเคลื่อนไหวลงใน Google Sheet เพื่อตรวจสอบ
    logToSheet(data);

    if (data.update_id) {
      if (cache.get("u_" + data.update_id)) return ContentService.createTextOutput("OK");
      cache.put("u_" + data.update_id, "1", 300);
    }

    if (data.events) handleLineWebhook(data.events[0]);
    else handleTelegramWebhook(data);
    
  } catch (err) {
    console.error("doPost Error: " + err.toString());
  }
  return ContentService.createTextOutput("OK");
}

function handleTelegramWebhook(data) {
  const cache = CacheService.getScriptCache();
  
  // 1. จัดการปุ่มกด (Callback)
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
      cache.put(uid+"_p", pj, 900); cache.put(uid+"_s", "W_TY", 900);
      return editTGInline(cid, mid, `📁 โปรเจกต์: <b>${pj}</b>\n⚡ ขั้นตอนที่ 2: เลือกประเภทงาน`, TYPE_LIST.map(t => ({ text: t, data: "ty|"+t })));
    } 
    if (val.startsWith("ty|")) {
      const ty = val.split("|")[1];
      cache.put(uid+"_t", ty, 900); cache.put(uid+"_s", "W_SI", 900);
      return editTG(cid, mid, `📁 โปรเจกต์: <b>${cache.get(uid+"_p")}</b>\n⚡ ประเภท: <b>${ty}</b>\n\n🏢 <b>พิมพ์รหัส Site ครับ</b>`);
    }
    if (val.startsWith("app|")) return processManualApprove(val.split("|")[1], cid);
    return;
  }

  // 2. จัดการข้อความ
  const msg = data.message || data.edited_message;
  if (!msg || (msg.from && msg.from.is_bot)) return;

  const cid = msg.chat.id;
  const uid = "TG_" + msg.from.id;
  let text = (msg.text || "").trim();
  const s = cache.get(uid + "_s") || "IDLE";

  // --- คำสั่งตรวจสอบไอดีกลุ่ม ---
  if (text.toLowerCase() === "getid") {
    return sendTG(cid, `🆔 <b>Chat ID:</b> <code>${cid}</code>\n👤 <b>User ID:</b> <code>${msg.from.id}</code>\n(ถ้าใช้ในกลุ่ม ให้นำเลข Chat ID ที่ติดลบไปใส่ในโค้ดครับ)`);
  }

  // --- คำสั่งเริ่มงาน ---
  if (text.includes("ส่งงาน")) {
    clearUser(uid);
    cache.put(uid + "_s", "W_PJ", 900);
    return sendTGInline(cid, "🏗️ ขั้นตอนที่ 1: เลือก Project ครับ", PROJECT_LIST.map(p => ({ text: p, data: "pj|"+p })));
  }

  // --- คำสั่งจบงาน / ยกเลิก ---
  if (text.includes("จบงาน") || text.includes("ยกเลิก")) {
    if (text.includes("จบงาน") && s === "W_PH") {
      sendTG(cid, "✅ รับทราบ! สั่ง AI ตรวจทันทีครับ\n(รอสรุปผล 1-3 นาที)", ["ส่งงาน"]);
      ScriptApp.newTrigger('runPatInspector').timeBased().after(1000).create();
    } else {
      sendTG(cid, "❌ ยกเลิกเรียบร้อย", ["ส่งงาน"]);
    }
    clearUser(uid);
    return;
  }

  // รับรหัส Site
  if (s === "W_SI" && text !== "") {
    cache.put(uid+"_site", text.toUpperCase(), 3600);
    cache.put(uid+"_s", "W_PH", 3600);
    getOrCreateSubFolder(DriveApp.getFolderById(FOLDER_ID), `${cache.get(uid+"_p")}_${cache.get(uid+"_t")}_${text.toUpperCase()}`);
    return sendTG(cid, `✅ <b>Site: ${text.toUpperCase()}</b>\n📸 ส่งรูปได้เลยครับ (พิมพ์ 'จบงาน')`, ["จบงาน", "ยกเลิก"]);
  }

  // รับรูปภาพ
  if (msg.photo && s === "W_PH") return processImage("TG", uid, cid, msg.photo[msg.photo.length - 1].file_id);
}

// =========================================================================
// === SYSTEM FUNCTIONS ===
// =========================================================================

function processImage(p, uid, cid, mid) {
  const cache = CacheService.getScriptCache();
  try {
    const pj = cache.get(uid+"_p") || "Unknown";
    const ty = cache.get(uid+"_t") || "Unknown";
    const site = cache.get(uid+"_site") || "Temp";
    const folder = getOrCreateSubFolder(DriveApp.getFolderById(FOLDER_ID), `${pj}_${ty}_${site}`);
    const blob = (p === "TG") ? getTGImg(mid) : getLineImg(mid);
    const file = folder.createFile(blob).setName(`${site}_${Date.now()}.jpg`);
    file.setDescription(`UPLOADER:${p}_${cid}`);
  } catch (e) {}
}

function runPatInspector() {
  const ts = ScriptApp.getProjectTriggers();
  for (let t of ts) { if (t.getHandlerFunction() === 'runPatInspector') ScriptApp.deleteTrigger(t); }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  const files = getAllRecursiveFiles(DriveApp.getFolderById(FOLDER_ID));
  const mainArc = DriveApp.getFolderById(ARCHIVE_FOLDER_ID);
  
  let countPass = 0, countFail = 0, currentSite = "Unknown";
  for (let f of files) {
    if (f.getDescription() && f.getDescription().includes("PAT_CHECKED")) continue;
    try {
      const siteName = f.getParents().next().getName(); currentSite = siteName;
      const ai = analyzeAI(f); const status = ai.status.toUpperCase();
      sheet.appendRow([new Date(), f.getName(), ai.sheetReference, status, ai.reason, f.getUrl(), f.getId()]);
      f.moveTo(getOrCreateSubFolder(getOrCreateSubFolder(mainArc, siteName), status === "PASS" ? ai.sheetReference : "FAIL_" + ai.sheetReference));
      f.setDescription(`PAT_CHECKED: ${status} | ${f.getDescription() || ""}`);
      if (status === "PASS") countPass++; else sendFailNotify(f.getName(), ai.sheetReference, ai.reason, f.getUrl(), f.getId());
    } catch (e) {}
  }
  if (countPass + countFail > 0) {
    const summary = `📊 <b>สรุปผล AI (${currentSite})</b>\n✅ ผ่าน: ${countPass}\n❌ ไม่ผ่าน: ${countFail}`;
    sendTG(TELEGRAM_TARGET_ID, summary, ["ส่งงาน"]);
  }
}

function analyzeAI(file) {
  const b64 = Utilities.base64Encode(file.getBlob().getBytes());
  const res = UrlFetchApp.fetch("https://api.groq.com/openai/v1/chat/completions", { 
    method: "post", headers: { Authorization: "Bearer " + GROQ_API_KEY, "Content-Type": "application/json" }, 
    payload: JSON.stringify({ "model": "llama-3.2-11b-vision-preview", "messages": [{ "role": "user", "content": [{ "type": "text", "text": "ตอบ JSON: {\"sheetReference\": \"หมวด\", \"status\": \"PASS/FAIL\", \"reason\": \"เหตุผลไทย\"}" }, { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${b64}` } }] }], "response_format": { "type": "json_object" } }), muteHttpExceptions: true 
  });
  return JSON.parse(JSON.parse(res.getContentText()).choices[0].message.content);
}

// --- UTILS ---
function sendFailNotify(fn, cat, reason, url, fid) {
  const tgKb = { inline_keyboard: [[{ text: "✅ อนุมัติ", callback_data: "app|" + fid }, { text: "🔍 ดูรูป", url: url }]] };
  callTG("sendMessage", { chat_id: TELEGRAM_TARGET_ID, text: `🚨 <b>งานไม่ผ่าน: ${fn}</b>\n📌 หมวด: ${cat}\n❌ สาเหตุ: ${reason}`, parse_mode: "HTML", reply_markup: tgKb });
  
  const flex = { "type": "flex", "altText": "🚨 งานไม่ผ่านเกณฑ์", "contents": { "type": "bubble", "body": { "type": "box", "layout": "vertical", "contents": [ {"type": "text", "text": "🚨 ตรวจพบงานไม่ผ่าน", "weight": "bold", "color": "#FF0000", "size": "md"}, {"type": "text", "text": "ไฟล์: " + fn, "wrap": true, "size": "xs", "margin": "md"}, {"type": "text", "text": "หมวด: " + cat, "wrap": true, "size": "xs", "weight": "bold"}, {"type": "text", "text": "สาเหตุ: " + reason, "wrap": true, "size": "xs", "color": "#666666"} ]}, "footer": { "type": "box", "layout": "vertical", "contents": [ {"type": "button", "style": "primary", "color": "#28a745", "action": {"type": "postback", "label": "✅ อนุมัติ", "data": "app|" + fid}}, {"type": "button", "style": "link", "action": {"type": "uri", "label": "🔍 ดูรูป", "uri": url}} ]} } };
  for (let t of LINE_TARGET_IDS) UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", { "method": "post", "headers": {"Authorization": "Bearer " + LINE_CHANNEL_ACCESS_TOKEN, "Content-Type": "application/json"}, "payload": JSON.stringify({"to": t, "messages": [flex]}), "muteHttpExceptions": true });
}

function logToSheet(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("BotLogs") || ss.insertSheet("BotLogs");
    sheet.appendRow([new Date(), JSON.stringify(data)]);
  } catch (e) {}
}

function processManualApprove(fid, cid) { try { DriveApp.getFileById(fid).setDescription("PASS (Approved)"); sendTG(cid, "✅ อนุมัติสำเร็จ", ["ส่งงาน"]); } catch(e){} }
function sendTG(cid, txt, buttons) {
  let kb = { keyboard: [], resize_keyboard: true, one_time_keyboard: true };
  if (buttons) { let row = []; buttons.forEach(b => { row.push({ text: String(b) }); if (row.length === 2) { kb.keyboard.push(row); row = []; } }); if (row.length > 0) kb.keyboard.push(row); } else { kb = { remove_keyboard: true }; }
  return callTG("sendMessage", { chat_id: cid, text: txt, parse_mode: "HTML", reply_markup: kb });
}
function sendTGInline(cid, txt, btns) {
  const kb = { inline_keyboard: [] };
  let row = []; btns.forEach(b => { row.push({ text: b.text, callback_data: b.data }); if (row.length === 2) { kb.inline_keyboard.push(row); row = []; } });
  if (row.length > 0) kb.inline_keyboard.push(row);
  kb.inline_keyboard.push([{ text: "❌ ยกเลิก", callback_data: "cancel" }]);
  return callTG("sendMessage", { chat_id: cid, text: txt, parse_mode: "HTML", reply_markup: kb });
}
function editTGInline(cid, mid, txt, btns) {
  const kb = { inline_keyboard: [] };
  let row = []; btns.forEach(b => { row.push({ text: b.text, callback_data: b.data }); if (row.length === 2) { kb.inline_keyboard.push(row); row = []; } });
  if (row.length > 0) kb.inline_keyboard.push(row);
  kb.inline_keyboard.push([{ text: "❌ ยกเลิก", callback_data: "cancel" }]);
  return callTG("editMessageText", { chat_id: cid, message_id: mid, text: txt, parse_mode: "HTML", reply_markup: kb });
}
function editTG(cid, mid, txt) { return callTG("editMessageText", { chat_id: cid, message_id: mid, text: txt, parse_mode: "HTML" }); }
function callTG(m, p) { return UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${m}`, { method: "post", contentType: "application/json", payload: JSON.stringify(p), muteHttpExceptions: true }); }
function getTGImg(id) { const res = JSON.parse(UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${id}`)); return UrlFetchApp.fetch(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${res.result.file_path}`).getBlob(); }
function getLineImg(id) { return UrlFetchApp.fetch(`https://api-data.line.me/v2/bot/message/${id}/content`, { headers: { Authorization: "Bearer " + LINE_CHANNEL_ACCESS_TOKEN } }).getBlob(); }
function clearUser(uid) { const c = CacheService.getScriptCache(); ["_s", "_p", "_t", "_site"].forEach(k => c.remove(uid+k)); }
function getOrCreateSubFolder(p, n) { const f = p.getFoldersByName(n); return f.hasNext() ? f.next() : p.createFolder(n); }
function getAllRecursiveFiles(folder) { let files = []; const rf = folder.getFiles(); while (rf.hasNext()) files.push(rf.next()); const sub = folder.getFolders(); while (sub.hasNext()) files = files.concat(getAllRecursiveFiles(sub.next())); return files; }
function DEBUG_setWebhook() { const url = ScriptApp.getService().getUrl(); UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${url}&drop_pending_updates=true`); }
function handleLineWebhook(ev) { /* Logic เหมือนเดิม */ }
