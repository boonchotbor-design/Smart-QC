// =========================================================================
// === AI SMART QC BOT - V.120 (PASSWORD RESET & BUG FIXES) ===
// =========================================================================

const VERSION = "V.120 (PASSWORD-RESET)"; 
const FOLDER_ID = "1W0o5cNuejntiY7v9__f4LiAH3BH-bNpA";
const ARCHIVE_FOLDER_ID = "1dYRMNaTQsQfxsS-4z9GaWMIA3gQHq6h7";
const SPREADSHEET_ID = "1xp3EuRlWthalZhlWfToiJaihs4uYKARLEWXxVykmj9c";
const SHEET_NAME = "Sheet1";

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwlhZ_vy7_gZ8gQOvnY0PIu_1O_VVEuOFLtvXIORtT76F1bX4fSd4Frj6tUkY3-pd2YAg/exec";
const PAT_TEMPLATE_ID = "1Pxdkd0Nxn-HzObefgkzcNFlCTDHrrVkj";

const PROJECT_LIST = ["HAE", "TME", "TMT", "HAT", "HTB", "HSN", "TMB", "HNN"];
const TYPE_LIST = ["MBB", "POWER", "SOLACELL", "SMALL DC", "IPRAN"];

// --- [AUTH CONFIG] ---
const DEFAULT_PASSWORD = "QC-ADMIN-2024"; 
const ALLOWED_USERS = [
  "adisak.chanmao@teloneer.com",
  "boonchot.boriwut@teloneer.com",
  "apichart.kampuang@teloneer.com",
  "nattawoot.suwan@teloneer.com",
  "payon.sapphat@teloneer.com",
  "palagon.prommueangma@teloneer.com",
  "thossapol.chaloemrit@teloneer.com",
  "auttaseth.klomthaisong@teloneer.com",
  "nammon.manakiat@teloneer.com",
  "pakpoom.t@teloneer.com"
];

function getAuthPassword() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty("AUTH_PASSWORD") || DEFAULT_PASSWORD;
}

// --- [API CONFIG] ---
const TELEGRAM_BOT_TOKEN = "8625222790:AAHjU70oWGm88NyUaXaWIDJveo3b2KpnG90"; 
const TELEGRAM_TARGET_ID = "-5199951121";
const GROQ_KEYS = [
  "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",
  "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",
  "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",
  "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"
];
const GROQ_AI_URL = "https://api.groq.com/openai/v1/chat/completions";

// --- [LINE CONFIG] ---
const LINE_CHANNEL_ACCESS_TOKEN = "CnFH9VFWVp7HttiDfE56k2lCZ6aUlnETSKL9yA6Oj5f3Gb1lP6iR6CPGiEdz/8BNJUHtDcDU51y+K+o83fNoEkeKROSQ74PMlCuTErmr4clyWjzAWD27z/SQfFtYz3ALQ2+TqU06ZVoD7ASnbwD3NwdB04t89/1O/w1cDnyilFU="; 

function doGet(e) {
  let params = {};
  if (e && e.parameter) params = e.parameter;
  const action = (params.action || "").toLowerCase();
  try {
    if (action === "getdata") return jsonResponse(getDashboardData(params.site || "All Sites"));
    if (action === "checkpassword") return jsonResponse(checkPassword(params.email, params.password));
    if (action === "sendotp") return jsonResponse(sendOTP(params.email, params.password));
    if (action === "verifyotp") return jsonResponse(verifyOTP(params.email, params.otp));
    if (action === "sendresetotp") return jsonResponse(sendResetOTP(params.email));
    if (action === "resetpassword") return jsonResponse(resetPassword(params.email, params.otp, params.newPassword));
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
    if (action === "generatepat") return jsonResponse(generatePAT(params.folderId, params.siteName));
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
      const originalText = cb.message.text || cb.message.caption || "";
      callTG("answerCallbackQuery", { callback_query_id: cb.id });
      if (val.startsWith("app|")) processManualApprove(val.split("|")[1], cid, mid, originalText);
      if (val.startsWith("rej|")) processManualReject(val.split("|")[1], cid, mid, originalText);
    }
  } catch (err) {}
  return ContentService.createTextOutput("OK");
}

function checkPassword(email, password) {
  if (password !== getAuthPassword()) {
    return { error: "รหัสผ่านไม่ถูกต้อง" };
  }
  if (!ALLOWED_USERS.includes(email.toLowerCase().trim())) {
    return { error: "คุณไม่มีสิทธิ์เข้าใช้งาน" };
  }
  return { success: true };
}

function verifyOTP(email, otp) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("OTP_" + email);
  if (cached && cached === otp) {
    cache.remove("OTP_" + email);
    return { success: true };
  }
  return { error: "Invalid or expired OTP" };
}

function sendResetOTP(email) {
  if (!ALLOWED_USERS.includes(email.toLowerCase().trim())) {
    return { error: "คุณไม่มีสิทธิ์เข้าใช้งาน" };
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const cache = CacheService.getScriptCache();
  cache.put("RESET_OTP_" + email, otp, 600); // 10 minutes
  try {
    MailApp.sendEmail({
      to: email,
      subject: "Password Reset Code - AI SMART QC",
      htmlBody: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #ef4444;">Password Reset Request</h2>
          <p>Your verification code for resetting password is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; padding: 20px; background: #fef2f2; border-radius: 8px; text-align: center; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes. If you did not request this, please change your security settings.</p>
        </div>
      `
    });
    return { success: true };
  } catch (e) { return { error: "Failed to send email: " + e.toString() }; }
}

function resetPassword(email, otp, newPassword) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("RESET_OTP_" + email);
  if (cached && cached === otp) {
    cache.remove("RESET_OTP_" + email);
    PropertiesService.getScriptProperties().setProperty("AUTH_PASSWORD", newPassword);
    return { success: true };
  }
  return { error: "Invalid or expired OTP" };
}

function sendOTP(email, password) {
  if (password !== getAuthPassword()) {
    return { error: "รหัสผ่านไม่ถูกต้อง" };
  }
  
  if (!ALLOWED_USERS.includes(email.toLowerCase().trim())) {
    return { error: "คุณไม่มีสิทธิ์เข้าใช้งาน" };
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const cache = CacheService.getScriptCache();
  cache.put("OTP_" + email, otp, 600); // 10 minutes

  try {
    MailApp.sendEmail({
      to: email,
      subject: "Verification Code - AI SMART QC",
      htmlBody: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #3b82f6;">AI SMART QC Verification</h2>
          <p>Your verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; padding: 20px; background: #f1f5f9; border-radius: 8px; text-align: center; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p style="font-size: 12px; color: #666; margin-top: 40px;">
            If you did not request this code, please ignore this email.
          </p>
        </div>
      `
    });
    return { success: true };
  } catch (e) {
    return { error: "Failed to send email: " + e.toString() };
  }
}

function listSubFolders() {
  try {
    const root = DriveApp.getFolderById(FOLDER_ID);
    const subs = root.getFolders();
    const result = [];
    while (subs.hasNext()) {
      const f = subs.next();
      result.push({ 
        id: f.getId(), 
        name: f.getName(), 
        url: f.getUrl(),
        fileCount: 0, 
        date: f.getLastUpdated().toISOString(),
        parentName: root.getName()
      });
    }
    // เรียงลำดับตามวันที่แก้ไขล่าสุดเพื่อให้โฟลเดอร์ใหม่ขึ้นก่อน
    return result.sort((a, b) => new Date(b.date) - new Date(a.date));
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
      results.push({ name: f.getName(), status: status, reason: ai.reason, category: ai.sheetReference });
      if (status === "PASS") pass++; else { fail++; sendDualFailNotify(f.getName(), ai.sheetReference, ai.reason, f.getUrl(), f.getId()); }
    } catch (e) { results.push({ name: f.getName(), status: "ERROR", reason: e.toString() }); }
  }
  if (pass + fail > 0) {
    const failItems = results.filter(r => r.status === "FAIL");
    sendDualSummary(siteName, pass, fail, failItems);
  }
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
      editAuto(cid, mid, header + originalText);
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
    editAuto(cid, mid, header + originalText);
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
function sendDualSummary(site, pass, fail, failItems) {
  let text = `📊 <b>สรุปผล AI (${site})</b>\n✅ ผ่าน: ${pass}\n❌ ไม่ผ่าน: ${fail}`;
  if (failItems && failItems.length > 0) {
    text += "\n";
    failItems.forEach((item, index) => {
      text += `\n${index + 1}.📄 ไฟล์: ${item.name}\n📌 หมวด: ${item.category}`;
    });
  }
  sendTG(TELEGRAM_TARGET_ID, text, ["ส่งงาน"]);
}
function sendDualFailNotify(fn, cat, reason, url, fid) {
  try {
    const file = DriveApp.getFileById(fid);
    const blob = file.getBlob();
    const tgKb = { inline_keyboard: [[{ text: "✅ อนุมัติ", callback_data: "app|" + fid }, { text: "❌ ไม่อนุมัติ", callback_data: "rej|" + fid }]] };
    const caption = `🚨 <b>พบงานไม่ผ่าน</b>\n📄 ไฟล์: ${fn}\n📌 หมวด: ${cat}\n❌ สาเหตุ: ${reason}`;
    
    const payload = {
      chat_id: TELEGRAM_TARGET_ID,
      photo: blob,
      caption: caption,
      parse_mode: "HTML",
      reply_markup: JSON.stringify(tgKb)
    };
    
    UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: "post",
      payload: payload,
      muteHttpExceptions: true
    });
  } catch (e) {
    // Fallback if image send fails
    const tgKb = { inline_keyboard: [[{ text: "✅ อนุมัติ", callback_data: "app|" + fid }, { text: "❌ ไม่อนุมัติ", callback_data: "rej|" + fid }], [{ text: "🔍 ดูรูป", url: url }]] };
    callTG("sendMessage", { chat_id: TELEGRAM_TARGET_ID, text: `🚨 <b>พบงานไม่ผ่าน (โหลดรูปไม่ได้)</b>\n📄 ไฟล์: ${fn}\n📌 หมวด: ${cat}\n❌ สาเหตุ: ${reason}`, parse_mode: "HTML", reply_markup: tgKb });
  }
}
function callTG(m, p) { return UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${m}`, { method: "post", contentType: "application/json", payload: JSON.stringify(p), muteHttpExceptions: true }); }
function editTG(cid, mid, txt) { return callTG("editMessageText", { chat_id: cid, message_id: mid, text: txt, parse_mode: "HTML" }); }
function sendTG(cid, txt, buttons) {
  let kb = { keyboard: [], resize_keyboard: true, one_time_keyboard: true };
  if (buttons) { let row = []; buttons.forEach(b => { row.push({ text: String(b) }); if (row.length === 2) { kb.keyboard.push(row); row = []; } }); if (row.length > 0) kb.keyboard.push(row); }
  return callTG("sendMessage", { chat_id: cid, text: txt, parse_mode: "HTML", reply_markup: kb });
}

function editAuto(cid, mid, txt) {
  // Attempt to edit as caption (for photos) first, if it fails, edit as text
  const resCaption = callTGRaw("editMessageCaption", { chat_id: cid, message_id: mid, caption: txt, parse_mode: "HTML", reply_markup: { inline_keyboard: [] } });
  if (resCaption.getResponseCode() !== 200) {
    callTGRaw("editMessageText", { chat_id: cid, message_id: mid, text: txt, parse_mode: "HTML", reply_markup: { inline_keyboard: [] } });
  }
}

function callTGRaw(m, p) { return UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${m}`, { method: "post", contentType: "application/json", payload: JSON.stringify(p), muteHttpExceptions: true }); }

function generatePAT(folderId, siteName) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return { error: "Main results sheet not found" };
    
    const data = sheet.getDataRange().getValues();
    const filtered = data.filter(row => String(row[1]).includes(siteName) || String(row[2]).includes(siteName));
    
    if (filtered.length === 0) return { error: "No audit results found for site: " + siteName };
    
    const siteFolder = DriveApp.getFolderById(folderId);
    const tempateFolder = getOrCreateSubFolder(siteFolder, "TEMPATE");
    const template = DriveApp.getFileById(PAT_TEMPLATE_ID);
    
    const newFile = template.makeCopy(siteName, tempateFolder);
    const newSS = SpreadsheetApp.openById(newFile.getId());
    const targetSheet = newSS.getSheets()[0];
    
    // Header for the appended data
    targetSheet.appendRow(["Date", "Filename", "Category", "Status", "Reason", "Photo"]);
    
    filtered.forEach((row, index) => {
      const rowIndex = targetSheet.getLastRow() + 1;
      targetSheet.appendRow([row[0], row[1], row[2], row[3], row[4]]);
      
      // Insert Photo from Drive
      try {
        const fileId = row[6]; // Fid
        if (fileId) {
          const imgBlob = DriveApp.getFileById(fileId).getBlob();
          const img = targetSheet.insertImage(imgBlob, 6, rowIndex); // Column F
          
          // Resize image
          const originalWidth = img.getWidth();
          const originalHeight = img.getHeight();
          const factor = 150 / originalHeight; 
          img.setWidth(originalWidth * factor).setHeight(150);
          
          targetSheet.setRowHeight(rowIndex, 160);
        }
      } catch (e) {
        targetSheet.getRange(rowIndex, 6).setValue("Error loading photo: " + e.toString());
      }
    });
    
    return { success: true, id: newFile.getId(), url: newSS.getUrl(), name: siteName };
  } catch (e) {
    return { error: "PAT Generation Error: " + e.toString() };
  }
}
