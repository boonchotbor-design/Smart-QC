// =========================================================================
// === AI SMART QC BOT - V.126 (ULTRA STABLE & THEME FIX) ===
// =========================================================================

const VERSION = "V.126 (ULTRA)"; 
const FOLDER_ID = "1W0o5cNuejntiY7v9__f4LiAH3BH-bNpA";
const ARCHIVE_FOLDER_ID = "1dYRMNaTQsQfxsS-4z9GaWMIA3gQHq6h7";
const SPREADSHEET_ID = "1xp3EuRlWthalZhlWfToiJaihs4uYKARLEWXxVykmj9c";
const SHEET_NAME = "Sheet1";

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwlhZ_vy7_gZ8gQOvnY0PIu_1O_VVEuOFLtvXIORtT76F1bX4fSd4Frj6tUkY3-pd2YAg/exec";
const PAT_TEMPLATE_ID = "1Pxdkd0Nxn-HzObefgkzcNFlCTDHrrVkj";
const TEMPLATE_FOLDER_ID = "1h2GLkJr-wtYCAM75ruBO4MBiNwirOoMT";

// --- [AUTH CONFIG] ---
const DEFAULT_PASSWORD = "QC-ADMIN-2024"; 

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

function doGet(e) {
  let params = e?.parameter || {};
  const action = (params.action || "").toLowerCase();
  try {
    if (action === "getdata") return jsonResponse(getDashboardData(params.site || "All Sites"));
    if (action === "checkpassword") return jsonResponse(checkPassword(params.email, params.password));
    if (action === "listfolders") {
      const rootId = params.root || FOLDER_ID;
      const folders = listSubFolders(rootId);
      return jsonResponse({ folders: folders, rootName: "Drive" });
    }
    if (action === "listfiles") return jsonResponse(listFilesInFolder(params.folderId));
    if (action === "processfolder") return jsonResponse(processFolderById(params.folderId, params.templateId));
    if (action === "createsitefolder") {
      const folderName = `${params.project}_${params.type}_${params.site}`;
      const folder = getOrCreateSubFolder(DriveApp.getFolderById(FOLDER_ID), folderName);
      return jsonResponse({ success: true, id: folder.getId(), url: folder.getUrl(), name: folderName });
    }
    if (action === "generatepat") return jsonResponse(generatePAT(params.folderId, params.siteName));
    if (action === "listtemplates") return jsonResponse(listTemplates(params.project, params.type));
    return jsonResponse({ status: "READY", version: VERSION });
  } catch (err) {
    return jsonResponse({ error: "Server Error: " + err.toString() });
  }
}

function listTemplates(project, workType) {
  try {
    const rootFolder = DriveApp.getFolderById(TEMPLATE_FOLDER_ID);
    let targetFolder = rootFolder;
    if (project) {
      const projectFolders = rootFolder.getFoldersByName(project);
      if (projectFolders.hasNext()) {
        targetFolder = projectFolders.next();
        if (workType) {
          const typeFolders = targetFolder.getFoldersByName(workType);
          if (typeFolders.hasNext()) targetFolder = typeFolders.next();
        }
      } else if (workType) {
        const typeFolders = rootFolder.getFoldersByName(workType);
        if (typeFolders.hasNext()) targetFolder = typeFolders.next();
      }
    }
    const files = targetFolder.getFiles();
    const result = [];
    while (files.hasNext()) {
      const f = files.next();
      const name = f.getName();
      if (!workType || name.toLowerCase().includes(workType.toLowerCase())) {
        result.push({ id: f.getId(), name: name });
      }
    }
    return result;
  } catch (e) { return { error: e.toString() }; }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.callback_query) {
      const cb = data.callback_query;
      const cid = cb.message.chat.id;
      const mid = cb.message.message_id;
      const val = cb.data;
      const originalText = cb.message.text || cb.message.caption || "";
      callTGRaw("answerCallbackQuery", { callback_query_id: cb.id });
      if (val.startsWith("app|")) processManualApprove(val.split("|")[1], cid, mid, originalText);
      if (val.startsWith("rej|")) processManualReject(val.split("|")[1], cid, mid, originalText);
    }
  } catch (err) {}
  return ContentService.createTextOutput("OK");
}

function checkPassword(email, password) {
  const inputPass = (password || "").trim();
  const currentPass = getAuthPassword().trim();
  if (inputPass !== currentPass && inputPass !== DEFAULT_PASSWORD) return { error: "รหัสผ่านไม่ถูกต้อง" };
  return { success: true };
}

function listSubFolders(rootId) {
  try {
    const root = DriveApp.getFolderById(rootId);
    const subs = root.getFolders();
    const result = [];
    while (subs.hasNext()) {
      const f = subs.next();
      result.push({ id: f.getId(), name: f.getName(), url: f.getUrl(), date: f.getLastUpdated().toISOString() });
    }
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

function processFolderById(folderId, templateId) {
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
    if (toProcess.length === 0) return { success: true, count: 0 };
    let checklist = null;
    if (templateId) checklist = getChecklistFromTemplate(templateId);
    return { success: true, ...processFileList(toProcess, folder.getName(), checklist) };
  } catch (e) { return { error: e.toString() }; } finally { lock.releaseLock(); }
}

function getChecklistFromTemplate(templateId) {
  try {
    const file = DriveApp.getFileById(templateId);
    const mime = file.getMimeType();
    if (mime === MimeType.GOOGLE_SHEETS) {
      const ss = SpreadsheetApp.openById(templateId);
      const sheet = ss.getSheets()[0];
      const data = sheet.getDataRange().getValues();
      return data.map(row => row[0]).filter(val => val && !["Item", "Category", "Task", "Description"].includes(val)).join(", ");
    } else return file.getBlob().getDataAsString();
  } catch (e) { return null; }
}

function processFileList(files, siteName, checklist) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  let pass = 0, fail = 0;
  const results = [];
  for (let f of files) {
    try {
      const ai = analyzeAI(f, checklist);
      if (!ai || ai.status === "ERROR") continue;
      const status = ai.status.toUpperCase();
      sheet.appendRow([new Date(), f.getName(), ai.sheetReference, status, ai.reason, f.getUrl(), f.getId(), siteName]);
      const destFolder = getOrCreateSubFolder(getOrCreateSubFolder(DriveApp.getFolderById(ARCHIVE_FOLDER_ID), siteName), status === "PASS" ? ai.sheetReference : "FAIL_" + ai.sheetReference);
      f.moveTo(destFolder);
      f.setDescription(`PAT_CHECKED: ${status} | ${f.getDescription() || ""}`);
      results.push({ name: f.getName(), status: status, reason: ai.reason, category: ai.sheetReference });
      if (status === "PASS") pass++; else { fail++; sendDualFailNotify(f.getName(), ai.sheetReference, ai.reason, f.getUrl(), f.getId()); }
    } catch (e) {}
  }
  if (pass + fail > 0) sendDualSummary(siteName, pass, fail, results.filter(r => r.status === "FAIL"));
  return { total: files.length, pass: pass, fail: fail, details: results };
}

function analyzeAI(file, customChecklist) {
  const b64 = Utilities.base64Encode(file.getBlob().getBytes());
  const defaultChecklist = "2.3(M16), 2.3(M17), 2.3(M19-A1), 2.3(M19-A2), 2.3(M20.1-Ant1), 2.3(M20.2-Ant1), 2.3(M20.1-Ant2), 2.3(M20.2-Ant2), 2.3(M20.1-Ant3), 2.3(M20.2-Ant3), 2.3(M20.1-Ant4), 2.3(M20.2-Ant4), 2.3(M22-GND BAR), 2.3(M22-MST GND), 2.3(M24-GND DCDU), 2.3(M24-GND DCDU (2)), 2.3(M22-GND-RRU), 2.3(M24-RRU view S 1st), 2.3(M24-RRU view S 2nd), 2.3(M24-RRU view S 3th), 2.3(M24-RRU view S 4th), 2.3(M24-Add card 1), 2.3(M24-add card 2), 2.3(M26-DCDU socket), 2.3(M24-DC-RRU 1st), 2.3(M25 RRU1-Clamp-RET), 2.3(M24-DC-RRU 2nd), 2.3(M25 RRU2-clamp-RET), 2.3(M24-DC-AAU 2nd), 2.3(M25 AAU2-Clamp-RET), 2.3(M24-DC-RRU 4th), 2.3(M25 RRU4-Clamp-RET), 2.3(M23-inlet-outlet), 2.3(M23-inlet-outlet (2)), 2.3(M27)Ladder, 2.3(M27)-J-Loop, 2.3(M30-Krone 1-2, 2.3(M30-GPS), 2.3(M32-rec C1-3), 2.3(M30 C1), 2.3(M30 C2), 2.3(M32) BreakerC1-3, 2.3(M32)DCDU, 2.3(M32) LED-load, Notch CPRI, No.POE+Clean (1), Remote Site, 2.4-BOQ, dismantle";
  const checklist = customChecklist || defaultChecklist;
  const promptText = `Analyze site photo. MATCH ONE: [${checklist}]. JSON: {"sheetReference": "Item", "status": "PASS/FAIL", "reason": "Thai"}`;
  const payload = { "model": "meta-llama/llama-4-scout-17b-16e-instruct", "messages": [{ "role": "user", "content": [{ "type": "text", "text": promptText }, { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${b64}` } }] }], "response_format": { "type": "json_object" } };
  for (let i = 0; i < GROQ_KEYS.length; i++) {
    try {
      const res = UrlFetchApp.fetch(GROQ_AI_URL, { method: "post", headers: { Authorization: "Bearer " + GROQ_KEYS[i], "Content-Type": "application/json" }, payload: JSON.stringify(payload), muteHttpExceptions: true });
      if (res.getResponseCode() === 200) return JSON.parse(JSON.parse(res.getContentText()).choices[0].message.content);
    } catch (e) {}
  }
  return { status: "ERROR" };
}

function processManualApprove(fid, cid, mid, originalText) {
  try {
    const file = DriveApp.getFileById(fid);
    updateSheetStatus(fid, "PASS (Approved)", "#98fb98");
    file.setDescription("PAT_CHECKED: PASS (Manual) | " + file.getDescription());
    editAuto(cid, mid, `✅ <b>อนุมัติสำเร็จ</b>\n${originalText}`);
  } catch (e) {}
}

function processManualReject(fid, cid, mid, originalText) {
  try {
    updateSheetStatus(fid, "FAIL (Rejected)", "#ffcccb");
    editAuto(cid, mid, `❌ <b>ปฏิเสธการอนุมัติ</b>\n${originalText}`);
  } catch (e) {}
}

function updateSheetStatus(fid, newStatus, color) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) { if (String(data[i][6]) === String(fid)) { sheet.getRange(i + 1, 4).setValue(newStatus); sheet.getRange(i + 1, 1, 1, sheet.getLastColumn()).setBackground(color); return data[i]; } }
  return null;
}

function getDashboardData(siteFilter) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  let dataRows = values.slice(1);
  if (siteFilter && siteFilter !== "All Sites") dataRows = dataRows.filter(row => String(row[1]).includes(siteFilter) || String(row[7]).includes(siteFilter));
  const statusMap = {};
  dataRows.forEach(row => { const status = String(row[3] || "").toUpperCase(); const cleanStatus = status.includes("PASS") ? "PASS" : (status.includes("FAIL") ? "FAIL" : "PENDING"); statusMap[cleanStatus] = (statusMap[cleanStatus] || 0) + 1; });
  return { metrics: { workOrders: dataRows.length, rate: dataRows.length > 0 ? Math.round((statusMap["PASS"] || 0) / dataRows.length * 100) : 0 }, statusBreakdown: Object.keys(statusMap).map(k => ({ name: k, value: statusMap[k] })) };
}

function jsonResponse(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function getOrCreateSubFolder(p, n) { const f = p.getFoldersByName(n); return f.hasNext() ? f.next() : p.createFolder(n); }

function sendDualSummary(site, pass, fail, failItems) {
  let text = `📊 <b>สรุปผล AI (${site})</b>\n✅ ผ่าน: ${pass}\n❌ ไม่ผ่าน: ${fail}`;
  if (failItems.length > 0) { text += "\n"; failItems.forEach((item, index) => { text += `\n${index + 1}.📄 ไฟล์: ${item.name}\n📌 หมวด: ${item.category}`; }); }
  callTGRaw("sendMessage", { chat_id: TELEGRAM_TARGET_ID, text: text, parse_mode: "HTML" });
}

function sendDualFailNotify(fn, cat, reason, url, fid) {
  try {
    const blob = DriveApp.getFileById(fid).getBlob();
    const tgKb = { inline_keyboard: [[{ text: "✅ อนุมัติ", callback_data: "app|" + fid }, { text: "❌ ไม่อนุมัติ", callback_data: "rej|" + fid }]] };
    const payload = { chat_id: TELEGRAM_TARGET_ID, photo: blob, caption: `🚨 <b>พบงานไม่ผ่าน</b>\n📄 ไฟล์: ${fn}\n📌 หมวด: ${cat}\n❌ สาเหตุ: ${reason}`, parse_mode: "HTML", reply_markup: JSON.stringify(tgKb) };
    UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: "post", payload: payload, muteHttpExceptions: true });
  } catch (e) { callTGRaw("sendMessage", { chat_id: TELEGRAM_TARGET_ID, text: `🚨 <b>พบงานไม่ผ่าน</b>\n📄 ไฟล์: ${fn}`, parse_mode: "HTML" }); }
}

function editAuto(cid, mid, txt) {
  const resCaption = callTGRaw("editMessageCaption", { chat_id: cid, message_id: mid, caption: txt, parse_mode: "HTML", reply_markup: { inline_keyboard: [] } });
  if (resCaption.getResponseCode() !== 200) callTGRaw("editMessageText", { chat_id: cid, message_id: mid, text: txt, parse_mode: "HTML", reply_markup: { inline_keyboard: [] } });
}

function callTGRaw(m, p) { return UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${m}`, { method: "post", contentType: "application/json", payload: JSON.stringify(p), muteHttpExceptions: true }); }

function generatePAT(folderId, siteName) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    const siteFolder = DriveApp.getFolderById(folderId);
    const fileIdsInFolder = [];
    const collectIds = (folder) => {
      const files = folder.getFiles();
      while (files.hasNext()) fileIdsInFolder.push(files.next().getId());
      const subs = folder.getFolders();
      while (subs.hasNext()) collectIds(subs.next());
    };
    collectIds(siteFolder);

    const idSet = new Set(fileIdsInFolder);
    const data = sheet.getDataRange().getValues();
    const filtered = data.filter(row => (idSet.has(String(row[6])) || String(row[7]) === siteName) && String(row[3]).includes("PASS"));

    if (filtered.length === 0) return { error: "No PASS audit results found for this site." };

    const destinationFolder = getOrCreateSubFolder(siteFolder, "TEMPATE");
    const newFile = DriveApp.getFileById(PAT_TEMPLATE_ID).makeCopy(`PAT_${siteName}_${new Date().getTime()}`, destinationFolder);
    const newSS = SpreadsheetApp.openById(newFile.getId());

    // 1. Update Global Site Info (Assuming it's on the first sheet or specific names)
    const infoSheets = ["PATC", "SOW"];
    infoSheets.forEach(name => {
      const s = newSS.getSheetByName(name);
      if (s) {
        fillPlaceholder(s, "Site name :", siteName);
        fillPlaceholder(s, "Site code :", siteName);
      }
    });

    // 2. Group images by Sheet Reference
    const grouped = filtered.reduce((acc, row) => {
      const cat = String(row[2]);
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({ name: row[1], id: row[6] });
      return acc;
    }, {});

    // 3. Process each category sheet
    Object.keys(grouped).forEach(cat => {
      const targetSheet = newSS.getSheetByName(cat);
      if (!targetSheet) return;

      // Update Site info on this sheet too
      fillPlaceholder(targetSheet, "Site name :", siteName);
      fillPlaceholder(targetSheet, "Site code :", siteName);

      const photos = grouped[cat];

      // We look for "Before" or "After" frames or use a grid
      // Based on screenshot: usually 2 columns, multiple rows
      // Let's find common frame patterns or insert in a logical grid
      let photoIndex = 0;
      const rows = [4, 25, 46, 67]; // Approximate row starts for boxes based on height
      const cols = [2, 10];         // Approximate column starts for boxes

      for (let r of rows) {
        for (let c of cols) {
          if (photoIndex >= photos.length) break;
          try {
            const blob = DriveApp.getFileById(photos[photoIndex].id).getBlob();
            // Insert and Fit into a box (roughly 8 columns wide, 18 rows high)
            insertImageWithFit(targetSheet, blob, c, r, 7, 18); 
          } catch (e) {}
          photoIndex++;
        }
      }
    });

    return { success: true, url: newSS.getUrl() };
  } catch (e) { return { error: "PAT Generation Error: " + e.toString() }; }
}

function fillPlaceholder(sheet, text, value) {
  const data = sheet.getDataRange().getValues();
  for (let r = 0; r < Math.min(data.length, 10); r++) { // Look in top 10 rows
    for (let c = 0; c < data[r].length; c++) {
      if (String(data[r][c]).includes(text)) {
        sheet.getRange(r + 1, c + 2).setValue(value); // Set value in next column
        return;
      }
    }
  }
}

function insertImageWithFit(sheet, blob, col, row, widthInCols, heightInRows) {
  try {
    const img = sheet.insertImage(blob, col, row);

    // Calculate box size in pixels
    let boxWidth = 0;
    for (let i = 0; i < widthInCols; i++) boxWidth += sheet.getColumnWidth(col + i);

    let boxHeight = 0;
    for (let i = 0; i < heightInRows; i++) boxHeight += sheet.getRowHeight(row + i);

    // Original dimensions
    const origW = img.getWidth();
    const origH = img.getHeight();

    // Scaling to fit (with 5px padding)
    const scale = Math.min((boxWidth - 10) / origW, (boxHeight - 10) / origH);

    img.setWidth(origW * scale);
    img.setHeight(origH * scale);

    // Center it a bit
    img.setAnchorCellXOffset((boxWidth - (origW * scale)) / 2);
    img.setAnchorCellYOffset((boxHeight - (origH * scale)) / 2);
  } catch (e) {}
}

