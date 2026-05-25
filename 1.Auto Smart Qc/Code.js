// =========================================================================
// === AI SMART QC BOT - V.119 (DETAILED FEEDBACK & DUPLICATE FIX) ===
// =========================================================================

const VERSION = "V.119 (DETAILED-FEEDBACK)"; 
const FOLDER_ID = "YOUR_FOLDER_ID"; 
const ARCHIVE_FOLDER_ID = "YOUR_ARCHIVE_FOLDER_ID"; 
const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID"; 
const SHEET_NAME = "Sheet1"; 

const WEB_APP_URL = "YOUR_WEB_APP_URL";

const PROJECT_LIST = ["HAE", "TME", "TMT", "HAT", "HTB", "HSN", "TMB", "HNN"];
const TYPE_LIST = ["MBB", "POWER", "SOLACELL", "SMALL DC", "IPRAN"];

// --- [API CONFIG] ---
const TELEGRAM_BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN"; 
const TELEGRAM_TARGET_ID = "YOUR_TELEGRAM_CHAT_ID"; 
const GROQ_KEYS = [
  "YOUR_GROQ_API_KEY_1",
  "YOUR_GROQ_API_KEY_2",
  "YOUR_GROQ_API_KEY_3",
  "YOUR_GROQ_API_KEY_4"
];
const GROQ_AI_URL = "https://api.groq.com/openai/v1/chat/completions";

// --- [LINE CONFIG] ---
const LINE_CHANNEL_ACCESS_TOKEN = "YOUR_LINE_CHANNEL_ACCESS_TOKEN"; 

function doGet(e) {
  let params = {};
  if (e && e.parameter) params = e.parameter;
  const action = (params.action || "").toLowerCase();
  try {
    if (action === "getdata") return jsonResponse(getDashboardData(params.site || "All Sites"));
    if (action === "listfolders") {
      const folders = listSubFolders();
      const rootFolder = DriveApp.getFolderById(FOLDER_ID);
      return jsonResponse({ folders: folders, rootName: rootFolder.getName() });
    }
    if (action === "listfiles") return jsonResponse(listFilesInFolder(params.folderId));
    if (action === "processfolder") return jsonResponse(processFolderById(params.folderId));
    if (action === "createsitefolder") {
      const folderName = `${params.project}_${params.type}_${params.site}`;
      const folder = getOrCreateSubFolder(DriveApp.getFolderById(FOLDER_ID), folderName);
      return jsonResponse({ success: true, id: folder.getId(), url: folder.getUrl(), name: folderName });
    }
    return jsonResponse({ status: "READY", version: VERSION });
  } catch (err) {
    return jsonResponse({ error: "GAS Error: " + err.toString() });
  }
}

function doPost(e) {
  const cache = CacheService.getScriptCache();
  try {
    const data = JSON.parse(e.postData.contents);
    const updateId = data.update_id ? "u_" + data.update_id : null;
    if (updateId) {
      if (cache.get(updateId)) return ContentService.createTextOutput("OK");
      cache.put(updateId, "1", 600);
    }
    if (data.callback_query) {
      const cb = data.callback_query;
      const cid = cb.message.chat.id;
      const mid = cb.message.message_id;
      const val = cb.data;
      callTG("answerCallbackQuery", { callback_query_id: cb.id });
      if (val.startsWith("app|")) processManualApprove(val.split("|")[1], cid, mid, cb.message.text);
      if (val.startsWith("rej|")) processManualReject(val.split("|")[1], cid, mid, cb.message.text);
    }
  } catch (err) {}
  return ContentService.createTextOutput("OK");
}

function listSubFolders() {
  try {
    const root = DriveApp.getFolderById(FOLDER_ID);
    const subs = root.getFolders();
    const result = [];
    while (subs.hasNext()) {
      const f = subs.next();
      result.push({ id: f.getId(), name: f.getName(), fileCount: 0, date: f.getLastUpdated().toISOString() });
    }
    return result;
  } catch (e) { return []; }
}

function listFilesInFolder(folderId) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    const result = [];
    while (files.hasNext()) {
      const f = files.next();
      if (!(f.getDescription() || "").includes("PAT_CHECKED")) {
        result.push({ id: f.getId(), name: f.getName(), size: (f.getSize() / 1024).toFixed(0) + " KB", date: f.getLastUpdated().toLocaleDateString() });
      }
    }
    return result;
  } catch (e) { return []; }
}

function processFolderById(folderId) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    const toProcess = [];
    while (files.hasNext()) {
      const f = files.next();
      if (!(f.getDescription() || "").includes("PAT_CHECKED")) toProcess.push(f);
    }
    if (toProcess.length === 0) return { success: true, count: 0, message: "No files to process" };
    return { success: true, ...processFileList(toProcess, folder.getName()) };
  } catch (e) { return { error: e.toString() }; } finally { lock.releaseLock(); }
}

function processFileList(files, siteName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  let pass = 0, fail = 0;
  const results = [];
  for (let f of files) {
    try {
      const ai = analyzeAI(f);
      if (!ai || ai.status === "ERROR") {
        results.push({ name: f.getName(), status: "ERROR", reason: ai?.reason || "AI Error" });
        continue;
      }
      const status = ai.status.toUpperCase();
      sheet.appendRow([new Date(), f.getName(), ai.sheetReference, status, ai.reason, f.getUrl(), f.getId()]);
      const destFolder = getOrCreateSubFolder(getOrCreateSubFolder(DriveApp.getFolderById(ARCHIVE_FOLDER_ID), siteName), status === "PASS" ? ai.sheetReference : "FAIL_" + ai.sheetReference);
      f.moveTo(destFolder);
      f.setDescription(`PAT_CHECKED: ${status} | ${f.getDescription() || ""}`);
      results.push({ name: f.getName(), status: status, reason: ai.reason });
      if (status === "PASS") pass++; else { fail++; sendDualFailNotify(f.getName(), ai.sheetReference, ai.reason, f.getUrl(), f.getId()); }
    } catch (e) { results.push({ name: f.getName(), status: "ERROR", reason: e.toString() }); }
  }
  if (pass + fail > 0) sendDualSummary(siteName, pass, fail);
  return { total: files.length, pass: pass, fail: fail, details: results };
}

function analyzeAI(file) {
  const b64 = Utilities.base64Encode(file.getBlob().getBytes());
  const checklist = "2.3(M16), 2.3(M17), 2.3(M19-A1), 2.3(M19-A2), 2.3(M20.1-Ant1), 2.3(M20.2-Ant1), 2.3(M20.1-Ant2), 2.3(M20.2-Ant2), 2.3(M20.1-Ant3), 2.3(M20.2-Ant3), 2.3(M20.1-Ant4), 2.3(M20.2-Ant4), 2.3(M22-GND BAR), 2.3(M22-MST GND), 2.3(M24-GND DCDU), 2.3(M24-GND DCDU (2)), 2.3(M22-GND-RRU), 2.3(M24-RRU view S 1st), 2.3(M24-RRU view S 2nd), 2.3(M24-RRU view S 3th), 2.3(M24-RRU view S 4th), 2.3(M24-Add card 1), 2.3(M24-add card 2), 2.3(M26-DCDU socket), 2.3(M24-DC-RRU 1st), 2.3(M25 RRU1-Clamp-RET), 2.3(M24-DC-RRU 2nd), 2.3(M25 RRU2-clamp-RET), 2.3(M24-DC-AAU 2nd), 2.3(M25 AAU2-Clamp-RET), 2.3(M24-DC-RRU 4th), 2.3(M25 RRU4-Clamp-RET), 2.3(M23-inlet-outlet), 2.3(M23-inlet-outlet (2)), 2.3(M27)Ladder, 2.3(M27)-J-Loop, 2.3(M30-Krone 1-2, 2.3(M30-GPS), 2.3(M32-rec C1-3), 2.3(M30 C1), 2.3(M30 C2), 2.3(M32) BreakerC1-3, 2.3(M32)DCDU, 2.3(M32) LED-load, Notch CPRI, No.POE+Clean (1), Remote Site, 2.4-BOQ, dismantle";
  const promptText = `Analyze Telecom site photo carefully. MATCH ONE: [${checklist}]. CHECK QUALITY. MANDATORY JSON: {"sheetReference": "Exact Item Name", "status": "PASS/FAIL", "reason": "Thai audit finding"}`;
  const payload = { "model": "meta-llama/llama-4-scout-17b-16e-instruct", "messages": [{ "role": "user", "content": [{ "type": "text", "text": promptText }, { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${b64}` } }] }], "response_format": { "type": "json_object" } };
  for (let i = 0; i < GROQ_KEYS.length; i++) {
    try {
      const res = UrlFetchApp.fetch(GROQ_AI_URL, { method: "post", headers: { Authorization: "Bearer " + GROQ_KEYS[i], "Content-Type": "application/json" }, payload: JSON.stringify(payload), muteHttpExceptions: true });
      if (res.getResponseCode() === 200) return JSON.parse(JSON.parse(res.getContentText()).choices[0].message.content);
    } catch (e) {}
  }
  return { status: "ERROR", reason: "AI Analysis Failed" };
}

function processManualApprove(fid, cid, mid, originalText) {
  try {
    const file = DriveApp.getFileById(fid);
    const fileName = file.getName();
    const rowData = updateSheetStatus(fid, "PASS (Approved)", "#98fb98");
    if (rowData) {
      const category = rowData[2] || "ทั่วไป";
      file.setDescription("PAT_CHECKED: PASS (Manual) | " + file.getDescription());
      const header = `✅ <b>อนุมัติสำเร็จ: ${category}</b>\n📄 <i>${fileName}</i>\n\n`;
      editTG(cid, mid, header + originalText);
      sendTG(cid, `✅ อนุมัติหมวด <b>${category}</b> เรียบร้อยครับ\nไฟล์: <i>${fileName}</i>`, ["ส่งงาน"]);
    } else { sendTG(cid, "❌ ไม่พบข้อมูลใน Sheet", ["ส่งงาน"]); }
  } catch (e) { sendTG(cid, "⚠️ Error: " + e.toString(), ["ส่งงาน"]); }
}

function processManualReject(fid, cid, mid, originalText) {
  try {
    const file = DriveApp.getFileById(fid);
    const fileName = file.getName();
    const rowData = updateSheetStatus(fid, "FAIL (Rejected)", "#ffcccb");
    const category = rowData ? rowData[2] : "ทั่วไป";
    const header = `❌ <b>ปฏิเสธการอนุมัติ: ${category}</b>\n📄 <i>${fileName}</i>\n\n`;
    editTG(cid, mid, header + originalText);
    sendTG(cid, `❌ ปฏิเสธหมวด <b>${category}</b> เรียบร้อยครับ\nไฟล์: <i>${fileName}</i>`, ["ส่งงาน"]);
  } catch (e) { sendTG(cid, "⚠️ Error: " + e.toString(), ["ส่งงาน"]); }
}

function updateSheetStatus(fid, newStatus, color) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][6] === fid) {
      sheet.getRange(i + 1, 4).setValue(newStatus);
      sheet.getRange(i + 1, 1, 1, sheet.getLastColumn()).setBackground(color);
      return data[i];
    }
  }
  return null;
}

function getDashboardData(siteFilter) {
  const ss = getSpreadsheet();
  if (!ss) return { error: "Spreadsheet not found" };
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return { error: "Sheet not found" };
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { metrics: { workOrders: 0, rate: 0 }, statusBreakdown: [], teamWorkload: [] };
  let dataRows = values.slice(1);
  if (siteFilter && siteFilter !== "All Sites") dataRows = dataRows.filter(row => String(row[1]).includes(siteFilter));
  const statusMap = {};
  dataRows.forEach(row => {
    const status = String(row[3] || "").toUpperCase();
    const cleanStatus = status.includes("PASS") ? "PASS" : (status.includes("FAIL") ? "FAIL" : "PENDING");
    statusMap[cleanStatus] = (statusMap[cleanStatus] || 0) + 1;
  });
  const workOrders = dataRows.length;
  const passCount = dataRows.filter(r => String(r[3]).includes("PASS")).length;
  return { metrics: { workOrders, rate: (passCount / workOrders * 100).toFixed(1) }, statusBreakdown: Object.keys(statusMap).map(k => ({ name: k, value: statusMap[k] })), teamWorkload: [] };
}

function jsonResponse(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function getSpreadsheet() { try { return SpreadsheetApp.openById(SPREADSHEET_ID); } catch(e) { return null; } }
function getOrCreateSubFolder(p, n) { const safeName = n.substring(0, 100); const f = p.getFoldersByName(safeName); return f.hasNext() ? f.next() : p.createFolder(safeName); }
function sendDualSummary(site, pass, fail) { sendTG(TELEGRAM_TARGET_ID, `📊 <b>สรุปผล AI (${site})</b>\n✅ ผ่าน: ${pass}\n❌ ไม่ผ่าน: ${fail}`, ["ส่งงาน"]); }
function sendDualFailNotify(fn, cat, reason, url, fid) {
  const tgKb = { inline_keyboard: [[{ text: "✅ อนุมัติ", callback_data: "app|" + fid }, { text: "❌ ไม่อนุมัติ", callback_data: "rej|" + fid }], [{ text: "🔍 ดูรูป", url: url }]] };
  callTG("sendMessage", { chat_id: TELEGRAM_TARGET_ID, text: `🚨 <b>พบงานไม่ผ่าน</b>\n📄 ไฟล์: ${fn}\n📌 หมวด: ${cat}\n❌ สาเหตุ: ${reason}`, parse_mode: "HTML", reply_markup: tgKb });
}
function callTG(m, p) { return UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${m}`, { method: "post", contentType: "application/json", payload: JSON.stringify(p), muteHttpExceptions: true }); }
function editTG(cid, mid, txt) { return callTG("editMessageText", { chat_id: cid, message_id: mid, text: txt, parse_mode: "HTML" }); }
function sendTG(cid, txt, buttons) {
  let kb = { keyboard: [], resize_keyboard: true, one_time_keyboard: true };
  if (buttons) { let row = []; buttons.forEach(b => { row.push({ text: String(b) }); if (row.length === 2) { kb.keyboard.push(row); row = []; } }); if (row.length > 0) kb.keyboard.push(row); }
  return callTG("sendMessage", { chat_id: cid, text: txt, parse_mode: "HTML", reply_markup: kb });
}
