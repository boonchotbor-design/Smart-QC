// =========================================================================
// === การตั้งค่าระบบ (CONFIGURATIONS) - V.16 (Stable & Clean) ===
// =========================================================================

// 1. Google Drive & Sheets
const FOLDER_ID = "1W0o5cNuejntiY7v9__f4LiAH3BH-bNpA"; 
const ARCHIVE_FOLDER_ID = "1dYRMNaTQsQfxsS-4z9GaWMIA3gQHq6h7"; 
const SHEET_NAME = "Dashboard"; 

// 2. LINE Config (เคลียร์ให้เหลือเฉพาะบอท Inspector2 เพื่อป้องกัน Error)
const LINE_BOTS = [
  {
    NAME: "บอทตัวที่ 2 (Inspector2)",
    TOKEN: "CnFH9VFWVp7HttiDfE56k2lCZ6aUlnETSKL9yA6Oj5f3Gb1lP6iR6CPGiEdz/8BNJUHtDcDU51y+K+o83fNoEkeKROSQ74PMlCuTErmr4clyWjzAWD27z/SQfFtYz3ALQ2+TqU06ZVoD7ASnbwD3NwdB04t89/1O/w1cDnyilFU=",
    TARGET_GROUP: "C5a1893cfbad69376b46bb90b0829019e" 
  }
];
const ENABLE_LINE_NOTIFY = true; 

// 3. Telegram Config
const TELEGRAM_BOT_TOKEN = "8625222790:AAHjU70oWGm88NyUaXaWIDJveo3b2KpnG90"; 
const TELEGRAM_TARGET_ID = "7378939928"; 

// 4. Groq API Keys (Llama 4)
const GROQ_API_KEYS = [
  "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",
  "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",
  "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",
  "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"
];

// 5. หมวดหมู่ PAT
const PAT_CATEGORIES = ["2.3(M16)","2.3(M17)","2.3(M19-A1)","2.3(M19-A2)","2.3(M20.1-Ant1)","2.3(M20.2-Ant1)","2.3(M20.1-Ant2)","2.3(M20.2-Ant2)","2.3(M20.1-Ant3)","2.3(M20.2-Ant3)","2.3(M20.1-Ant4)","2.3(M20.2-Ant4)","2.3(M22-GND BAR)","2.3(M22-MST GND)","2.3(M24-GND DCDU)","2.3(M24-GND DCDU (2))","2.3(M22-GND-RRU)","2.3(M24-RRU view S 1st)","2.3(M24-RRU view S 2nd)","2.3(M24-RRU view S 3th)","2.3(M24-RRU view S 4th)","2.3(M24-Add card 1)","2.3(M24-add card 2)","2.3(M26-DCDU socket ตามระบุ)","2.3(M24-DC-RRU 1st)","2.3(M25 RRU1-Clamp-RET)","2.3(M24-DC-RRU 2nd)","2.3(M25 RRU2-clamp-RET)","2.3(M24-DC-AAU 2nd)","2.3(M25 AAU2-Clamp-RET)","2.3(M24-DC-RRU 4th)","2.3(M25 RRU4-Clamp-RET)","2.3(M23-inlet-outlet)","2.3(M23-inlet-outlet (2))","2.3(M27)Ladder","2.3(M27)-J-Loop","2.3(M30-Krone 1-2)","2.3(M30-GPS)","2.3(M32-rec C1-3)","2.3(M30 C1)","2.3(M30 C2)","2.3(M32) BreakerC1-3","2.3(M32)DCDU","2.3(M32) LED-load","Notch CPRI","No.POE+Clean (1)","Remote Site","2.4-BOQ","dismantle"];

// =========================================================================
// === Webhook Receiver ===
// =========================================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // 1. ป้องกันการประมวลผลซ้ำจาก Telegram Webhook Retry
    if (data.update_id) {
      const cache = CacheService.getScriptCache();
      const lockKey = "tg_upd_" + data.update_id;
      if (cache.get(lockKey)) return ContentService.createTextOutput("OK"); // ถ้าเคยประมวลผลแล้วให้ข้ามเลย
      cache.put(lockKey, "1", 60); // บันทึกไว้ 60 วินาที
    }

    if (data.events && data.events.length > 0) return handleLineWebhook(data.events[0]);
    if (data.update_id) return handleTelegramWebhook(data);
    return ContentService.createTextOutput("OK");
  } catch (error) { return ContentService.createTextOutput("Error"); }
}

function handleLineWebhook(event) {
  const replyToken = event.replyToken;
  const userId = event.source.userId;
  const groupId = event.source.groupId || event.source.roomId || userId;

  if (event.type === 'postback') {
    if (event.postback.data.startsWith("apprv|LINE|")) processManualApprove(event.postback.data.split("|")[2], "LINE", replyToken);
    else if (event.postback.data.startsWith("reject|LINE|")) processManualReject(event.postback.data.split("|")[2], "LINE", replyToken);
  } else if (event.type === 'message') {
    if (event.message.type === 'text') {
      const text = event.message.text.trim();
      if (text === "ขอไอดี") sendMsg("LINE", replyToken, `ไอดีของกลุ่ม LINE นี้คือ:\n${groupId}`, []);
      else processUserTextCommand("LINE", userId, replyToken, text);
    }
    if (event.message.type === 'image') processUserImage("LINE", userId, replyToken, event.message.id, event.source.groupId != null);
  }
  return ContentService.createTextOutput("OK");
}

function handleTelegramWebhook(data) {
  if (data.callback_query) {
    const cb = data.callback_query;
    if (cb.data.startsWith("apprv|TG|")) processManualApprove(cb.data.split("|")[2], "TG", cb.message.chat.id);
    else if (cb.data.startsWith("reject|TG|")) processManualReject(cb.data.split("|")[2], "TG", cb.message.chat.id);
    UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, { method: 'post', payload: { callback_query_id: cb.id } });
  } else if (data.message) {
    const msg = data.message; const chatId = msg.chat.id; const userId = msg.from.id;
    if (msg.text) {
      const text = msg.text.trim();
      if (text === "ขอไอดี" || text === "ไอดีกลุ่ม" || text === "ไอดี") sendMsg("TG", chatId, `ไอดีกลุ่ม Telegram นี้คือ:\n${chatId}`, []);
      else processUserTextCommand("TG", userId, chatId, text);
    }
    if (msg.photo) processUserImage("TG", userId, chatId, msg.photo[msg.photo.length - 1].file_id, chatId < 0);
  }
  return ContentService.createTextOutput("OK");
}

function processUserTextCommand(platform, userId, destId, text) {
  const cache = CacheService.getScriptCache(); 
  const uid = platform + "_" + userId;
  let userState = cache.get(uid + "_state") || "IDLE";

  if (text === "ยกเลิก" || text === "จบงาน" || text === "เสร็จแล้ว") {
    cache.remove(uid + "_state");
    cache.remove(uid + "_project");
    cache.remove(uid + "_type");
    cache.remove(uid + "_site");
    if (text === "ยกเลิก") {
      sendMsg(platform, destId, "❌ ยกเลิกรายการเรียบร้อยครับ", []);
    } else {
      ScriptApp.newTrigger('runPatInspectorNow').timeBased().after(1000).create();
      sendMsg(platform, destId, "✅ รับทราบครับ! สั่ง AI เริ่มตรวจงานทันที\n(เมื่อตรวจครบทุกรูป บอทจะแจ้งสรุปให้ทราบครับ)", []);
    }
    return;
  }

  if (text === "ส่งงาน" || text === "อัพโหลด") {
    cache.put(uid + "_state", "WAITING_PROJECT", 900);
    sendMsg(platform, destId, "กรุณาเลือก Project ครับ 🏗️", ["HAE", "TME", "HAB", "TMT", "ยกเลิก"]);
    return;
  }

  if (userState === "WAITING_PROJECT") {
    cache.put(uid + "_project", text, 900);
    cache.put(uid + "_state", "WAITING_TYPE", 900);
    sendMsg(platform, destId, `📁 โปรเจกต์: ${text}\nเลือกประเภทงานต่อไปครับ ⚡`, ["MBB", "POWER", "ยกเลิก"]);
    return;
  }

  if (userState === "WAITING_TYPE") {
    cache.put(uid + "_type", text, 900);
    cache.put(uid + "_state", "WAITING_SITE", 900);
    sendMsg(platform, destId, `⚡ ประเภท: ${text}\nกรุณาพิมพ์รหัส Site ครับ 🏢`, ["ยกเลิก"]);
    return;
  }
  if (userState === "WAITING_SITE") {
    cache.put(uid + "_site", text, 900); cache.put(uid + "_state", "WAITING_PHOTO", 1800);
    let folder = getOrCreateSubFolder(DriveApp.getFolderById(FOLDER_ID), `${cache.get(uid+"_project")}_${cache.get(uid+"_type")}_${text}`);
    sendMsg(platform, destId, `✅ โฟลเดอร์พร้อม!\n🔗 ส่งใน Drive: ${folder.getUrl()}\n📸 หรือทยอยส่งรูปลงในแชทนี้ได้เลยครับ (เสร็จแล้วพิมพ์ 'จบงาน')`, []);
  }
}

function processUserImage(platform, userId, destId, mediaId, isGroup) {
  const cache = CacheService.getScriptCache(); const uid = platform + "_" + userId;
  if (cache.get(uid + "_state") === "WAITING_PHOTO") {
    const lock = LockService.getScriptLock();
    if (lock.tryLock(5000)) {
      try {
        let folder = getOrCreateSubFolder(DriveApp.getFolderById(FOLDER_ID), `${cache.get(uid+"_project")}_${cache.get(uid+"_type")}_${cache.get(uid+"_site")}`);
        let blob = platform === "LINE" ? getLineImage(mediaId) : getTelegramImage(mediaId);
        folder.createFile(blob).setName(`${cache.get(uid+"_site")}_${Date.now()}.jpg`).setDescription(`UPLOADER:${platform}_${userId}`);
        if(platform === "LINE") sendMsg(platform, destId, `📥 รับรูปแล้วครับ`, []);
      } finally { lock.releaseLock(); }
    }
  } else if (!isGroup) sendMsg(platform, destId, "⚠️ กรุณาพิมพ์คำว่า 'ส่งงาน' เพื่อเริ่มกระบวนการก่อนนะครับ", []);
}

function sendMsg(platform, target, text, quick) {
  if (platform === "LINE") {
    const isReplyToken = !target.startsWith("U") && !target.startsWith("C") && !target.startsWith("R");
    let payload = isReplyToken ? { "replyToken": target, "messages": [{ "type": "text", "text": text }] } : { "to": target, "messages": [{ "type": "text", "text": text }] };
    if (quick && quick.length > 0) payload.messages[0].quickReply = { "items": quick.map(o => ({ "type": "action", "action": { "type": "message", "label": o, "text": o } })) };
    if (!ENABLE_LINE_NOTIFY && !isReplyToken) return; 

    if (!isReplyToken) {
      let config = LINE_BOTS.find(b => b.TARGET_GROUP === target);
      if (config) {
        UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", { "method": "post", "headers": { "Content-Type": "application/json", "Authorization": "Bearer " + config.TOKEN }, "payload": JSON.stringify(payload), "muteHttpExceptions": true });
      } else {
        for (let b of LINE_BOTS) {
          let r = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", { "method": "post", "headers": { "Content-Type": "application/json", "Authorization": "Bearer " + b.TOKEN }, "payload": JSON.stringify(payload), "muteHttpExceptions": true });
          if (r.getResponseCode() === 200) break;
        }
      }
    } else {
      for (let b of LINE_BOTS) {
        let r = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", { "method": "post", "headers": { "Content-Type": "application/json", "Authorization": "Bearer " + b.TOKEN }, "payload": JSON.stringify(payload), "muteHttpExceptions": true });
        if (r.getResponseCode() === 200) break;
      }
    }
  } else {
    let payload = { "chat_id": target, "text": text };
    if (quick && quick.length > 0) payload.reply_markup = { "keyboard": [quick.map(o => ({ text: o }))], "resize_keyboard": true, "one_time_keyboard": true };
    UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true });
  }
}

function getLineImage(id) { 
  for (let b of LINE_BOTS) {
    try {
      let res = UrlFetchApp.fetch(`https://api-data.line.me/v2/bot/message/${id}/content`, { headers: { Authorization: "Bearer " + b.TOKEN }, muteHttpExceptions: true });
      if (res.getResponseCode() === 200) return res.getBlob();
    } catch(e) {}
  }
  throw new Error("Cannot load LINE image");
}

function getTelegramImage(id) {
  const path = JSON.parse(UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${id}`)).result.file_path;
  return UrlFetchApp.fetch(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${path}`).getBlob();
}

// =========================================================================
// === AI Logic: Groq Vision (ตรวจรูปภาพ) ===
// =========================================================================

function runPatInspectorNow() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let t of triggers) {
    if (t.getHandlerFunction() === 'runPatInspectorNow') ScriptApp.deleteTrigger(t);
  }
  runPatInspector(); 
}

function runPatInspector() {
  const startTime = Date.now();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if(sheet.getLastRow() === 0) sheet.appendRow(["วันที่", "ชื่อไฟล์", "Sheet อ้างอิง", "ผลประเมิน", "หมายเหตุ/เหตุผล", "ลิงก์รูปภาพ"]);

  const sourceFolder = DriveApp.getFolderById(FOLDER_ID);
  const mainArchive = DriveApp.getFolderById(ARCHIVE_FOLDER_ID);

  const files = getAllFiles(sourceFolder);
  
  let countPass = 0;
  let countFail = 0;
  let currentSite = "";

  for (let file of files) {
    if (Date.now() - startTime > 270000) break; 
    if (file.getDescription() && file.getDescription().includes("PAT_CHECKED")) continue;
    if (!file.getMimeType().startsWith("image/")) continue;

    try {
      const parentName = file.getParents().hasNext() ? file.getParents().next().getName() : "Unknown_Site";
      currentSite = parentName;
      
      const aiResult = analyzeImageWithGroq(file);
      const status = aiResult.status.toUpperCase();
      const category = aiResult.sheetReference;

      sheet.appendRow([new Date(), file.getName(), category, status, aiResult.reason, file.getUrl()]);

      let siteArchiveFolder = getOrCreateSubFolder(mainArchive, parentName);
      if (status === "PASS") {
        countPass++;
        let catFolder = getOrCreateSubFolder(siteArchiveFolder, category);
        file.moveTo(catFolder);
      } else {
        countFail++;
        let failFolder = getOrCreateSubFolder(siteArchiveFolder, "FAIL_" + category);
        file.moveTo(failFolder);
        sendFailNotify(file.getName(), category, aiResult.reason, file.getUrl(), file.getId());
      }
      file.setDescription((file.getDescription() || "") + "\nPAT_CHECKED: " + status);
    } catch (e) {
      if(e.message.includes("429")) break; 
    }
    Utilities.sleep(2000); 
  }

  if (countPass + countFail > 0) {
    const summaryText = `✅ <b>AI ตรวจสอบเสร็จสิ้น!</b>\n🏢 Site: ${currentSite}\n📊 สรุปผลประเมิน:\n🟢 ผ่าน: ${countPass} รูป\n🔴 ไม่ผ่าน: ${countFail} รูป\n\nตรวจสอบรายละเอียดได้ที่ Google Sheet ครับ`;
    
    try {
      UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, { "method": "post", "contentType": "application/json", "payload": JSON.stringify({"chat_id": TELEGRAM_TARGET_ID, "text": summaryText, "parse_mode": "HTML"}), "muteHttpExceptions": true });
    } catch(e) {}

    if (ENABLE_LINE_NOTIFY) {
      for (let b of LINE_BOTS) {
        UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", { "method": "post", "headers": {"Authorization": "Bearer " + b.TOKEN, "Content-Type": "application/json"}, "payload": JSON.stringify({"to": b.TARGET_GROUP, "messages": [{"type": "text", "text": summaryText.replace(/<b>|<\/b>/g, "")}]}), "muteHttpExceptions": true });
      }
    }
  }
}

function analyzeImageWithGroq(file) {
  const blob = file.getBlob();
  const base64Data = Utilities.base64Encode(blob.getBytes());
  const mimeType = blob.getContentType() || "image/jpeg";
  const randomKey = GROQ_API_KEYS[Math.floor(Math.random() * GROQ_API_KEYS.length)];
  const prompt = `คุณคือผู้เชี่ยวชาญตรวจสอบงานติดตั้ง Site AIS (PAT Inspector) จงตรวจสอบรูปภาพนี้และตอบกลับเป็น JSON เท่านั้น 
  โดยในส่วนของ "reason" ให้เขียนอธิบายเป็นภาษาไทยที่ถูกต้องตามหลักไวยากรณ์ มีสระและวรรณยุกต์ครบถ้วน
  ตอบกลับในรูปแบบ JSON นี้เท่านั้น: {"sheetReference": "ชื่อหมวดหมู่", "status": "PASS หรือ FAIL", "reason": "เหตุผลสั้นๆ"}`;

  const payload = {
    "model": "meta-llama/llama-4-scout-17b-16e-instruct", 
    "messages": [{ "role": "user", "content": [{ "type": "text", "text": prompt }, { "type": "image_url", "image_url": { "url": `data:${mimeType};base64,${base64Data}` } }] }],
    "temperature": 0.1
  };

  const response = UrlFetchApp.fetch("https://api.groq.com/openai/v1/chat/completions", { 
    "method": "post", 
    "headers": { 
      "Authorization": "Bearer " + randomKey, 
      "Content-Type": "application/json; charset=utf-8" 
    }, 
    "payload": JSON.stringify(payload), 
    "muteHttpExceptions": true 
  });
  
  if (response.getResponseCode() !== 200) throw new Error("Groq Error: " + response.getContentText("UTF-8"));
  
  const result = JSON.parse(response.getContentText("UTF-8"));
  const content = result.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(content);
}

function sendFailNotify(fileName, cat, reason, url, fileId) {
  const flex = { "type": "flex", "altText": "🚨 งานไม่ผ่านเกณฑ์", "contents": { "type": "bubble", "body": { "type": "box", "layout": "vertical", "contents": [ {"type": "text", "text": "🚨 ตรวจพบงานไม่ผ่าน", "weight": "bold", "color": "#FF0000", "size": "md"}, {"type": "text", "text": "ไฟล์: " + fileName, "wrap": true, "size": "xs", "margin": "md"}, {"type": "text", "text": "หมวด: " + cat, "wrap": true, "size": "xs", "weight": "bold"}, {"type": "text", "text": "สาเหตุ: " + reason, "wrap": true, "size": "xs", "color": "#666666"} ]}, "footer": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": [ { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [ {"type": "button", "style": "primary", "color": "#28a745", "action": {"type": "postback", "label": "✅ อนุมัติ", "data": "apprv|LINE|" + fileId}}, {"type": "button", "style": "primary", "color": "#dc3545", "action": {"type": "postback", "label": "❌ ไม่อนุมัติ", "data": "reject|LINE|" + fileId}} ] }, {"type": "button", "style": "link", "action": {"type": "uri", "label": "🔍 ดูรูป", "uri": url}} ] } } };
  for (let b of LINE_BOTS) {
    UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", { "method": "post", "headers": {"Authorization": "Bearer " + b.TOKEN, "Content-Type": "application/json"}, "payload": JSON.stringify({"to": b.TARGET_GROUP, "messages": [flex]}), "muteHttpExceptions": true });
  }
  const tgText = `🚨 <b>งานไม่ผ่านเกณฑ์</b>\n📁 ไฟล์: ${fileName}\n📌 หมวด: ${cat}\n❌ สาเหตุ: ${reason}\n<a href="${url}">คลิกดูรูป</a>`;
  UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, { "method": "post", "contentType": "application/json", "payload": JSON.stringify({ "chat_id": TELEGRAM_TARGET_ID, "text": tgText, "parse_mode": "HTML", "reply_markup": { "inline_keyboard": [[{"text": "✅ อนุมัติ", "callback_data": "apprv|TG|" + fileId}, {"text": "❌ ไม่อนุมัติ", "callback_data": "reject|TG|" + fileId}]] } }), "muteHttpExceptions": true });
}

function processManualApprove(fileId, adminPlatform, replyId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const currentDesc = file.getDescription() || "";
    file.setDescription(currentDesc.replace("FAIL", "PASS (Manual Approved)"));
    const parentFolder = file.getParents().next();
    const siteFolder = parentFolder.getParents().next();
    const catName = parentFolder.getName().replace("FAIL_", "");
    const targetFolder = getOrCreateSubFolder(siteFolder, catName);
    file.moveTo(targetFolder);
    updateSheetToManual(file.getName(), "PASS");
    sendMsg(adminPlatform, replyId, `✅ อนุมัติรูป ${file.getName()} แล้ว!`, []);
  } catch (e) {}
}

function processManualReject(fileId, adminPlatform, replyId) {
  try {
    const file = DriveApp.getFileById(fileId);
    updateSheetToManual(file.getName(), "FAIL");
    sendMsg(adminPlatform, replyId, `❌ แอดมินยืนยันให้รูป ${file.getName()} ตก (Reject) แล้ว!`, []);
  } catch (e) {}
}

function getOrCreateSubFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function getAllFiles(folder) {
  let files = [];
  const rootFiles = folder.getFiles();
  while (rootFiles.hasNext()) files.push(rootFiles.next());
  const subFolders = folder.getFolders();
  while (subFolders.hasNext()) {
    const subFiles = subFolders.next().getFiles();
    while (subFiles.hasNext()) files.push(subFiles.next());
  }
  return files;
}

function updateSheetToManual(fName, actionType) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME); if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === fName) { 
      if (actionType === "PASS") {
        sheet.getRange(i+1,4).setValue("PASS"); 
        sheet.getRange(i+1,5).setValue("Approved by Admin"); 
        sheet.getRange(i+1,4,1,2).setBackground("#d9ead3");
      } else {
        sheet.getRange(i+1,4).setValue("FAIL"); 
        sheet.getRange(i+1,5).setValue(data[i][4] + "\n[Rejected by Admin]"); 
        sheet.getRange(i+1,4,1,2).setBackground("#f4cccc");
      }
      break; 
    }
  }
}

// =========================================================================
// === Telegram Connection Helpers (ส่วนที่เพิ่มใหม่) ===
// =========================================================================

/**
 * 1. ฟังก์ชันสำหรับตั้งค่า Webhook (เพื่อให้ Telegram ส่งข้อมูลมาที่สคริปต์นี้)
 * วิธีใช้: Deploy เป็น Web App ก่อน -> ก๊อป URL มาใส่ -> แล้วกดรันฟังก์ชันนี้
 */
function setTelegramWebhook() {
  const webAppUrl = "https://script.google.com/macros/s/AKfycby8508Svp_9NnjClKZT7j0drOZL80l6FAEzcoEW-5Tab_IYKU4ydSwO-ZX1iD3vPpR7Tg/exec"; 
  const url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/setWebhook?url=" + webAppUrl;
  
  const response = UrlFetchApp.fetch(url);
  Logger.log("Webhook Set Result: " + response.getContentText());
  
  if (webAppUrl === "ใส่_URL_Web_App_ที่ได้จากการ_Deploy_ที่นี่") {
    Browser.msgBox("⚠️ อย่าลืมใส่ URL Web App ของคุณในฟังก์ชัน setTelegramWebhook ก่อนรันนะครับ!");
  } else {
    Browser.msgBox("ผลการตั้งค่า: " + response.getContentText());
  }
}

/**
 * 2. ฟังก์ชันทดสอบการเชื่อมต่อ Telegram
 */
function testTelegram() {
  try {
    const text = "🔔 ทดสอบการเชื่อมต่อ Telegram Bot API Success! ✅";
    const payload = { "chat_id": TELEGRAM_TARGET_ID, "text": text };
    UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage", { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true });
    Browser.msgBox("ส่งข้อความทดสอบแล้ว! กรุณาตรวจสอบในกลุ่ม Telegram (ID: " + TELEGRAM_TARGET_ID + ")");
  } catch (e) {
    Browser.msgBox("Error: " + e.toString());
  }
}

/**
 * 3. ฟังก์ชันสำหรับเรียกดูข้อมูลบอท (เช่น Chat ID ล่าสุดที่มีคนทักมา)
 */
function getTelegramUpdates() {
  const url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/getUpdates";
  const response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
  Browser.msgBox("ตรวจสอบผลลัพธ์ที่ Logger (กด Ctrl + Enter หรือ View -> Logs)");
}