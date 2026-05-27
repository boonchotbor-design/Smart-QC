// =========================================================================
// === AI SMART QC BOT - V.131 (FINAL PRODUCTION - SMART TEMPLATE) ===
// =========================================================================

const VERSION = "V.131 (SMART-MATCH)"; 
const FOLDER_ID = "1W0o5cNuejntiY7v9__f4LiAH3BH-bNpA";
const ARCHIVE_FOLDER_ID = "1dYRMNaTQsQfxsS-4z9GaWMIA3gQHq6h7";
const SPREADSHEET_ID = "1xp3EuRlWthalZhlWfToiJaihs4uYKARLEWXxVykmj9c";
const SHEET_NAME = "Sheet1";

// --- [MASTER TEMPLATES] ---
const TEMPLATES = {
  "HAE_MBB": "1f6v_5CNJyeaYk4ButvO7eXGqm47pnNQ_mjen8fOlVzI",
  "HAT_SSR": "1h2KQVYj9VS4mrbsNi2DC55OtGTzFSO1teqvJVwF5BEY",
  "DEFAULT": "1Pxdkd0Nxn-HzObefgkzcNFlCTDHrrVkj"
};

const TEMPLATE_FOLDER_ID = "1h2GLkJr-wtYCAM75ruBO4MBiNwirOoMT";

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
    if (action === "listfolders") return jsonResponse({ folders: listSubFolders(params.root || FOLDER_ID), rootName: "Drive" });
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
  } catch (err) { return jsonResponse({ error: "Server Error: " + err.toString() }); }
}

function processFolderById(folderId, templateId) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    const toProcess = [];
    const BATCH_LIMIT = 40; 
    let totalUnprocessed = 0;
    while (files.hasNext()) {
      const f = files.next();
      if (!(f.getDescription() || "").includes("PAT_CHECKED")) {
        totalUnprocessed++;
        if (toProcess.length < BATCH_LIMIT) toProcess.push(f);
      }
    }
    if (toProcess.length === 0) return { success: true, count: 0, hasMore: false };
    const result = processFileList(toProcess, folder.getName(), null);
    return { success: true, ...result, hasMore: totalUnprocessed > BATCH_LIMIT, remainingCount: totalUnprocessed - toProcess.length };
  } catch (e) { return { error: e.toString() }; } finally { lock.releaseLock(); }
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
      let imageType = ai.imageType || "unknown";
      if (imageType === "unknown" || !imageType) {
        const fn = f.getName().toUpperCase();
        if (fn.includes(" BF") || fn.includes("_BF") || fn.includes("BEFORE")) imageType = "before";
        else if (fn.includes(" AF") || fn.includes("_AF") || fn.includes("AFTER")) imageType = "after";
      }
      sheet.appendRow([new Date(), f.getName(), ai.sheetReference, status, ai.reason, f.getUrl(), f.getId(), siteName, imageType]);
      const destFolder = getOrCreateSubFolder(getOrCreateSubFolder(DriveApp.getFolderById(ARCHIVE_FOLDER_ID), siteName), status === "PASS" ? ai.sheetReference : "FAIL_" + ai.sheetReference);
      f.moveTo(destFolder);
      f.setDescription(`PAT_CHECKED: ${status} | TYPE: ${imageType} | ${f.getDescription() || ""}`);
      results.push({ name: f.getName(), status: status, reason: ai.reason, category: ai.sheetReference });
      if (status === "PASS") pass++; else { fail++; sendDualFailNotify(f.getName(), ai.sheetReference, ai.reason, f.getUrl(), f.getId()); }
    } catch (e) {}
  }
  if (pass + fail > 0) sendDualSummary(siteName, pass, fail, results.filter(r => r.status === "FAIL"));
  return { total: files.length, pass: pass, fail: fail, details: results };
}

function analyzeAI(file, customChecklist) {
  const b64 = Utilities.base64Encode(file.getBlob().getBytes());
  const promptText = `Analyze site photo. Match item from AIS checklist. Detect watermark Bf/Before or Af/After. Return JSON: {"sheetReference": "Item", "status": "PASS/FAIL", "reason": "Thai", "imageType": "before/after/unknown"}`;
  const payload = { "model": "meta-llama/llama-4-scout-17b-16e-instruct", "messages": [{ "role": "user", "content": [{ "type": "text", "text": promptText }, { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${b64}` } }] }], "response_format": { "type": "json_object" } };
  for (let key of GROQ_KEYS) {
    try {
      const res = UrlFetchApp.fetch(GROQ_AI_URL, { method: "post", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, payload: JSON.stringify(payload), muteHttpExceptions: true });
      if (res.getResponseCode() === 200) return JSON.parse(JSON.parse(res.getContentText()).choices[0].message.content);
    } catch (e) {}
  }
  return { status: "ERROR" };
}

function generatePAT(folderId, siteName) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    const siteFolder = DriveApp.getFolderById(folderId);
    const logs = [`Starting PAT for: ${siteName}`];
    
    // Auto Select Template
    let tid = TEMPLATES.DEFAULT;
    const sn = siteName.toUpperCase();
    if (sn.includes("HAE") || sn.includes("MBB")) tid = TEMPLATES.HAE_MBB;
    else if (sn.includes("HAT") || sn.includes("SSR")) tid = TEMPLATES.HAT_SSR;
    logs.push(`Template selected: ${tid === TEMPLATES.HAE_MBB ? "HAE_MBB" : tid === TEMPLATES.HAT_SSR ? "HAT_SSR" : "DEFAULT"}`);

    const data = sheet.getDataRange().getValues();
    const filtered = data.filter(row => String(row[7]) === siteName && String(row[3]).includes("PASS"));
    if (filtered.length === 0) return { error: "No PASS records for this site.", logs: logs };

    const dest = getOrCreateSubFolder(siteFolder, "TEMPATE");
    const newSS = SpreadsheetApp.openById(DriveApp.getFileById(tid).makeCopy(`PAT_${siteName}`, dest).getId());
    
    newSS.getSheets().forEach(s => { fillPlaceholder(s, "Site name :", siteName); fillPlaceholder(s, "Site code :", siteName); });

    const grouped = filtered.reduce((acc, row) => {
      const cat = String(row[2]).trim();
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({ id: row[6], type: String(row[8] || "").toLowerCase() });
      return acc;
    }, {});

    Object.keys(grouped).forEach(cat => {
      let targetSheet = findTargetSheetSmart(newSS, cat) || findSheetByContent(newSS, cat);
      if (!targetSheet) { logs.push(`⚠️ Missing sheet for: ${cat}`); return; }
      const locs = findImageLocations(targetSheet);
      const photos = grouped[cat];
      const insert = (pid, loc) => { try { insertImageInBox(targetSheet, DriveApp.getFileById(pid).getBlob(), loc.col, loc.row, loc.width, loc.height); return true; } catch(e){return false;} };
      
      let c=0;
      photos.filter(p=>p.type==="before").forEach((p,i)=>{ if(i<locs.filter(l=>l.type==="before").length) if(insert(p.id, locs.filter(l=>l.type==="before")[i])) c++; });
      photos.filter(p=>p.type==="after").forEach((p,i)=>{ if(i<locs.filter(l=>l.type==="after").length) if(insert(p.id, locs.filter(l=>l.type==="after")[i])) c++; });
      logs.push(`✅ ${cat}: Inserted ${c} images`);
    });
    return { success: true, url: newSS.getUrl(), logs: logs };
  } catch (e) { return { error: e.toString() }; }
}

function findTargetSheetSmart(ss, cat) {
  const clean = cat.toUpperCase().replace(/\s/g, "");
  return ss.getSheets().find(s => {
    const sn = s.getName().toUpperCase().replace(/\s/g, "");
    return sn === clean || sn.includes(clean) || clean.includes(sn);
  }) || (cat.match(/\((.*?)\)/) ? ss.getSheets().find(s => s.getName().toUpperCase().includes(cat.match(/\((.*?)\)/)[1].toUpperCase())) : null);
}

function findSheetByContent(ss, txt) {
  for (let s of ss.getSheets()) {
    const data = s.getRange(1, 1, 15, 10).getValues();
    for (let r=0; r<data.length; r++) for (let c=0; c<data[r].length; c++) if (String(data[r][c]).toUpperCase().includes(txt.toUpperCase())) return s;
  }
  return null;
}

function findImageLocations(sheet) {
  const data = sheet.getDataRange().getValues();
  const locs = [];
  const regex = /(Before|After)\s*:/i;
  for (let r=0; r<data.length; r++) for (let c=0; c<data[r].length; c++) {
    const match = String(data[r][c]).match(regex);
    if (match) locs.push({ col: c+1, row: r-15, width: 8, height: 16, type: match[1].toLowerCase() });
  }
  return locs;
}

function insertImageInBox(sheet, blob, col, row, w, h) {
  const img = sheet.insertImage(blob, col, Math.max(1, row));
  let pw = 0; for (let i=0; i<w; i++) pw += sheet.getColumnWidth(col+i);
  let ph = 0; for (let i=0; i<h; i++) ph += sheet.getRowHeight(Math.max(1, row+i));
  const ratio = Math.min((pw - 10) / img.getWidth(), (ph - 10) / img.getHeight());
  img.setWidth(img.getWidth()*ratio).setHeight(img.getHeight()*ratio).setAnchorCellXOffset((pw-img.getWidth()*ratio)/2).setAnchorCellYOffset((ph-img.getHeight()*ratio)/2);
}

function fillPlaceholder(s, t, v) {
  const data = s.getRange(1, 1, 10, 20).getValues();
  for (let r=0; r<data.length; r++) for (let c=0; c<data[r].length; c++) if (String(data[r][c]).includes(t)) s.getRange(r+1, c+2).setValue(v);
}

function jsonResponse(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function getOrCreateSubFolder(p, n) { const f = p.getFoldersByName(n); return f.hasNext() ? f.next() : p.createFolder(n); }
function checkPassword(e, p) { return (p === "QC-ADMIN-2024") ? { success: true } : { error: "รหัสผ่านไม่ถูกต้อง" }; }
function listSubFolders(id) { const subs = DriveApp.getFolderById(id).getFolders(); const res = []; while(subs.hasNext()){ const f = subs.next(); res.push({ id: f.getId(), name: f.getName(), url: f.getUrl(), date: f.getLastUpdated().toISOString() }); } return res.sort((a,b)=>new Date(b.date)-new Date(a.date)); }
function listFilesInFolder(id) { const files = DriveApp.getFolderById(id).getFiles(); const res = []; while(files.hasNext()){ const f = files.next(); if(!(f.getDescription()||"").includes("PAT_CHECKED")) res.push({ id: f.getId(), name: f.getName(), size: (f.getSize()/1024).toFixed(0)+" KB" }); } return res; }
function sendDualSummary(s, p, f, items) { let txt = `สรุปผล AI (${s})\n✅ ผ่าน: ${p}\n❌ ไม่ผ่าน: ${f}`; items.forEach((it,i)=> txt+=`\n${i+1}.📄 ${it.name}`); callTGRaw("sendMessage", { chat_id: TELEGRAM_TARGET_ID, text: txt }); }
function sendDualFailNotify(n, c, r, u, fid) { const blob = DriveApp.getFileById(fid).getBlob(); const kb = { inline_keyboard: [[{ text: "✅ อนุมัติ", callback_data: "app|" + fid }, { text: "❌ ไม่อนุมัติ", callback_data: "rej|" + fid }]] }; callTGRaw("sendPhoto", { chat_id: TELEGRAM_TARGET_ID, photo: blob, caption: `🚨 พบงานไม่ผ่าน\n📄 ไฟล์: ${n}\n📌 หมวด: ${c}\n❌ สาเหตุ: ${r}`, reply_markup: JSON.stringify(kb) }); }
function callTGRaw(m, p) { return UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${m}`, { method: "post", payload: p, muteHttpExceptions: true }); }
function listTemplates() { return []; } 
