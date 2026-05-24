// =========================================================================
// === AI SMART QC BOT - V.113 (GROQ DIRECT & ROBUST PARSING) ===
// =========================================================================

const VERSION = "V.113 (GROQ-DIRECT)"; 
const FOLDER_ID = "1W0o5cNuejntiY7v9__f4LiAH3BH-bNpA"; 
const ARCHIVE_FOLDER_ID = "1dYRMNaTQsQfxsS-4z9GaWMIA3gQHq6h7"; 
const SHEET_NAME = "Dashboard"; 
const SPREADSHEET_ID = "1-D-YNXQwAoIAgpTxUGvgY-6caRtuMgarZ68wwA6jmnA"; 

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwlhZ_vy7_gZ8gQOvnY0PIu_1O_VVEuOFLtvXIORtT76F1bX4fSd4Frj6tUkY3-pd2YAg/exec";

const PROJECT_LIST = ["HAE", "TME", "HAB", "TMT"];
const TYPE_LIST = ["MBB", "POWER"];

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
const LINE_TARGET_IDS = ["C5a1893cfbad69376b46bb90b0829019e"]; 

function doGet(e) {
  // Robust parameter extraction
  let params = {};
  if (e && e.parameter) params = e.parameter;
  if (e && e.queryString) {
    const pairs = e.queryString.split("&");
    pairs.forEach(p => {
      const parts = p.split("=");
      if (parts.length === 2) params[parts[0]] = decodeURIComponent(parts[1]);
    });
  }

  const action = (params.action || "").toLowerCase();
  console.log("doGet Action Received:", action);
  console.log("Full Params:", JSON.stringify(params));

  try {
    if (action === "getdata") {
      const site = params.site || "All Sites";
      return jsonResponse(getDashboardData(site));
    }
    
    if (action === "listfolders") {
      return jsonResponse(listSubFolders());
    }
    
    if (action === "listfiles") {
      return jsonResponse(listFilesInFolder(params.folderId));
    }
    
    if (action === "processfolder") {
      return jsonResponse(processFolderById(params.folderId));
    }

    return jsonResponse({ 
      status: "READY", 
      message: "No action matched",
      receivedAction: action,
      receivedParams: params 
    });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

/**
 * Helper to return JSON output
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Lists all subfolders in the root FOLDER_ID
 */
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
        fileCount: 0, // Simplified: skip counting for now to ensure speed
        date: f.getLastUpdated().toISOString() 
      });
    }
    return result;
  } catch (e) {
    return { error: "Drive Error: " + e.toString() };
  }
}

/**
 * Lists all files in a specific folder
 */
function listFilesInFolder(folderId) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    const result = [];
    while (files.hasNext()) {
      const f = files.next();
      if (!f.getDescription() || !f.getDescription().includes("PAT_CHECKED")) {
        result.push({ 
          id: f.getId(), 
          name: f.getName(), 
          size: (f.getSize() / 1024).toFixed(0) + " KB", 
          date: f.getLastUpdated().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        });
      }
    }
    return result;
  } catch (e) {
    return { error: e.toString() };
  }
}

/**
 * Manually trigger processing for a specific folder
 */
function processFolderById(folderId) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) { return { error: "System busy, please try again." }; }

  try {
    const folder = DriveApp.getFolderById(folderId);
    const siteName = folder.getName();
    const files = folder.getFiles();
    const toProcess = [];
    while (files.hasNext()) {
      const f = files.next();
      if (!f.getDescription() || !f.getDescription().includes("PAT_CHECKED")) {
        toProcess.push(f);
      }
    }

    if (toProcess.length === 0) return { success: true, count: 0, message: "No files to process" };

    const summary = processFileList(toProcess, siteName);
    return { success: true, ...summary };
  } catch (e) {
    return { error: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Core processing logic for a list of files
 */
function processFileList(files, siteName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  let pass = 0, fail = 0;
  const results = [];

  for (let f of files) {
    try {
      const ai = analyzeAI(f);
      if (!ai || ai.status === "ERROR") {
        results.push({ name: f.getName(), status: "ERROR", reason: ai?.reason || "Unknown AI error" });
        continue;
      }

      const status = ai.status.toUpperCase();
      sheet.appendRow([new Date(), f.getName(), ai.sheetReference, status, ai.reason, f.getUrl(), f.getId()]);
      
      const destFolder = getOrCreateSubFolder(getOrCreateSubFolder(DriveApp.getFolderById(ARCHIVE_FOLDER_ID), siteName), status === "PASS" ? ai.sheetReference : "FAIL_" + ai.sheetReference);
      f.moveTo(destFolder);
      f.setDescription(`PAT_CHECKED: ${status} | ${f.getDescription() || ""}`);

      results.push({ name: f.getName(), status: status, reason: ai.reason });
      if (status === "PASS") pass++; else {
        fail++;
        sendDualFailNotify(f.getName(), ai.sheetReference, ai.reason, f.getUrl(), f.getId());
      }
    } catch (e) {
      results.push({ name: f.getName(), status: "ERROR", reason: e.toString() });
    }
  }

  if (pass + fail > 0) {
    sendDualSummary(siteName, pass, fail);
  }

  return { total: files.length, pass: pass, fail: fail, details: results };
}

/**
 * Summarizes data for the Executive Dashboard with optional site filtering
 */
function getDashboardData(siteFilter) {
  const ss = getSpreadsheet();
  if (!ss) return { error: "Spreadsheet not found" };
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return { error: "Sheet not found" };

  const values = sheet.getDataRange().getValues();
  const folderList = listSubFolders();
  
  if (values.length <= 1) return { 
    metrics: { workOrders: 0, plan: 12.5, income: 15.2, rate: 0 },
    statusBreakdown: [],
    teamWorkload: [],
    folders: folderList
  };

  let dataRows = values.slice(1); // Remove header
  
  // Apply Site Filter
  if (siteFilter && siteFilter !== "All Sites") {
    // Basic filter: check if filename contains site name (standard practice in this bot)
    dataRows = dataRows.filter(row => String(row[1]).includes(siteFilter));
  }

  // Status Breakdown calculation
  const statusMap = {};
  dataRows.forEach(row => {
    const status = String(row[3] || "UNKNOWN").toUpperCase();
    const cleanStatus = status.includes("PASS") ? "PASS" : (status.includes("FAIL") ? "FAIL" : "PENDING");
    statusMap[cleanStatus] = (statusMap[cleanStatus] || 0) + 1;
  });

  const statusBreakdown = Object.keys(statusMap).map(k => ({ name: k, value: statusMap[k] }));

  const workOrders = dataRows.length;
  const passCount = dataRows.filter(r => String(r[3]).includes("PASS")).length;
  const completionRate = workOrders > 0 ? (passCount / workOrders) * 100 : 0;

  return {
    metrics: {
      workOrders: workOrders,
      plan: 12.5, 
      income: 15.2, 
      rate: completionRate.toFixed(1)
    },
    statusBreakdown: statusBreakdown,
    teamWorkload: [
      { name: 'Team 1', Completed: Math.min(passCount, 15), InProgress: 10, OnService: 5, Pending: 2 },
      { name: 'Team 2', Completed: Math.max(0, passCount - 15), InProgress: 15, OnService: 3, Pending: 4 },
      { name: 'Team 3', Completed: 0, InProgress: 5, OnService: 8, Pending: 1 }
    ],
    folders: folderList,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Webhook entry point - OPTIMIZED FOR SPEED & DEDUPLICATION
 */
function doPost(e) {
  const cache = CacheService.getScriptCache();
  
  try {
    if (!e.postData || !e.postData.contents) return ContentService.createTextOutput("OK");
    const data = JSON.parse(e.postData.contents);
    
    // 1. DEDUPLICATION
    const updateId = data.update_id ? "u_" + data.update_id : (data.events ? "e_" + data.events[0].webhookEventId : null);
    if (updateId) {
      if (cache.get(updateId)) return ContentService.createTextOutput("OK");
      cache.put(updateId, "1", 600);
    }

    // 2. BACKLOG PROTECTION
    if (data.message && data.message.date) {
      const now = Math.floor(Date.now() / 1000);
      if (now - data.message.date > 120) return ContentService.createTextOutput("OK");
    }

    // 3. PROCESS PLATFORMS
    if (data.events) {
      handleLineWebhook(data.events[0]);
    } else {
      handleTelegramWebhook(data);
    }

    // 4. ASYNC LOGGING
    try { logToSheet(data); } catch(l){}

  } catch (err) {
    console.error("doPost Error: " + err.toString());
  }
  
  return ContentService.createTextOutput("OK");
}

// =========================================================================
// === [TELEGRAM HANDLER] ===
// =========================================================================

function handleTelegramWebhook(data) {
  const props = PropertiesService.getScriptProperties();
  
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
    if (val.startsWith("rej|")) return processManualReject(val.split("|")[1], cid);
    return;
  }

  // B. Message Handler
  const msg = data.message || data.edited_message;
  if (!msg || (msg.from && msg.from.is_bot)) return;

  const cid = msg.chat.id; const uid = "TG_" + msg.from.id; let text = (msg.text || "").trim();
  if (text.includes("@")) text = text.split("@")[0].trim();
  const lowerText = text.toLowerCase();
  const s = props.getProperty(uid + "_s") || "IDLE";

  // Diagnostic Commands
  if (lowerText === "/id" || lowerText === "/check" || lowerText === "id") {
    return sendTG(cid, `🆔 <b>Chat ID:</b> <code>${cid}</code>\n👤 <b>User ID:</b> <code>${uid}</code>\n📦 <b>Version:</b> ${VERSION}\n📂 <b>State:</b> ${s}`, ["ส่งงาน"]);
  }

  if (lowerText === "ส่งงาน" || lowerText === "/start" || lowerText === "สั่งงาน") {
    clearUser(uid); props.setProperty(uid + "_s", "W_PJ");
    return sendTGInline(cid, "🏗️ ขั้นตอนที่ 1: เลือก Project ครับ", PROJECT_LIST.map(p => ({ text: p, data: "pj|"+p })));
  }
  
  if (lowerText === "/status") return sendTG(cid, `🤖 <b>Status:</b> ACTIVE\n📦 <b>Version:</b> ${VERSION}\n📂 <b>State:</b> ${s}`, ["ส่งงาน"]);
  
  if (lowerText === "จบงาน" || lowerText === "ยกเลิก" || lowerText === "/stop" || lowerText === "เสร็จแล้ว") {
    if ((lowerText === "จบงาน" || lowerText === "เสร็จแล้ว") && s === "W_PH") {
      sendTG(cid, "✅ รับทราบ! สั่ง AI ตรวจทันทีครับ\n(รอสรุปผล 1-3 นาที)", ["ส่งงาน"]);
      ScriptApp.newTrigger('runPatInspector').timeBased().after(1000).create();
    } else { sendTG(cid, "❌ ยกเลิกเรียบร้อย", ["ส่งงาน"]); }
    clearUser(uid); return;
  }

  if (s === "W_SI" && text !== "") {
    const site = text.toUpperCase();
    const pj = props.getProperty(uid+"_p") || "Unknown";
    const ty = props.getProperty(uid+"_t") || "Unknown";
    try {
      const folder = getOrCreateSubFolder(DriveApp.getFolderById(FOLDER_ID), `${pj}_${ty}_${site}`);
      props.setProperties({ [uid+"_site"]: site, [uid+"_s"]: "W_PH" });
      return sendTG(cid, `✅ <b>Site: ${site}</b>\n📂 <b>Folder:</b> <a href="${folder.getUrl()}">คลิกเพื่อส่งรูป</a>\n\n📸 ส่งรูปในนี้หรือผ่านลิงก์ก็ได้ครับ\n(พิมพ์ 'จบงาน' เมื่อส่งครบ)`, ["จบงาน", "ยกเลิก"]);
    } catch(e) { return sendTG(cid, "⚠️ เกิดข้อผิดพลาดในการสร้างโฟลเดอร์ กรุณาลองใหม่", ["ส่งงาน"]); }
  }

  if (msg.photo && s === "W_PH") return processImage("TG", uid, cid, msg.photo[msg.photo.length - 1].file_id);
}

// =========================================================================
// === [LINE HANDLER] ===
// =========================================================================

function handleLineWebhook(ev) {
  const uid = "LINE_" + ev.source.userId; const props = PropertiesService.getScriptProperties();
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
  console.log("Starting runPatInspector...");
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    console.error("Could not obtain lock for runPatInspector: " + e.toString());
    return;
  }

  try {
    const ts = ScriptApp.getProjectTriggers(); for (let t of ts) { if (t.getHandlerFunction() === 'runPatInspector') ScriptApp.deleteTrigger(t); }
    
    const rootFolder = DriveApp.getFolderById(FOLDER_ID);
    const allFiles = getAllRecursiveFiles(rootFolder, ARCHIVE_FOLDER_ID);
    const toProcess = allFiles.filter(f => !f.getDescription() || !f.getDescription().includes("PAT_CHECKED"));
    
    console.log(`Found ${toProcess.length} new files to check.`);
    if (toProcess.length === 0) return;

    // Group files by parent folder (site name) for better summarization
    const groups = {};
    toProcess.forEach(f => {
      const p = f.getParents().next();
      const pId = p.getId();
      if (!groups[pId]) groups[pId] = { name: p.getName(), files: [] };
      groups[pId].files.push(f);
    });

    for (let pId in groups) {
      console.log(`Processing group: ${groups[pId].name}`);
      processFileList(groups[pId].files, groups[pId].name);
    }
  } catch (e) {
    console.error(`runPatInspector Error: ${e.toString()}`);
  } finally {
    lock.releaseLock();
  }
}
function sendDualSummary(site, pass, fail) {
  const txt = `📊 <b>สรุปผล AI (${site})</b>\n✅ ผ่าน: ${pass}\n❌ ไม่ผ่าน: ${fail}`;
  console.log(`Sending Summary to TG (${TELEGRAM_TARGET_ID})`);
  sendTG(TELEGRAM_TARGET_ID, txt, ["ส่งงาน"]);
}

function sendDualFailNotify(fn, cat, reason, url, fid) {
  const tgKb = { inline_keyboard: [
    [{ text: "✅ อนุมัติ", callback_data: "app|" + fid }, { text: "❌ ไม่อนุมัติ", callback_data: "rej|" + fid }],
    [{ text: "🔍 ดูรูป", url: url }]
  ]};
  const txt = `🚨 <b>ตรวจพบงานไม่ผ่าน</b>\n📄 ไฟล์: ${fn}\n📌 หมวด: ${cat}\n❌ สาเหตุ: ${reason}`;
  console.log(`Sending Fail Notify to TG (${TELEGRAM_TARGET_ID}) for file: ${fn}`);
  callTG("sendMessage", { chat_id: TELEGRAM_TARGET_ID, text: txt, parse_mode: "HTML", reply_markup: tgKb });
}

function analyzeAI(file) {
  const b64 = Utilities.base64Encode(file.getBlob().getBytes());
  const promptText = `Analyze this Telecom site photo very carefully.
  1. IDENTIFY: What is in the photo? (e.g. Battery Bank, Rectifier Cabinet, Cable Management, Site Label, Grounding Bar).
  2. QUALITY CHECK: Does it look professionally installed? 
     - Check for: Label clarity, cable neatness, secure mounting, and overall cleanliness.
  3. DECIDE: Set status to PASS if it looks correct, or FAIL if there are visible issues.
  4. REASON: If FAIL, explain exactly what is wrong in THAI language.
  
  MANDATORY JSON OUTPUT:
  {
    "sheetReference": "Category Name Here",
    "status": "PASS or FAIL",
    "reason": "Thai explanation here"
  }`;

  const payload = { 
    "model": "meta-llama/llama-4-scout-17b-16e-instruct", 
    "messages": [{ 
      "role": "user", 
      "content": [
        { "type": "text", "text": promptText }, 
        { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${b64}` } }
      ] 
    }], 
    "response_format": { "type": "json_object" } 
  };

  let lastError = "";
  for (let i = 0; i < GROQ_KEYS.length; i++) {
    const apiKey = GROQ_KEYS[i];
    try {
      const res = UrlFetchApp.fetch(GROQ_AI_URL, { 
        method: "post", 
        headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" }, 
        payload: JSON.stringify(payload), 
        muteHttpExceptions: true 
      });

      const contentText = res.getContentText();
      const responseCode = res.getResponseCode();

      if (responseCode === 200) {
        const json = JSON.parse(contentText);
        if (!json.choices || !json.choices[0] || !json.choices[0].message) {
          lastError = "AI Response Missing Content";
          continue;
        }

        let content = json.choices[0].message.content;
        if (content.includes("```")) {
          content = content.replace(/```json/g, "").replace(/```/g, "").trim();
        }
        
        try {
          const aiResponse = JSON.parse(content);
          // Validate required fields
          if (!aiResponse.status || !aiResponse.sheetReference) {
            lastError = "AI JSON missing fields: " + content.substring(0, 50);
            continue;
          }
          console.log(`AI Success for ${file.getName()}: ${aiResponse.status}`);
          return aiResponse;
        } catch(e) {
          lastError = "JSON Parse Error: " + content.substring(0, 50);
          continue;
        }
      } else if (responseCode === 429) {
        lastError = "Rate Limit (Key " + (i + 1) + ")";
        continue;
      } else {
        try {
          const errJson = JSON.parse(contentText);
          lastError = "API " + responseCode + ": " + (errJson.error?.message || contentText).substring(0, 100);
        } catch(e) {
          lastError = "API Error: HTTP " + responseCode;
        }
        continue;
      }
    } catch (e) {
      lastError = "System Error (Key " + (i + 1) + "): " + e.toString().substring(0, 100);
      continue;
    }
  }

  return { status: "ERROR", reason: lastError || "All API keys failed" };
}

// =========================================================================
// === [HELPER UTILS] ===
// =========================================================================

function processImage(platform, uid, cid, mid) {
  const props = PropertiesService.getScriptProperties();
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
    if (sheet.getLastRow() > 5000) { sheet.deleteRows(2, 500); }
  } catch (e) {}
}

function clearUser(uid) {
  const props = PropertiesService.getScriptProperties();
  const keys = [uid + "_s", uid + "_p", uid + "_t", uid + "_site"];
  for (let k of keys) props.deleteProperty(k);
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
function callTG(m, p) { 
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${m}`;
  const res = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify(p), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    console.error(`TG API Error (${m}): ${res.getContentText()}`);
  } else {
    console.log(`TG API Success (${m})`);
  }
  return res;
}
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

function processManualApprove(fid, cid) {
  try {
    const file = DriveApp.getFileById(fid);
    const fileName = file.getName();
    
    // 1. Update Sheet: Status to PASS (Approved) and Green highlight
    const rowData = updateSheetStatus(fid, "PASS (Approved โดยแอดมิน)", "#98fb98"); 
    
    if (rowData) {
      const category = rowData[2]; // Column C: sheetReference
      
      // 2. Move File to the correct category folder (removing FAIL_ prefix)
      moveFileToApproved(file, category);
      
      // 3. Update File Description to avoid re-processing and record approval
      file.setDescription("PASS (Approved by Admin) | " + file.getDescription());
      
      // 4. Notify Technician (Feedback Loop)
      notifyTechnician(file, fileName);
      
      sendTG(cid, `✅ อนุมัติสำเร็จ: <b>${fileName}</b>\nสถานะถูกเปลี่ยนเป็น PASS ใน Google Sheet แล้ว`, ["ส่งงาน"]);
    } else {
      sendTG(cid, "❌ ไม่พบข้อมูลไฟล์นี้ใน Google Sheet ไม่สามารถดำเนินการต่อได้", ["ส่งงาน"]);
    }
  } catch (e) {
    console.error("Error in processManualApprove: " + e.toString());
    sendTG(cid, "⚠️ เกิดข้อผิดพลาด: " + e.toString(), ["ส่งงาน"]);
  }
}

function processManualReject(fid, cid) { 
  try {
    const file = DriveApp.getFileById(fid);
    updateSheetStatus(fid, "FAIL (Rejected โดยแอดมิน)", "#ffcccb"); // Light Red
    sendTG(cid, `❌ ปฏิเสธการอนุมัติสำหรับไฟล์: <b>${file.getName()}</b>`, ["ส่งงาน"]); 
  } catch(e){
    sendTG(cid, "❌ ปฏิเสธการอนุมัติแล้ว (ไม่พบไฟล์)", ["ส่งงาน"]);
  }
}

/**
 * Updates status and background color in Google Sheet based on File ID
 */
function updateSheetStatus(fid, newStatus, color) {
  const ss = getSpreadsheet();
  if (!ss) return null;
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return null;
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][6] === fid) { // Column G is index 6
      sheet.getRange(i + 1, 4).setValue(newStatus); // Column D is index 4
      sheet.getRange(i + 1, 1, 1, sheet.getLastColumn()).setBackground(color);
      return data[i]; // Return row data for category info
    }
  }
  return null;
}

/**
 * Moves file from FAIL_category to category subfolder
 */
function moveFileToApproved(file, category) {
  try {
    const currentFolder = file.getParents().next(); // Should be FAIL_category
    const siteFolder = currentFolder.getParents().next(); // Should be Site name folder
    const destFolder = getOrCreateSubFolder(siteFolder, category);
    file.moveTo(destFolder);
  } catch (e) {
    console.error("Error moving file: " + e.toString());
  }
}

/**
 * Identifies the technician and sends an approval notification
 */
function notifyTechnician(file, fileName) {
  const desc = file.getDescription() || "";
  const match = desc.match(/UPLOADER:(LINE|TG)_(\S+)/);
  if (match) {
    const platform = match[1];
    const uid = match[2];
    const msg = `🎉 แจ้งเตือนจาก PM: รูปภาพไซต์งานของคุณ (${fileName}) ที่ AI เคยประเมินไม่ผ่าน ได้รับการตรวจและ Approved โดยทีมงานเรียบร้อยแล้วครับ!`;
    
    if (platform === "LINE") {
      sendMsg(uid, msg);
    } else {
      // For Telegram, if it's a private chat ID, we can send it directly
      if (!uid.startsWith("-")) {
        sendTG(uid, msg);
      }
    }
  }
}

// =========================================================================
// === [MAINTENANCE & KILL SWITCH] ===
// =========================================================================

function FIX_WEBHOOK() {
  const url = WEB_APP_URL || ScriptApp.getService().getUrl();
  if (!url) return "❌ Please deploy as Web App first!";
  const res = UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${url}&drop_pending_updates=true`);
  return "✅ Webhook set: " + url + "\nResult: " + res.getContentText();
}

function MASTER_CLEANUP_AND_RESET() {
  const ts = ScriptApp.getProjectTriggers();
  for (let t of ts) ScriptApp.deleteTrigger(t);
  PropertiesService.getScriptProperties().deleteAllProperties();
  const url = WEB_APP_URL || ScriptApp.getService().getUrl();
  let res = "N/A";
  if (url) {
    res = UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${url}&drop_pending_updates=true`).getContentText();
  }
  return "✅ ALL TRIGGERS DELETED\n✅ PROPERTIES CLEARED\n✅ WEBHOOK RESET: " + res;
}
