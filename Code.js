// =========================================================================
// === AI SMART QC BOT - V.95 (ULTIMATE STABLE & FIX UTILS) ===
// =========================================================================

const VERSION = "V.95 (SUCCESS-SYNC)"; 
const FOLDER_ID = "1W0o5cNuejntiY7v9__f4LiAH3BH-bNpA"; 
const ARCHIVE_FOLDER_ID = "1dYRMNaTQsQfxsS-4z9GaWMIA3gQHq6h7"; 
const SHEET_NAME = "Dashboard"; 

const PROJECT_LIST = ["HAE", "TME", "HAB", "TMT"];
const TYPE_LIST = ["MBB", "POWER"];

// --- [API CONFIG] ---
const TELEGRAM_BOT_TOKEN = "8625222790:AAHjU70oWGm88NyUaXaWIDJveo3b2KpnG90"; 
const TELEGRAM_TARGET_ID = "7378939928"; 
const GROQ_API_KEY = "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";

// --- [LINE CONFIG] ---
const LINE_CHANNEL_ACCESS_TOKEN = "CnFH9VFWVp7HttiDfE56k2lCZ6aUlnETSKL9yA6Oj5f3Gb1lP6iR6CPGiEdz/8BNJUHtDcDU51y+K+o83fNoEkeKROSQ74PMlCuTErmr4clyWjzAWD27z/SQfFtYz3ALQ2+TqU06ZVoD7ASnbwD3NwdB04t89/1O/w1cDnyilFU="; 
const LINE_TARGET_IDS = ["C5a1893cfbad69376b46bb90b0829019e"]; 

/**
 * ฟังก์ชันรับ Webhook จาก Telegram และ LINE
 */
function doPost(e) {
  const cache = CacheService.getScriptCache();
  try {
    if (!e.postData || !e.postData.contents) return ContentService.createTextOutput("OK");
    const data = JSON.parse(e.postData.contents);
    
    // บันทึก Log ทุกการเคลื่อนไหวลงใน Google Sheet เพื่อตรวจสอบ (แผ่นงาน BotLogs)
    logToSheet(data);

    // ป้องกันการทำงานซ้ำ (Deduplicate)
    if (data.update_id) {
      if (cache.get("u_" + data.update_id)) return ContentService.createTextOutput("OK");
      cache.put("u_" + data.update_id, "1", 300);
    }

    if (data.events) {
      // จัดการ LINE
      handleLineWebhook(data.events[0]);
    } else {
      // จัดการ Telegram
      handleTelegramWebhook(data);
    }
    
  } catch (err) {
    console.error("doPost Error: " + err.toString());
  }
  return ContentService.createTextOutput("OK");
}

// =========================================================================
// === [TELEGRAM HANDLER] ===
// =========================================================================

function handleTelegramWebhook(data) {
  const cache = CacheService.getScriptCache();
  
  // 1. จัดการปุ่มกด (Callback Query)
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
      return editTGInline(cid, mid, `📁 โปรเจกต์: <b>${cache.get(uid+"_p")}</b>\n⚡ ประเภท: <b>${ty}</b>\n\n🏢 <b>พิมพ์รหัส Site ครับ</b>`);
    }
    if (val.startsWith("app|")) return processManualApprove(val.split("|")[1], cid);
    return;
  }

  // 2. จัดการข้อความ (Message)
  const msg = data.message || data.edited_message;
  if (!msg || (msg.from && msg.from.is_bot)) return;

  const cid = msg.chat.id;
  const uid = "TG_" + msg.from.id;
  let text = (msg.text || "").trim();
  const s = cache.get(uid + "_s") || "IDLE";

  // คำสั่งเริ่มงาน
  if (text.includes("ส่งงาน") || text === "/start") {
    clearUser(uid);
    cache.put(uid + "_s", "W_PJ", 900);
    return sendTGInline(cid, "🏗️ ขั้นตอนที่ 1: เลือก Project ครับ", PROJECT_LIST.map(p => ({ text: p, data: "pj|"+p })));
  }

  // คำสั่งจบงาน / ยกเลิก
  if (text.includes("จบงาน") || text.includes("ยกเลิก") || text === "/stop") {
    if (text.includes("จบงาน") && s === "W_PH") {
      sendTG(cid, "✅ รับทราบ! สั่ง AI ตรวจทันทีครับ\n(รอสรุปผล 1-3 นาที)", ["ส่งงาน"]);
      ScriptApp.newTrigger('runPatInspector').timeBased().after(1000).create();
    } else {
      sendTG(cid, "❌ ยกเลิกเรียบร้อย", ["ส่งงาน"]);
    }
    clearUser(uid);
    return;
  }

  // ขั้นตอนที่ 3: รับรหัส Site
  if (s === "W_SI" && text !== "") {
    cache.put(uid+"_site", text.toUpperCase(), 3600);
    cache.put(uid+"_s", "W_PH", 3600);
    getOrCreateSubFolder(DriveApp.getFolderById(FOLDER_ID), `${cache.get(uid+"_p")}_${cache.get(uid+"_t")}_${text.toUpperCase()}`);
    return sendTG(cid, `✅ <b>Site: ${text.toUpperCase()}</b>\n📸 ส่งรูปได้เลยครับ (พิมพ์ 'จบงาน' เมื่อส่งครบ)`, ["จบงาน", "ยกเลิก"]);
  }

  // รับรูปภาพ
  if (msg.photo && s === "W_PH") return processImage("TG", uid, cid, msg.photo[msg.photo.length - 1].file_id);
}

// =========================================================================
// === [LINE HANDLER] ===
// =========================================================================

function handleLineWebhook(ev) {
  const uid = ev.source.userId;
  if (ev.type === 'message' && ev.message.type === 'text') {
    processLineText(uid, ev.message.text.trim());
  } else if (ev.type === 'message' && ev.message.type === 'image') {
    processImage("LINE", "LINE_"+uid, uid, ev.message.id);
  }
}

function processLineText(uid, text) {
  const cache = CacheService.getScriptCache();
  const key = "LINE_" + uid;
  const s = cache.get(key + "_s") || "IDLE";

  if (text === "ส่งงาน" || text === "สั่งงาน") {
    clearUser(key);
    cache.put(key + "_s", "W_PJ", 900);
    sendMsg(uid, "🏗️ ขั้นตอนที่ 1: เลือก Project", [...PROJECT_LIST, "ยกเลิก"]);
  } else if (s === "W_PJ" && PROJECT_LIST.includes(text)) {
    cache.put(key+"_p", text, 900); cache.put(key+"_s", "W_TY", 900);
    sendMsg(uid, `📁 โปรเจกต์: ${text}\n⚡ ขั้นตอนที่ 2: เลือกประเภทงาน`, [...TYPE_LIST, "ยกเลิก"]);
  } else if (s === "W_TY" && TYPE_LIST.includes(text)) {
    cache.put(key+"_t", text, 900); cache.put(key+"_s", "W_SI", 900);
    sendMsg(uid, `⚡ ประเภท: ${text}\n🏢 ขั้นตอนที่ 3: พิมพ์รหัส Site`, ["ยกเลิก"]);
  } else if (s === "W_SI" && text !== "ยกเลิก") {
    cache.put(key+"_site", text.toUpperCase(), 3600); cache.put(key+"_s", "W_PH", 3600);
    sendMsg(uid, `✅ พร้อม! ส่งรูปได้เลยครับ (พิมพ์ 'จบงาน' เมื่อส่งครบ)`, ["จบงาน", "ยกเลิก"]);
  } else if (text === "จบงาน") {
    if (s === "W_PH") ScriptApp.newTrigger('runPatInspector').timeBased().after(1000).create();
    clearUser(key); 
    sendMsg(uid, "✅ เริ่มตรวจงานทันที...");
  } else if (text === "ยกเลิก") {
    clearUser(key);
    sendMsg(uid, "❌ ยกเลิกเรียบร้อย");
  }
}

// =========================================================================
// === [CORE AI PROCESSING] ===
// =========================================================================

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
  const promptText = `
    You are an expert Telecom Quality Assurance Inspector. 
    Analyze the attached cell site installation photo VISUALLY. 
    
    Task 1: IDENTIFICATION (Categorization)
    Identify which PAT category this image belongs to. You MUST choose ONLY ONE category from the following EXACT list:
    ["2.3(M16)", "2.3(M17)", "2.3(M19-A1)", "2.3(M19-A2)", "2.3(M20.1-Ant1)", "2.3(M20.2-Ant1)", "2.3(M20.1-Ant2)", "2.3(M20.2-Ant2)", "2.3(M20.1-Ant3)", "2.3(M20.2-Ant3)", "2.3(M20.1-Ant4)", "2.3(M20.2-Ant4)", "2.3(M22-GND BAR)", "2.3(M22-MST GND)", "2.3(M24-GND DCDU)", "2.3(M24-GND DCDU (2))", "2.3(M22-GND-RRU)", "2.3(M24-RRU view S 1st)", "2.3(M24-RRU view S 2nd)", "2.3(M24-RRU view S 3th)", "2.3(M24-RRU view S 4th)", "2.3(M24-Add card 1)", "2.3(M24-add card 2)", "2.3(M26-DCDU socket ตามระบุ)", "2.3(M24-DC-RRU 1st)", "2.3(M25  RRU1-Clamp-RET)", "2.3(M24-DC-RRU 2nd)", "2.3(M25 RRU2-clamp-RET)", "2.3(M24-DC-AAU 2nd)", "2.3(M25 AAU2-Clamp-RET)", "2.3(M24-DC-RRU 4th)", "2.3(M25 RRU4-Clamp-RET)", "2.3(M23-inlet-outlet)", "2.3(M23-inlet-outlet (2))", "2.3(M27)Ladder", "2.3(M27)-J-Loop", "2.3(M30-Krone 1-2)", "2.3(M30-GPS)", "2.3(M32-rec C1-3)", "2.3(M30 C1)", "2.3(M30 C2)", "2.3(M32) BreakerC1-3", "2.3(M32)DCDU", "2.3(M32) LED-load", "Notch CPRI", "No.POE+Clean (1)", "Remote Site", "2.4-BOQ", "dismantle"]
    
    Task 2: QUALITY CHECK (Pass/Fail)
    Evaluate the quality based on these Telecom Golden Rules:
    - DC Cables (M24-DC-RRU / DCDU): Must be inserted FULLY into sockets. NO exposed copper wire is allowed.
    - Grounding (M22 / GND): Crimping terminals (หางปลา) must be tightly bolted.
    - Weatherproofing (Antenna/RRU): Tape must be wrapped neatly (cone shape) with no gaps.
    - Cabling (CPRI/J-Loop/Ladder): Neatly tied with cable ties. No messy loops.
    - Cleanliness (No.POE+Clean): The floor/room must be entirely clean. No cable ties or trash.
    - Dismantle: Must clearly show removed equipment or empty space.
    
    Task 3: OUTPUT FORMAT
    Output exactly as a JSON object:
    {
      "sheetReference": "Exact category string from the list above",
      "status": "PASS or FAIL",
      "reason": "If FAIL, explain the specific defect clearly in THAI language (e.g., 'ปอกสายไฟ DC ยาวเกินไปจนเห็นทองแดงเปลือย', 'เข้าหางปลาไม่เรียบร้อย', 'มีขยะหน้าไซต์งาน'). If PASS, output 'ผ่านเกณฑ์มาตรฐานความถูกต้อง'."
    }
  `;
  const res = UrlFetchApp.fetch("https://api.groq.com/openai/v1/chat/completions", { 
    method: "post", headers: { Authorization: "Bearer " + GROQ_API_KEY, "Content-Type": "application/json" }, 
    payload: JSON.stringify({ "model": "llama-3.2-11b-vision-preview", "messages": [{ "role": "user", "content": [{ "type": "text", "text": promptText }, { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${b64}` } }] }], "response_format": { "type": "json_object" } }), muteHttpExceptions: true 
  });
  return JSON.parse(JSON.parse(res.getContentText()).choices[0].message.content);
}

// =========================================================================
// === [HELPER UTILS] ===
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
function sendMsg(t, txt, q) { let pl = { to: t, messages: [{ type: "text", text: txt }] }; if (q) pl.messages[0].quickReply = { items: q.map(o => ({ type: "action", action: { type: "message", label: o, text: o } })) }; return UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", { method: "post", headers: { "Content-Type": "application/json", Authorization: "Bearer " + LINE_CHANNEL_ACCESS_TOKEN }, payload: JSON.stringify(pl), muteHttpExceptions: true }); }
function getTGImg(id) { const res = JSON.parse(UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${id}`)); return UrlFetchApp.fetch(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${res.result.file_path}`).getBlob(); }
function getLineImg(id) { return UrlFetchApp.fetch(`https://api-data.line.me/v2/bot/message/${id}/content`, { headers: { Authorization: "Bearer " + LINE_CHANNEL_ACCESS_TOKEN } }).getBlob(); }
function clearUser(uid) { const c = CacheService.getScriptCache(); ["_s", "_p", "_t", "_site"].forEach(k => c.remove(uid+k)); }
function getOrCreateSubFolder(p, n) { const f = p.getFoldersByName(n); return f.hasNext() ? f.next() : p.createFolder(n); }
function getAllRecursiveFiles(folder) { let files = []; const rf = folder.getFiles(); while (rf.hasNext()) files.push(rf.next()); const sub = folder.getFolders(); while (sub.hasNext()) files = files.concat(getAllRecursiveFiles(sub.next())); return files; }

// =========================================================================
// === [FIX UTILS - รันเมื่อระบบไม่ตอบสนอง] ===
// =========================================================================

/**
 * ฟังก์ชันสำหรับตั้งค่า Webhook ของ Telegram
 * 1. กด Deploy -> New Deployment -> เลือก Web App
 * 2. คัดลอก URL ของ Web App ที่ได้
 * 3. นำมาวางในตัวแปร webAppUrl ด้านล่าง
 * 4. เลือกฟังก์ชัน FIX_TELEGRAM แล้วกด Run
 */
function FIX_TELEGRAM() {
  const webAppUrl = "ใส่_URL_ของ_WEB_APP_ที่นี่"; 
  
  if (webAppUrl.indexOf("macros") === -1) {
    throw new Error("❌ กรุณาใส่ URL ของ Web App ที่ได้จากการ Deploy (ไม่ใช่ URL ของ Script)");
  }

  // 1. ตรวจสอบ Bot Token
  const test = UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
  Logger.log("Bot Info: " + test.getContentText());

  // 2. ตั้งค่า Webhook
  const response = UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${webAppUrl}&drop_pending_updates=true`);
  Logger.log("Webhook Status: " + response.getContentText());
  
  return "✅ ดำเนินการเสร็จสิ้น! กรุณาตรวจสอบผลใน Logger";
}

function DEBUG_setWebhook() { const url = ScriptApp.getService().getUrl(); UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${url}&drop_pending_updates=true`); }
