// =========================================================================
// === AI SMART QC BOT - V.134 (ID-SYNC - 100% DATABASE MATCH) ===
// =========================================================================

const VERSION = "V.134 (ID-SYNC)"; 
const FOLDER_ID = "1W0o5cNuejntiY7v9__f4LiAH3BH-bNpA";
const ARCHIVE_FOLDER_ID = "1dYRMNaTQsQfxsS-4z9GaWMIA3gQHq6h7";
const SPREADSHEET_ID = "1CR-Gdi9IQ4mVB7xbjYmBGAhRPdJ0W4rJ"; // <--- UPDATED TO YOUR LATEST SHEET ID
const SHEET_NAME = "Sheet1";

const TEMPLATES = {
  "HAE_MBB": "1f6v_5CNJyeaYk4ButvO7eXGqm47pnNQ_mjen8fOlVzI",
  "HAT_SSR": "1h2KQVYj9VS4mrbsNi2DC55OtGTzFSO1teqvJVwF5BEY",
  "DEFAULT": "1Pxdkd0Nxn-HzObefgkzcNFlCTDHrrVkj"
};

const TELEGRAM_BOT_TOKEN = "8625222790:AAHjU70oWGm88NyUaXaWIDJveo3b2KpnG90"; 
const TELEGRAM_TARGET_ID = "-5199951121";
const GROQ_KEYS = ["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","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","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","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"];
const GROQ_AI_URL = "https://api.groq.com/openai/v1/chat/completions";

function doGet(e) {
  let params = e?.parameter || {};
  const action = (params.action || "").toLowerCase();
  try {
    if (action === "getdata") return jsonResponse(getDashboardData(params.site || "All Sites"));
    if (action === "checkpassword") return (params.password === "QC-ADMIN-2024") ? jsonResponse({success:true}) : jsonResponse({error:"รหัสไม่ถูกต้อง"});
    if (action === "listfolders") return jsonResponse({ folders: listSubFolders(params.root || FOLDER_ID) });
    if (action === "listfiles") return jsonResponse(listFilesInFolder(params.folderId));
    if (action === "processfolder") return jsonResponse(processFolderById(params.folderId, params.templateId));
    if (action === "generatepat") return jsonResponse(generatePAT(params.folderId, params.siteName));
    return jsonResponse({ status: "READY", version: VERSION });
  } catch (err) { return jsonResponse({ error: err.toString() }); }
}

function generatePAT(folderId, siteName) {
  try {
    const ssDb = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ssDb.getSheetByName(SHEET_NAME) || ssDb.getSheets()[0]; // Fallback to first sheet
    const siteFolder = DriveApp.getFolderById(folderId);
    const logs = [`[V.134] Starting PAT for: ${siteName}`, `Database ID: ${SPREADSHEET_ID}`];
    
    // 1. Recursive Scan
    const fileIdsInFolder = [];
    const scanAll = (fld) => {
      const it = fld.getFiles(); while (it.hasNext()) fileIdsInFolder.push(it.next().getId());
      const sub = fld.getFolders(); while (sub.hasNext()) {
        const s = sub.next(); if (s.getName() !== "TEMPATE") scanAll(s);
      }
    };
    scanAll(siteFolder);
    const idSet = new Set(fileIdsInFolder);
    logs.push(`Found ${fileIdsInFolder.length} total images in Drive folder.`);

    // 2. Database Lookup
    const data = sheet.getDataRange().getValues();
    const filtered = data.filter(row => {
      const fileId = String(row[6]).trim();
      const status = String(row[3]);
      return idSet.has(fileId) && status.includes("PASS");
    });

    logs.push(`Matched ${filtered.length} PASS records in the correct Spreadsheet.`);
    if (filtered.length === 0) return { success: false, error: "ไม่พบข้อมูล PASS ในฐานข้อมูล (โปรดเช็ค Spreadsheet ID และสถานะ PASS)", logs: logs };

    // 3. Template Selection
    let tid = TEMPLATES.DEFAULT;
    const sn = siteName.toUpperCase();
    if (sn.includes("HAE") || sn.includes("MBB")) tid = TEMPLATES.HAE_MBB;
    else if (sn.includes("HAT") || sn.includes("SSR")) tid = TEMPLATES.HAT_SSR;
    
    const dest = getOrCreateSubFolder(siteFolder, "TEMPATE");
    const newSS = SpreadsheetApp.openById(DriveApp.getFileById(tid).makeCopy(`PAT_REPORT_${siteName}`, dest).getId());
    
    newSS.getSheets().forEach(s => { fillPlaceholder(s, "Site name :", siteName); fillPlaceholder(s, "Site code :", siteName); });

    // 4. Grouping
    const grouped = filtered.reduce((acc, row) => {
      const cat = String(row[2]).trim();
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({ id: row[6], type: String(row[8] || "").toLowerCase() });
      return acc;
    }, {});

    // 5. Insertion
    Object.keys(grouped).forEach(cat => {
      let targetSheet = findTargetSheetSmart(newSS, cat) || findSheetByContent(newSS, cat);
      if (!targetSheet) { logs.push(`⚠️ Sheet not found for: "${cat}"`); return; }
      
      const locs = findImageLocations(targetSheet);
      const photos = grouped[cat];
      let c = 0;
      
      photos.forEach(p => {
        const type = p.type === "before" ? "before" : (p.type === "after" ? "after" : null);
        let targetLoc = type ? locs.find(l => l.type === type && !l.used) : locs.find(l => !l.used);

        if (targetLoc) {
          try {
            insertImageInBox(targetSheet, DriveApp.getFileById(p.id).getBlob(), targetLoc.col, targetLoc.row, targetLoc.width, targetLoc.height);
            targetLoc.used = true;
            c++;
          } catch(e) {}
        }
      });
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
    const data = s.getRange(1, 1, 30, 10).getValues();
    for (let r=0; r<data.length; r++) for (let c=0; c<data[r].length; c++) if (String(data[r][c]).toUpperCase().includes(txt.toUpperCase())) return s;
  }
  return null;
}

function findImageLocations(sheet) {
  const data = sheet.getDataRange().getValues();
  const locs = [];
  const regex = /(Before|After)(\s*:)?/i;
  for (let r=0; r<data.length; r++) for (let c=0; c<data[r].length; c++) {
    const match = String(data[r][c]).match(regex);
    if (match) locs.push({ col: c+1, row: Math.max(1, r-14), width: 8, height: 16, type: match[1].toLowerCase(), used: false });
  }
  if (locs.length === 0) { for (let i=0; i<6; i++) locs.push({ col: 2, row: 5 + (i*18), width: 10, height: 17, type: "none", used: false }); }
  return locs;
}

function insertImageInBox(sheet, blob, col, row, w, h) {
  const safeRow = Math.max(1, row);
  const img = sheet.insertImage(blob, col, safeRow);
  let pw = 0; for (let i=0; i<w; i++) pw += sheet.getColumnWidth(col+i);
  let ph = 0; for (let i=0; i<h; i++) ph += sheet.getRowHeight(Math.max(1, safeRow+i));
  if (pw <= 0) pw = 400; if (ph <= 0) ph = 300;
  const ratio = Math.min((pw - 10) / img.getWidth(), (ph - 10) / img.getHeight());
  img.setWidth(img.getWidth()*ratio).setHeight(img.getHeight()*ratio).setAnchorCellXOffset((pw-img.getWidth()*ratio)/2).setAnchorCellYOffset((ph-img.getHeight()*ratio)/2);
}

function fillPlaceholder(s, t, v) {
  const data = s.getRange(1, 1, 10, 20).getValues();
  for (let r=0; r<data.length; r++) for (let c=0; c<data[r].length; c++) if (String(data[r][c]).includes(t)) s.getRange(r+1, c+2).setValue(v);
}

function jsonResponse(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function getOrCreateSubFolder(p, n) { const f = p.getFoldersByName(n); return f.hasNext() ? f.next() : p.createFolder(n); }
function listSubFolders(id) { const subs = DriveApp.getFolderById(id).getFolders(); const res = []; while(subs.hasNext()){ const f = subs.next(); res.push({ id: f.getId(), name: f.getName(), url: f.getUrl(), date: f.getLastUpdated().toISOString() }); } return res.sort((a,b)=>new Date(b.date)-new Date(a.date)); }
function listFilesInFolder(id) { const files = DriveApp.getFolderById(id).getFiles(); const res = []; while(files.hasNext()){ const f = files.next(); if(!(f.getDescription()||"").includes("PAT_CHECKED")) res.push({ id: f.getId(), name: f.getName(), size: (f.getSize()/1024).toFixed(0)+" KB" }); } return res; }
function callTGRaw(m, p) { return UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${m}`, { method: "post", contentType: "application/json", payload: JSON.stringify(p), muteHttpExceptions: true }); }
function sendDualSummary(s, p, f, items) { let txt = `📊 สรุปผล AI (${s})\n✅ ผ่าน: ${p}\n❌ ไม่ผ่าน: ${f}`; items.forEach((it,i)=> txt+=`\n${i+1}.📄 ${it.name}`); callTGRaw("sendMessage", { chat_id: TELEGRAM_TARGET_ID, text: txt }); }
function sendDualFailNotify(n, c, r, u, fid) { const blob = DriveApp.getFileById(fid).getBlob(); const kb = { inline_keyboard: [[{ text: "✅ อนุมัติ", callback_data: "app|" + fid }, { text: "❌ ไม่อนุมัติ", callback_data: "rej|" + fid }]] }; callTGRaw("sendPhoto", { chat_id: TELEGRAM_TARGET_ID, photo: blob, caption: `🚨 พบงานไม่ผ่าน\n📄 ไฟล์: ${n}\n📌 หมวด: ${c}\n❌ สาเหตุ: ${r}`, reply_markup: JSON.stringify(kb) }); }
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
function getDashboardData(siteFilter) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME) || SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  const values = sheet.getDataRange().getValues();
  let dataRows = values.slice(1);
  if (siteFilter && siteFilter !== "All Sites") dataRows = dataRows.filter(row => String(row[1]).includes(siteFilter) || String(row[7]).includes(siteFilter));
  const statusMap = {};
  dataRows.forEach(row => { const status = String(row[3] || "").toUpperCase(); const cleanStatus = status.includes("PASS") ? "PASS" : (status.includes("FAIL") ? "FAIL" : "PENDING"); statusMap[cleanStatus] = (statusMap[cleanStatus] || 0) + 1; });
  return { metrics: { workOrders: dataRows.length, rate: dataRows.length > 0 ? Math.round((statusMap["PASS"] || 0) / dataRows.length * 100) : 0 }, statusBreakdown: Object.keys(statusMap).map(k => ({ name: k, value: statusMap[k] })) };
}
