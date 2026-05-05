// =========================================================================
// === AI SMART QC BOT - V.109 (ULTIMATE BACKLOG & TRIGGER KILLER) ===
// =========================================================================

const VERSION = "V.109 (ULTRA-CLEAN-STABLE)"; 
const FOLDER_ID = "1W0o5cNuejntiY7v9__f4LiAH3BH-bNpA"; 
const ARCHIVE_FOLDER_ID = "1dYRMNaTQsQfxsS-4z9GaWMIA3gQHq6h7"; 
const SHEET_NAME = "Dashboard"; 
const SPREADSHEET_ID = "1-D-YNXQwAoIAgpTxUGvgY-6caRtuMgarZ68wwA6jmnA"; 

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyL9UWyBYXA7707z3eBiNYCvIoCszDu2ZNn_iZ1udkZlYqpEj3h8TzXQz_MQxcF1h8Dwg/exec";

const PROJECT_LIST = ["HAE", "TME", "HAB", "TMT"];
const TYPE_LIST = ["MBB", "POWER"];

// --- [API CONFIG] ---
const TELEGRAM_BOT_TOKEN = "8625222790:AAHjU70oWGm88NyUaXaWIDJveo3b2KpnG90"; 
const TELEGRAM_TARGET_ID = "7378939928"; 
const GROQ_API_KEY = "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";

// --- [LINE CONFIG] ---
const LINE_CHANNEL_ACCESS_TOKEN = "CnFH9VFWVp7HttiDfE56k2lCZ6aUlnETSKL9yA6Oj5f3Gb1lP6iR6CPGiEdz/8BNJUHtDcDU51y+K+o83fNoEkeKROSQ74PMlCuTErmr4clyWjzAWD27z/SQfFtYz3ALQ2+TqU06ZVoD7ASnbwD3NwdB04t89/1O/w1cDnyilFU="; 
const LINE_TARGET_IDS = ["C5a1893cfbad69376b46bb90b0829019e"]; 

function doGet() {
  return ContentService.createTextOutput(`🤖 Bot (${VERSION}) is READY.`);
}

/**
 * Webhook entry point - FASTEST RESPONSE POSSIBLE
 */
function doPost(e) {
  const cache = CacheService.getScriptCache();
  const props = PropertiesService.getUserProperties();
  
  try {
    if (!e.postData || !e.postData.contents) return ContentService.createTextOutput("OK");
    const contents = e.postData.contents;
    const data = JSON.parse(contents);
    
    // 1. FAST DEDUPLICATION (Memory check first)
    const updateId = data.update_id ? "uid_" + data.update_id : (data.events ? "eid_" + data.events[0].webhookEventId : null);
    if (updateId) {
      if (cache.get(updateId) || props.getProperty(updateId)) return ContentService.createTextOutput("OK");
      cache.put(updateId, "1", 21600); // 6 hours
      props.setProperty(updateId, "1"); // Permanent (until manual clear)
    }

    // 2. BACKLOG PROTECTION (IGNORE OLD MESSAGES)
    if (data.message && data.message.date) {
      const now = Math.floor(Date.now() / 1000);
      if (now - data.message.date > 120) return ContentService.createTextOutput("OK");
    }

    // 3. ASYNC-LIKE LOGGING
    try { logToSheet(data); } catch(l){}

    // 4. PROCESS PLATFORMS
    if (data.events) {
      handleLineWebhook(data.events[0]);
    } else {
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
  const props = PropertiesService.getUserProperties();
  
  // A. Callback Query
  if (data.callback_query) {
    const cb = data.callback_query; const cid = cb.message.chat.id; const mid = cb.message.message_id; const uid = "TG_" + cb.from.id; const val = cb.data;
    callTG("answerCallbackQuery", { callback_query_id: cb.id });
    if (val === "cancel") { clearUser(uid); return editTG(cid, mid, "❌ ยกเลิกเรียบร้อย\nพิมพ์ 'ส่งงาน' เพื่อเริ่มใหม่"); } 
    if (val.startsWith("pj|")) {
      const pj = val.split("|")[1]; props.setProperties({ [uid+"_p"]: pj, [uid+"_s"]: "W_TY" });
      return editTGInline(cid, mid, `📁 โปรเจกต์: <b>${pj}</b>\n⚡ ขั้นตอนที่ 2: เลือกประเภทงาน`, TYPE_LIST.map(t => ({ text: t, data: "ty|"+t })));
    } 
    if (val.startsWith("ty|")) {
      const ty = val.split("|")[1]; props.setProperties({ [uid+"_t"]: ty, [uid+"_s"]: "W_SI" });
      const pj = props.getProperty(uid+"_p") || "-";
      return editTGInline(cid, mid, `📁 โปรเจกต์: <b>${pj}</b>\n⚡ ประเภท: <b>${ty}</b>\n\n🏢 <b>พิมพ์รหัส Site ครับ</b>`, []);
    }
    if (val.startsWith("app|")) return processManualApprove(val.split("|")[1], cid);
    return;
  }

  // B. Message Handler
  const msg = data.message || data.edited_message;
  if (!msg || (msg.from && msg.from.is_bot)) return;

  const cid = msg.chat.id; const uid = "TG_" + msg.from.id; let text = (msg.text || "").trim(); const s = props.getProperty(uid + "_s") || "IDLE";

  if (text === "ส่งงาน" || text === "/start" || text === "สั่งงาน") {
    clearUser(uid); props.setProperty(uid + "_s", "W_PJ");
    return sendTGInline(cid, "🏗️ ขั้นตอนที่ 1: เลือก Project ครับ", PROJECT_LIST.map(p => ({ text: p, data: "pj|"+p })));
  }
  
  if (text === "/status") return sendTG(cid, `🤖 <b>Status:</b> ACTIVE\n📦 <b>Version:</b> ${VERSION}\n📂 <b>State:</b> ${s}`, ["ส่งงาน"]);
  
  if (text === "จบงาน" || text === "ยกเลิก" || text === "/stop" || text === "เสร็จแล้ว") {
    if ((text === "จบงาน" || text === "เสร็จแล้ว") && s === "W_PH") {
      sendTG(cid, "✅ รับทราบ! สั่ง AI ตรวจทันทีครับ\n(รอสรุปผล 1-3 นาที)", ["ส่งงาน"]);
      ScriptApp.newTrigger('runPatInspector').timeBased().after(1000).create();
    } else { sendTG(cid, "❌ ยกเลิกเรียบร้อย", ["ส่งงาน"]); }
    clearUser(uid); return;
  }

  if (s === "W_SI" && text !== "") {
    const site = text.toUpperCase();
    const pj = props.getProperty(uid+"_p") || "Unknown";
    const ty = props.getProperty(uid+"_t") || "Unknown";
    const folder = getOrCreateSubFolder(DriveApp.getFolderById(FOLDER_ID), `${pj}_${ty}_${site}`);
    props.setProperties({ [uid+"_site"]: site, [uid+"_s"]: "W_PH" });
    return sendTG(cid, `✅ <b>Site: ${site}</b>\n📂 <b>Folder:</b> <a href="${folder.getUrl()}">คลิกเพื่อส่งรูป</a>\n\n📸 ส่งรูปในนี้หรือผ่านลิงก์ก็ได้ครับ\n(พิมพ์ 'จบงาน' เมื่อส่งครบ)`, ["จบงาน", "ยกเลิก"]);
  }

  if (msg.photo && s === "W_PH") return processImage("TG", uid, cid, msg.photo[msg.photo.length - 1].file_id);
}

// =========================================================================
// === [LINE HANDLER] ===
// =========================================================================

function handleLineWebhook(ev) {
  const uid = "LINE_" + ev.source.userId; const props = PropertiesService.getUserProperties();
  if (ev.type === 'message' && ev.message.type === 'text') {
    const text = ev.message.text.trim(); const s = props.getProperty(uid + "_s") || "IDLE";
    if (text === "ส่งงาน" || text === "สั่งงาน") {
      clearUser(uid); props.setProperty(uid + "_s", "W_PJ");
      sendMsg(ev.source.userId, "🏗️ ขั้นตอนที่ 1: เลือก Project", [...PROJECT_LIST, "ยกเลิก"]);
    } else if (s === "W_PJ" && PROJECT_LIST.includes(text)) {
      props.setProperties({ [uid+"_p"]: text, [uid+"_s"]: "W_TY" });
      sendMsg(ev.source.userId, `📁 โปรเจกต์: ${text}\n⚡ ขั้นตอนที่ 2: เลือกประเภทงาน`, [...TYPE_LIST, "ยกเลิก"]);
    } else if (s === "W_TY" && TYPE_LIST.includes(text)) {
      props.setProperties({ [uid+"_t"]: text, [uid+"_s"]: "W_SI" });
      sendMsg(ev.source.userId, `⚡ ประเภท: ${text}\n🏢 ขั้นตอนที่ 3: พิมพ์รหัส Site`, ["ยกเลิก"]);
    } else if (s === "W_SI" && text !== "ยกเลิก") {
      const site = text.toUpperCase();
      const pj = props.getProperty(uid+"_p") || "Unknown";
      const ty = props.getProperty(uid+"_t") || "Unknown";
      const folder = getOrCreateSubFolder(DriveApp.getFolderById(FOLDER_ID), `${pj}_${ty}_${site}`);
      props.setProperties({ [uid+"_site"]: site, [uid+"_s"]: "W_PH" });
      sendMsg(ev.source.userId, `✅ พร้อม! Site: ${site}\n📂 ลิงก์โฟลเดอร์: ${folder.getUrl()}\n\n(พิมพ์ 'จบงาน' เมื่อส่งครบ)`, ["จบงาน", "ยกเลิก"]);
    } else if (text === "จบงาน" && s === "W_PH") {
      ScriptApp.newTrigger('runPatInspector').timeBased().after(1000).create();
      clearUser(uid); sendMsg(ev.source.userId, "✅ เริ่มตรวจงานทันที...");
    } else if (text === "ยกเลิก") { clearUser(uid); sendMsg(ev.source.userId, "❌ ยกเลิกเรียบร้อย"); }
  } else if (ev.type === 'message' && ev.message.type === 'image') processImage("LINE", uid, ev.source.userId, ev.message.id);
}

// =========================================================================
// === [CORE AI PROCESSING & DUAL ALERT] ===
// =========================================================================

function runPatInspector() {
  const ts = ScriptApp.getProjectTriggers(); for (let t of ts) { if (t.getHandlerFunction() === 'runPatInspector') ScriptApp.deleteTrigger(t); }
  const ss = getSpreadsheet(); if (!ss) return;
  let sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  const files = getAllRecursiveFiles(DriveApp.getFolderById(FOLDER_ID), ARCHIVE_FOLDER_ID);
  let countPass = 0, countFail = 0, currentSite = "Unknown";
  for (let f of files) {
    if (f.getDescription() && f.getDescription().includes("PAT_CHECKED")) continue;
    try {
      const parent = f.getParents().next(); currentSite = parent.getName();
      const ai = analyzeAI(f); const status = ai.status.toUpperCase();
      sheet.appendRow([new Date(), f.getName(), ai.sheetReference, status, ai.reason, f.getUrl(), f.getId()]);
      const destFolder = getOrCreateSubFolder(getOrCreateSubFolder(DriveApp.getFolderById(ARCHIVE_FOLDER_ID), currentSite), status === "PASS" ? ai.sheetReference : "FAIL_" + ai.sheetReference);
      f.moveTo(destFolder); f.setDescription(`PAT_CHECKED: ${status} | ${f.getDescription() || ""}`);
      if (status === "PASS") countPass++; 
      else { countFail++; sendDualFailNotify(f.getName(), ai.sheetReference, ai.reason, f.getUrl(), f.getId()); }
    } catch (e) {}
  }
  if (countPass + countFail > 0) sendDualSummary(currentSite, countPass, countFail);
}

function sendDualSummary(site, pass, fail) {
  const txt = `📊 <b>สรุปผล AI (${site})</b>\n✅ ผ่าน: ${pass}\n❌ ไม่ผ่าน: ${fail}`;
  sendTG(TELEGRAM_TARGET_ID, txt, ["ส่งงาน"]);
  for (let id of LINE_TARGET_IDS) sendMsg(id, txt.replace(/<[^>]*>/g, ""), ["ส่งงาน"]);
}

function sendDualFailNotify(fn, cat, reason, url, fid) {
  const tgKb = { inline_keyboard: [[{ text: "✅ อนุมัติ", callback_data: "app|" + fid }, { text: "🔍 ดูรูป", url: url }]] };
  callTG("sendMessage", { chat_id: TELEGRAM_TARGET_ID, text: `🚨 <b>งานไม่ผ่าน: ${fn}</b>\n📌 หมวด: ${cat}\n❌ สาเหตุ: ${reason}`, parse_mode: "HTML", reply_markup: tgKb });
  for (let id of LINE_TARGET_IDS) sendMsg(id, `🚨 ไม่ผ่าน: ${fn}\n📌 หมวด: ${cat}\n❌ สาเหตุ: ${reason}\n🔍 ดูรูป: ${url}`);
}

function analyzeAI(file) {
  const b64 = Utilities.base64Encode(file.getBlob().getBytes());
  const res = UrlFetchApp.fetch("https://api.groq.com/openai/v1/chat/completions", { 
    method: "post", headers: { Authorization: "Bearer " + GROQ_API_KEY, "Content-Type": "application/json" }, 
    payload: JSON.stringify({ "model": "llama-3.2-11b-vision-preview", "messages": [{ "role": "user", "content": [{ "type": "text", "text": "Analyze cell site installation photo and output EXACT JSON: {\"sheetReference\": \"...\", \"status\": \"PASS/FAIL\", \"reason\": \"Thai reason if FAIL\"}" }, { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${b64}` } }] }], "response_format": { "type": "json_object" } }), muteHttpExceptions: true 
  });
  return JSON.parse(JSON.parse(res.getContentText()).choices[0].message.content);
}

// =========================================================================
// === [HELPER UTILS] ===
// =========================================================================

function processImage(platform, uid, cid, mid) {
  const props = PropertiesService.getUserProperties();
  try {
    const pj = props.getProperty(uid+"_p") || "Unknown"; const ty = props.getProperty(uid+"_t") || "Unknown"; const site = props.getProperty(uid+"_site") || "Temp";
    const folder = getOrCreateSubFolder(DriveApp.getFolderById(FOLDER_ID), `${pj}_${ty}_${site}`);
    const blob = (platform === "TG") ? getTGImg(mid) : getLineImg(mid);
    folder.createFile(blob).setName(`${site}_${Date.now()}.jpg`).setDescription(`UPLOADER:${platform}_${cid}`);
  } catch (e) {}
}

function getSpreadsheet() {
  if (SPREADSHEET_ID) try { return SpreadsheetApp.openById(SPREADSHEET_ID); } catch(e) {}
  return null;
}

function logToSheet(data) {
  try {
    const ss = getSpreadsheet(); if (!ss) return;
    const sheet = ss.getSheetByName("BotLogs") || ss.insertSheet("BotLogs");
    sheet.appendRow([new Date(), JSON.stringify(data)]);
  } catch (e) {}
}

function clearUser(uid) {
  const props = PropertiesService.getUserProperties();
  props.setProperties({ [uid + "_s"]: "IDLE", [uid + "_p"]: "", [uid + "_t"]: "", [uid + "_site"]: "" });
}

function getOrCreateSubFolder(p, n) { 
  const f = p.getFoldersByName(n); return f.hasNext() ? f.next() : p.createFolder(n); 
}

function getAllRecursiveFiles(folder, excludeId) {
  if (folder.getId() === excludeId) return [];
  let files = []; const rf = folder.getFiles(); while (rf.hasNext()) files.push(rf.next());
  const sub = folder.getFolders(); while (sub.hasNext()) files = files.concat(getAllRecursiveFiles(sub.next(), excludeId));
  return files;
}

// --- [TELEGRAM HELPERS] ---
function callTG(m, p) { return UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${m}`, { method: "post", contentType: "application/json", payload: JSON.stringify(p), muteHttpExceptions: true }); }
function sendTG(cid, txt, buttons) {
  let kb = { keyboard: [], resize_keyboard: true, one_time_keyboard: true };
  if (buttons) { let row = []; buttons.forEach(b => { row.push({ text: String(b) }); if (row.length === 2) { kb.keyboard.push(row); row = []; } }); if (row.length > 0) kb.keyboard.push(row); } else { kb = { remove_keyboard: true }; }
  return callTG("sendMessage", { chat_id: cid, text: txt, parse_mode: "HTML", reply_markup: kb });
}
function sendTGInline(cid, txt, btns) {
  const kb = { inline_keyboard: [] }; let row = []; btns.forEach(b => { row.push({ text: b.text, callback_data: b.data }); if (row.length === 2) { kb.inline_keyboard.push(row); row = []; } });
  if (row.length > 0) kb.inline_keyboard.push(row); kb.inline_keyboard.push([{ text: "❌ ยกเลิก", callback_data: "cancel" }]);
  return callTG("sendMessage", { chat_id: cid, text: txt, parse_mode: "HTML", reply_markup: kb });
}
function editTGInline(cid, mid, txt, btns) {
  const kb = { inline_keyboard: [] }; if (btns && btns.length > 0) { let row = []; btns.forEach(b => { row.push({ text: b.text, callback_data: b.data }); if (row.length === 2) { kb.inline_keyboard.push(row); row = []; } }); if (row.length > 0) kb.inline_keyboard.push(row); }
  kb.inline_keyboard.push([{ text: "❌ ยกเลิก", callback_data: "cancel" }]); return callTG("editMessageText", { chat_id: cid, message_id: mid, text: txt, parse_mode: "HTML", reply_markup: kb });
}
function editTG(cid, mid, txt) { return callTG("editMessageText", { chat_id: cid, message_id: mid, text: txt, parse_mode: "HTML" }); }
function getTGImg(id) { 
  const res = JSON.parse(UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${id}`)); 
  return UrlFetchApp.fetch(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${res.result.file_path}`).getBlob(); 
}

// --- [LINE HELPERS] ---
function sendMsg(t, txt, q) { 
  let pl = { to: t, messages: [{ type: "text", text: txt }] }; 
  if (q) pl.messages[0].quickReply = { items: q.map(o => ({ type: "action", action: { type: "message", label: o, text: o } })) }; 
  return UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", { method: "post", headers: { "Content-Type": "application/json", Authorization: "Bearer " + LINE_CHANNEL_ACCESS_TOKEN }, payload: JSON.stringify(pl), muteHttpExceptions: true }); 
}
function getLineImg(id) { return UrlFetchApp.fetch(`https://api-data.line.me/v2/bot/message/${id}/content`, { headers: { Authorization: "Bearer " + LINE_CHANNEL_ACCESS_TOKEN } }).getBlob(); }

function processManualApprove(fid, cid) { try { DriveApp.getFileById(fid).setDescription("PASS (Approved)"); sendTG(cid, "✅ อนุมัติสำเร็จ", ["ส่งงาน"]); } catch(e){} }

// =========================================================================
// === [MAINTENANCE & KILL SWITCH] ===
// =========================================================================

function FIX_WEBHOOK() {
  const url = WEB_APP_URL || ScriptApp.getService().getUrl();
  if (!url) return "❌ Please deploy as Web App first!";
  const res = UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${url}&drop_pending_updates=true`);
  return "✅ Webhook set: " + url + "\nResult: " + res.getContentText();
}

function KILL_ALL_TRIGGERS_AND_CACHE() {
  const ts = ScriptApp.getProjectTriggers();
  for (let t of ts) ScriptApp.deleteTrigger(t);
  PropertiesService.getUserProperties().deleteAllProperties();
  CacheService.getScriptCache().removeAll(["uid_727994555", "uid_727994556"]); // ตัวอย่างการลบ ID ที่ค้าง
  return "✅ All triggers and states cleared successfully.";
}
