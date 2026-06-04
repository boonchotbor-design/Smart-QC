// =========================================================================
// === AI SMART QC BOT - V.138 (SUPER-MATCH ENGINE - 100% RELIABILITY) ===
// =========================================================================

const VERSION = "V.138 (STABLE)"; 
const FOLDER_ID = "1W0o5cNuejntiY7v9__f4LiAH3BH-bNpA";
const ARCHIVE_FOLDER_ID = "1dYRMNaTQsQfxsS-4z9GaWMIA3gQHq6h7";
const SPREADSHEET_ID = "1xp3EuRIWthalZhIWfToiJaihs4uYKARLEWXxVykmi9c".trim(); 
const SHEET_NAME = "Sheet1";

function getSpreadsheet() {
  const candidates = [
    "1xp3EuRIWthalZhIWfToiJaihs4uYKARLEWXxVykmi9c", // Visually verified from URL
    "1xp3EuRlWthalZhlWfToiJaihs4uYKARLEWXxVykmj9c", // User's manually typed version
    "1CR-Gdi9IQ4mVB7xbjYmBGAhRPdJ0W4rJ"              // Old version mentioned in Test.gs
  ];
  
  let lastError = "";
  for (let id of candidates) {
    try {
      const ss = SpreadsheetApp.openById(id.trim());
      if (ss) return ss;
    } catch (e) { lastError = e.toString(); }
  }
  
  // Last resort: search by name
  try {
    const files = DriveApp.getFilesByName("Control Panel");
    while (files.hasNext()) {
      const file = files.next();
      if (file.getMimeType() === MimeType.GOOGLE_SHEETS) return SpreadsheetApp.open(file);
    }
  } catch (e) {}
  
  throw new Error("❌ ไม่พบไฟล์ Spreadsheet 'Control Panel' หรือไม่มีสิทธิ์เข้าถึง\n- อีเมลที่ใช้รัน: " + Session.getActiveUser().getEmail() + "\n- Error: " + lastError);
}

function getSheetSmart(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (sheet) return sheet;
  const lowerName = name.toLowerCase();
  const found = ss.getSheets().find(s => s.getName().toLowerCase() === lowerName);
  return found || ss.getSheets()[0];
}

const TEMPLATES = {
  "HAE_MBB": "1f6v_5CNJyeaYk4ButvO7eXGqm47pnNQ_mjen8fOlVzI",
  "HAT_SSR": "1h2KQVYj9VS4mrbsNi2DC55OtGTzFSO1teqvJVwF5BEY",
  "DEFAULT": "1Pxdkd0Nxn-HzObefgkzcNFlCTDHrrVkj"
};

const TELEGRAM_BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN"; 
const TELEGRAM_TARGET_ID = "YOUR_TELEGRAM_TARGET_ID";
const GROQ_KEYS = ["YOUR_GROQ_KEY_1", "YOUR_GROQ_KEY_2", "YOUR_GROQ_KEY_3", "YOUR_GROQ_KEY_4"];
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
    if (action === "createsitefolder") return jsonResponse(createSiteFolder(params.project, params.type, params.site));
    if (action === "listtemplates") return jsonResponse(listTemplates(params.type, params.project));
    return jsonResponse({ status: "READY", version: VERSION });
  } catch (err) { return jsonResponse({ error: err.toString() }); }
}

function doPost(e) {
  // Guard against manual runs from the script editor
  if (!e || !e.postData || !e.postData.contents) {
    const errorMsg = "⚠️ doPost called without event data (postData). This is expected when running manually from the editor. To test, use the 'testDoPost' function in Test.gs instead.";
    console.warn(errorMsg);
    return ContentService.createTextOutput(errorMsg);
  }

  try {
    const contents = JSON.parse(e.postData.contents);
    
    // Handle Dashboard Actions
    if (contents.action === "uploadfile") {
      return jsonResponse(uploadFile(contents.folderId, contents.fileName, contents.mimeType, contents.base64Data));
    }

    // Handle Callback Query (Approve/Reject buttons)
    if (contents.callback_query) {
      const data = contents.callback_query.data;
      const msg = contents.callback_query.message;
      const chatId = msg.chat.id;
      const msgId = msg.message_id;
      
      const parts = data.split("|");
      const action = parts[0]; // app or rej
      const fileId = parts[1];
      
      if (action === "app") {
        handleManualApprove(fileId, chatId, msgId, contents.callback_query.from.first_name);
      } else if (action === "rej") {
        handleManualReject(fileId, chatId, msgId, contents.callback_query.from.first_name);
      }
      return ContentService.createTextOutput("OK");
    }
    
    // Handle Text Messages
    if (contents.message && contents.message.text) {
      const text = contents.message.text;
      const chatId = contents.message.chat.id;
      if (text === "/status") {
        const stats = getDashboardData("All Sites");
        callTGRaw("sendMessage", { 
          chat_id: chatId, 
          text: `📊 *System Status (${VERSION})*\n✅ ผ่าน: ${stats.statusBreakdown.find(s=>s.name==="PASS")?.value || 0}\n❌ ไม่ผ่าน: ${stats.statusBreakdown.find(s=>s.name==="FAIL")?.value || 0}\n📝 ทั้งหมด: ${stats.metrics.workOrders}`,
          parse_mode: "Markdown"
        });
      }
    }
    
  } catch (err) {
    console.error("doPost Error: " + err.toString());
  }
  return ContentService.createTextOutput("OK");
}

/**
 * Handle direct file upload from Dashboard
 */
function uploadFile(folderId, fileName, mimeType, base64Data) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    const decoded = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    const file = folder.createFile(blob);
    return { success: true, id: file.getId(), name: file.getName(), url: file.getUrl() };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function handleManualApprove(fileId, chatId, msgId, adminName) {
  try {
    if (!fileId || fileId === "undefined" || fileId === "null") {
      throw new Error("Invalid File ID received from Telegram");
    }
    
    const file = DriveApp.getFileById(fileId);
    const ss = getSpreadsheet();
    const sheet = getSheetSmart(ss, SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    // Update Sheet
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][6]) === fileId) {
        sheet.getRange(i + 1, 4).setValue("PASS (MANUAL)");
        sheet.getRange(i + 1, 5).setValue(`Approved by ${adminName}`);
        
        // Move file with nested structure support
        const siteName = data[i][7];
        const fullCat = String(data[i][2]);
        const siteFolder = getOrCreateSubFolder(DriveApp.getFolderById(ARCHIVE_FOLDER_ID), siteName);
        
        let pathArr = fullCat.split(" > ");
        const destFolder = getOrCreateNestedFolder(siteFolder, pathArr);
        
        file.moveTo(destFolder);
        file.setDescription(`MANUAL_PASS: Approved by ${adminName} | ${file.getDescription() || ""}`);
        found = true;
        break;
      }
    }
    
    if (!found) {
      // Create new record if not found (Manual Entry)
      const folderName = file.getParents().hasNext() ? file.getParents().next().getName() : "Unknown Site";
      sheet.appendRow([new Date(), file.getName(), "MANUAL_QC", "PASS (MANUAL)", `Approved by ${adminName}`, file.getUrl(), fileId, folderName, "unknown", "MANUAL_QC", "MANUAL_QC", "MANUAL_QC"]);
      
      // Move to archive PASS folder
      const destFolder = getOrCreateSubFolder(getOrCreateSubFolder(DriveApp.getFolderById(ARCHIVE_FOLDER_ID), folderName), "MANUAL_QC");
      file.moveTo(destFolder);
      file.setDescription(`MANUAL_PASS: Approved by ${adminName} (New Record Created)`);
      
      callTGRaw("sendMessage", { chat_id: chatId, text: "📝 ไม่พบข้อมูลในระบบ แต่ได้ทำการบันทึกรายการใหม่และย้ายไฟล์ให้แล้วครับ" });
    }

    callTGRaw("editMessageCaption", {
      chat_id: chatId,
      message_id: msgId,
      caption: `✅ *APPROVED BY ${adminName.toUpperCase()}*\n📄 ไฟล์: ${file.getName()}\nอนุมัติเรียบร้อยและบันทึกข้อมูลเข้า Spreadsheet แล้ว`,
      parse_mode: "Markdown"
    });
    
  } catch (e) {
    callTGRaw("sendMessage", { chat_id: chatId, text: "❌ Approve Error: " + e.toString() });
  }
}

function handleManualReject(fileId, chatId, msgId, adminName) {
  try {
    if (!fileId || fileId === "undefined" || fileId === "null") {
      throw new Error("Invalid File ID received from Telegram");
    }
    
    const file = DriveApp.getFileById(fileId);
    callTGRaw("editMessageCaption", {
      chat_id: chatId,
      message_id: msgId,
      caption: `❌ *REJECTED BY ${adminName.toUpperCase()}*\n📄 ไฟล์: ${file.getName()}\nยืนยันไม่ผ่านงานตามที่ AI แจ้ง`,
      parse_mode: "Markdown"
    });
  } catch (e) {
     callTGRaw("sendMessage", { chat_id: chatId, text: "❌ Reject Error: " + e.toString() });
  }
}

function createSiteFolder(project, type, site) {
  try {
    const root = DriveApp.getFolderById(FOLDER_ID);
    const folderName = `${project}_${type}_${site}`;
    const folder = root.createFolder(folderName);
    return { id: folder.getId(), name: folder.getName(), url: folder.getUrl() };
  } catch (e) { return { error: e.toString() }; }
}

function listTemplates(type, project) {
  try {
    const key = `${project}_${type}`;
    const id = TEMPLATES[key] || TEMPLATES.DEFAULT;
    const file = DriveApp.getFileById(id);
    return [{ id: id, name: file.getName(), key: key }];
  } catch (e) { return [{ id: TEMPLATES.DEFAULT, name: "Default Template", key: "DEFAULT" }]; }
}

function generatePAT(folderId, siteName) {
  try {
    const ssDb = getSpreadsheet();
    const sheet = ssDb.getSheetByName(SHEET_NAME); 
    const siteFolder = DriveApp.getFolderById(folderId);
    const logs = [`[V.138] Starting PAT for: ${siteName}`];
    
    const fileIdsInFolder = [];
    const scanRecursively = (fld) => {
      const it = fld.getFiles(); while (it.hasNext()) fileIdsInFolder.push(it.next().getId());
      const subs = fld.getFolders(); while (subs.hasNext()) {
        const s = subs.next(); if (s.getName() !== "TEMPATE") scanRecursively(s);
      }
    };
    scanRecursively(siteFolder);
    const idSet = new Set(fileIdsInFolder);
    logs.push(`Found ${fileIdsInFolder.length} images total in Drive.`);

    const data = sheet.getDataRange().getValues();
    const filtered = data.filter(row => {
      const fileIdInSheet = String(row[6]).trim();
      const status = String(row[3]).toUpperCase();
      return idSet.has(fileIdInSheet) && status.includes("PASS");
    });

    logs.push(`Matched ${filtered.length} PASS records in database.`);
    if (filtered.length === 0) return { success: false, error: "ไม่พบรูปภาพที่ผ่าน QC ในโฟลเดอร์นี้", logs: logs };

    let tid = TEMPLATES.DEFAULT;
    const sn = siteName.toUpperCase();
    if (sn.includes("HAE") || sn.includes("MBB")) tid = TEMPLATES.HAE_MBB;
    else if (sn.includes("HAT") || sn.includes("SSR")) tid = TEMPLATES.HAT_SSR;
    
    const dest = getOrCreateSubFolder(siteFolder, "TEMPATE");
    const newSS = SpreadsheetApp.openById(DriveApp.getFileById(tid).makeCopy(`PAT_REPORT_${siteName}`, dest).getId());
    
    newSS.getSheets().forEach(s => { fillPlaceholder(s, "Site name :", siteName); fillPlaceholder(s, "Site code :", siteName); });

    const grouped = filtered.reduce((acc, row) => {
      const cat = String(row[2]).trim();
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({ id: row[6], type: String(row[8] || "").toLowerCase() });
      return acc;
    }, {});

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
  } catch (e) { return { error: "Generate Error: " + e.toString() }; }
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
  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const match = String(data[r][c]).match(regex);
      if (match) locs.push({ col: c + 1, row: Math.max(1, r - 14), width: 8, height: 16, type: match[1].toLowerCase(), used: false });
    }
  }
  if (locs.length === 0) { for (let i = 0; i < 6; i++) locs.push({ col: 2, row: 5 + (i * 18), width: 10, height: 17, type: "none", used: false }); }
  return locs;
}

function insertImageInBox(sheet, blob, col, row, w, h) {
  const img = sheet.insertImage(blob, col, Math.max(1, row));
  let pw = 0; for (let i = 0; i < w; i++) pw += sheet.getColumnWidth(col + i);
  let ph = 0; for (let i = 0; i < h; i++) ph += sheet.getRowHeight(Math.max(1, row + i));
  if (pw <= 0) pw = 400; if (ph <= 0) ph = 300;
  const ratio = Math.min((pw - 10) / img.getWidth(), (ph - 10) / img.getHeight());
  img.setWidth(img.getWidth() * ratio).setHeight(img.getHeight() * ratio);
  img.setAnchorCellXOffset((pw - img.getWidth() * ratio) / 2).setAnchorCellYOffset((ph - img.getHeight() * ratio) / 2);
}

function fillPlaceholder(s, t, v) {
  const data = s.getRange(1, 1, 10, 20).getValues();
  for (let r = 0; r < data.length; r++) for (let c = 0; c < data[r].length; c++) if (String(data[r][c]).includes(t)) s.getRange(r + 1, c + 2).setValue(v);
}

function jsonResponse(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function getOrCreateSubFolder(p, n) { const f = p.getFoldersByName(n); return f.hasNext() ? f.next() : p.createFolder(n); }
function listSubFolders(id) { const subs = DriveApp.getFolderById(id).getFolders(); const res = []; while (subs.hasNext()) { const f = subs.next(); res.push({ id: f.getId(), name: f.getName(), url: f.getUrl(), date: f.getLastUpdated().toISOString() }); } return res.sort((a, b) => new Date(b.date) - new Date(a.date)); }
function listFilesInFolder(id) { 
  try {
    const folder = DriveApp.getFolderById(id);
    const files = folder.getFiles(); 
    const res = []; 
    while (files.hasNext()) { 
      const f = files.next(); 
      if (!(f.getDescription() || "").includes("PAT_CHECKED")) res.push({ id: f.getId(), name: f.getName(), size: (f.getSize() / 1024).toFixed(0) + " KB" }); 
    } 
    return { folderName: folder.getName(), files: res, totalInFolder: DriveApp.getFolderById(id).getFiles().hasNext() ? "Has Files" : "Empty" }; 
  } catch (e) { return { error: e.toString() }; }
}
function callTGRaw(m, p) { return UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${m}`, { method: "post", contentType: "application/json", payload: JSON.stringify(p), muteHttpExceptions: true }); }
function sendDualSummary(s, p, f, items) { let txt = `📊 สรุปผล AI (${s})\n✅ ผ่าน: ${p}\n❌ ไม่ผ่าน: ${f}`; items.forEach((it, i) => txt += `\n${i + 1}.📄 ${it.name}`); callTGRaw("sendMessage", { chat_id: TELEGRAM_TARGET_ID, text: txt }); }
function sendDualFailNotify(n, c, r, u, fid) { const blob = DriveApp.getFileById(fid).getBlob(); const kb = { inline_keyboard: [[{ text: "✅ อนุมัติ", callback_data: "app|" + fid }, { text: "❌ ไม่อนุมัติ", callback_data: "rej|" + fid }]] }; callTGRaw("sendPhoto", { chat_id: TELEGRAM_TARGET_ID, photo: blob, caption: `🚨 พบงานไม่ผ่าน\n📄 ไฟล์: ${n}\n📌 หมวด: ${c}\n❌ สาเหตุ: ${r}`, reply_markup: JSON.stringify(kb) }); }

function processFolderById(folderId, templateId) {
  const lock = LockService.getScriptLock();
  try {
    const hasLock = lock.tryLock(10000); 
    if (!hasLock) return { error: "⚠️ ระบบกำลังประมวลผลโฟลเดอร์อื่นอยู่ กรุณารอสักครู่ (System Busy)" };
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    const toProcess = [];
    const BATCH_LIMIT = 30; 
    let totalUnprocessed = 0;
    
    const allFiles = [];
    while (files.hasNext()) {
      const f = files.next();
      if (!(f.getDescription() || "").includes("PAT_CHECKED")) {
        totalUnprocessed++;
        allFiles.push(f);
      }
    }
    
    if (allFiles.length === 0) return { success: true, total: 0, pass: 0, fail: 0, details: [], hasMore: false, totalUnprocessed: 0, message: "ตรวจครบทุกรูปแล้วครับ" };
    
    for (let i = 0; i < Math.min(allFiles.length, BATCH_LIMIT); i++) toProcess.push(allFiles[i]);
    
    const result = processFileList(toProcess, folder.getName(), null);
    
    if (totalUnprocessed <= BATCH_LIMIT && (result.pass + result.fail > 0)) {
      sendDualSummary(folder.getName(), result.pass, result.fail, result.details.filter(r => r.status === "FAIL" || r.status === "ERROR"));
    }

    return { 
      success: true, 
      ...result, 
      hasMore: totalUnprocessed > BATCH_LIMIT, 
      totalUnprocessed: totalUnprocessed,
      processedInBatch: toProcess.length,
      message: totalUnprocessed > BATCH_LIMIT ? `กำลังตรวจ... (เหลืออีก ${totalUnprocessed - toProcess.length} รูป)` : "ตรวจครบทุกรูปแล้วครับ"
    };
  } catch (e) { return { error: e.toString() }; } finally { try { lock.releaseLock(); } catch(e) {} }
}

function processFileList(files, siteName, checklist) {
  const ss = getSpreadsheet();
  const sheet = getSheetSmart(ss, SHEET_NAME);
  let pass = 0, fail = 0;
  const results = [];
  
  for (let f of files) {
    if (!f) {
      console.warn("Skipping undefined file in processFileList");
      continue;
    }
    try {
      const ai = analyzeAI(f, checklist);
      if (!ai || ai.status === "ERROR") {
        const errorMsg = ai?.reason || "AI connection failed";
        results.push({ name: f.getName(), status: "ERROR", reason: "AI วิเคราะห์ไม่ได้: " + errorMsg });
        fail++;
        f.setDescription(`PAT_CHECKED: ERROR | REASON: ${errorMsg} | ${f.getDescription() || ""}`);
        continue;
      }
      
      const status = ai.status.toUpperCase();
      let imageType = ai.imageType || "unknown";
      if (imageType === "unknown") {
        const fn = f.getName().toUpperCase();
        if (fn.includes(" BF") || fn.includes("_BF") || fn.includes("BEFORE")) imageType = "before";
        else if (fn.includes(" AF") || fn.includes("_AF") || fn.includes("AFTER")) imageType = "after";
      }
      
      // Update Spreadsheet with detailed info
      sheet.appendRow([
        new Date(), 
        f.getName(), 
        ai.sheetReference || "Unknown", 
        status, 
        ai.reason, 
        f.getUrl(), 
        f.getId(), 
        siteName, 
        imageType,
        ai.majorCategory || "",
        ai.subCategory || "",
        ai.detail || ""
      ]);
      
      try {
        const rootArchive = DriveApp.getFolderById(ARCHIVE_FOLDER_ID);
        const siteFolder = getOrCreateSubFolder(rootArchive, siteName);
        
        let path = [];
        if (status === "PASS") {
          path = [ai.majorCategory || "Uncategorized", ai.subCategory || "General", ai.detail || "Misc"];
        } else {
          path = ["FAIL", ai.majorCategory || "Uncategorized", ai.subCategory || "General", ai.detail || "Misc"];
        }
        
        // Ensure path is an array before passing to getOrCreateNestedFolder
        const destFolder = getOrCreateNestedFolder(siteFolder, path);
        f.moveTo(destFolder);
        f.setDescription(`PAT_CHECKED: ${status} | PATH: ${path.join(" > ")} | TYPE: ${imageType} | ${f.getDescription() || ""}`);
      } catch (e) {
        console.error("Folder Move Error for file " + f.getName() + ": " + e.toString());
      }
      
      results.push({ name: f.getName(), status: status, reason: ai.reason, category: ai.sheetReference });
      if (status === "PASS") pass++; 
      else { 
        fail++; 
        sendDualFailNotify(f.getName(), ai.sheetReference, ai.reason, f.getUrl(), f.getId()); 
      }
    } catch (e) {
      console.error("Error processing file " + (f ? f.getName() : "unknown") + ": " + e.toString());
      results.push({ name: f ? f.getName() : "Unknown", status: "ERROR", reason: "ระบบขัดข้อง: " + e.toString() });
      fail++;
    }
  }
  return { total: files.length, pass: pass, fail: fail, details: results };
}

function getOrCreateNestedFolder(root, pathArr) {
  let current = root;
  for (let folderName of pathArr) {
    if (!folderName || folderName === "undefined") continue;
    current = getOrCreateSubFolder(current, folderName);
  }
  return current;
}

function analyzeAI(file, customChecklist) {
  const blob = file.getBlob();
  const b64 = Utilities.base64Encode(blob.getBytes());
  const mimeType = blob.getContentType();
  
  // Construct a more detailed checklist from QC_CONFIG if no custom checklist is provided
  let detailedChecklist = customChecklist;
  if (!detailedChecklist) {
    detailedChecklist = "Identify which category this photo belongs to from the following structure:\n";
    for (let major in QC_CONFIG) {
      detailedChecklist += `- ${major}:\n`;
      for (let sub in QC_CONFIG[major]) {
        detailedChecklist += `  * ${sub}\n`;
      }
    }
  }

  const promptText = `Analyze site photo for AIS standard compliance. 
  You MUST return ONLY a JSON object. NO conversation or markdown blocks.
  Hierarchy: Major Category > Sub Category > Detail.
  
  Return JSON: 
  {
    "majorCategory": "String", 
    "subCategory": "String", 
    "detail": "String",
    "status": "PASS"|"FAIL",
    "reason": "Thai explanation of why it passed or failed based on technical standards",
    "imageType": "before"|"after"|"unknown"
  }

  Standards: 
  - Wire strip length must be exactly 18mm (if applicable).
  - Compass must be clear and readable.
  - Quality must be professional and neat.
  
  Available Categories:
  ${detailedChecklist}`;

  const payload = { 
    "model": "llama-3.2-90b-vision-preview", 
    "messages": [{ 
      "role": "user", 
      "content": [
        { "type": "text", "text": promptText }, 
        { "type": "image_url", "image_url": { "url": `data:${mimeType};base64,${b64}` } }
      ] 
    }], 
    "response_format": { "type": "json_object" } 
  };
  
  for (let key of GROQ_KEYS) {
    try {
      const res = UrlFetchApp.fetch(GROQ_AI_URL, { 
        method: "post", 
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, 
        payload: JSON.stringify(payload), 
        muteHttpExceptions: true 
      });

      if (res.getResponseCode() === 200) {
        let rawContent = JSON.parse(res.getContentText()).choices[0].message.content;
        let cleanJson = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
        
        let aiResult;
        try {
          aiResult = JSON.parse(cleanJson);
        } catch (e) {
          // Attempt to extract JSON if it's buried in text
          const match = cleanJson.match(/\{[\s\S]*\}/);
          if (match) aiResult = JSON.parse(match[0]);
          else throw new Error("No valid JSON found in AI response");
        }

        // Return with defaults to prevent undefined errors
        const finalResult = {
          majorCategory: aiResult.majorCategory || "Uncategorized",
          subCategory: aiResult.subCategory || "General",
          detail: aiResult.detail || "Misc",
          status: (aiResult.status || "FAIL").toUpperCase(),
          reason: aiResult.reason || "AI returned invalid format",
          imageType: aiResult.imageType || "unknown"
        };
        
        // Map to legacy sheetReference
        finalResult.sheetReference = `${finalResult.majorCategory} > ${finalResult.subCategory} > ${finalResult.detail}`;
        return finalResult;
      }
    } catch (e) {
      console.warn("AI Retry logic for file " + file.getName() + ": " + e.toString());
    }
  }
  return { status: "ERROR", reason: "AI connection or format error" };
}

function getDashboardData(siteFilter) {
  try {
    const ss = getSpreadsheet();
    const sheet = getSheetSmart(ss, SHEET_NAME);
    const values = sheet.getDataRange().getValues();
    let dataRows = values.slice(1);
    if (siteFilter && siteFilter !== "All Sites") dataRows = dataRows.filter(row => String(row[1]).includes(siteFilter) || String(row[7]).includes(siteFilter));
    const statusMap = {};
    dataRows.forEach(row => { const status = String(row[3] || "").toUpperCase(); const cleanStatus = status.includes("PASS") ? "PASS" : (status.includes("FAIL") ? "FAIL" : "PENDING"); statusMap[cleanStatus] = (statusMap[cleanStatus] || 0) + 1; });
    return { metrics: { workOrders: dataRows.length, rate: dataRows.length > 0 ? Math.round((statusMap["PASS"] || 0) / dataRows.length * 100) : 0 }, statusBreakdown: Object.keys(statusMap).map(k => ({ name: k, value: statusMap[k] })) };
  } catch(e) { return { metrics: {workOrders:0, rate:0}, statusBreakdown: [] }; }
}
