/*
 * 🚀 Inventory Smart System - MASTER VERSION 5.9.6
 * ALL-IN-ONE: Web App + Telegram Bot + OCR AI + Utilities
 */

var SPREADSHEET_ID = '1afmWjTNetqHNT69k-jzB3mAdTsFaRdodlJ1hJaJfpSQ';
var TELEGRAM_BOT_TOKEN = '8585490322:AAHdjJHtn0tT84T-QEg5NLUUWymEkhBrtHk';

function doGet(e) {
  try {
    var template = HtmlService.createTemplateFromFile('app');
    return template.evaluate()
        .setTitle('Inventory Mobile App V.5.9.6')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return ContentService.createTextOutput("Critical System Error: " + err.toString());
  }
}

function saveMultiData(header, items) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheetName = header.customer === "AIS" ? "INOUT_HW_AIS" : "INOUT_HW_TRUE";
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw "ไม่พบแผ่นงานชื่อ " + sheetName;
    
    var dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");

    items.forEach(function(item) {
      var lastRow = sheet.getLastRow();
      var nextNo = lastRow > 0 ? (parseInt(sheet.getRange(lastRow, 1).getValue()) || 0) + 1 : 1;
      sheet.appendRow([
        nextNo, header.project || "", "", header.site || "", "", header.duid || "", 
        header.type || "", item.type || "", dateStr, header.billNo || "", item.model || "", item.code || "", item.desc || "", item.qty || 1, item.sn || ""
      ]);
    });
    return { success: true, message: "บันทึกเรียบร้อย " + items.length + " รายการ" };
  } catch (e) { 
    return { success: false, message: "เกิดข้อผิดพลาดในการบันทึก: " + e.toString() }; 
  }
}

function processImageOcr(base64Data) {
  try {
    if (!base64Data) throw "ข้อมูลรูปภาพว่างเปล่า";
    var parts = base64Data.split(',');
    if (parts.length < 2) throw "รูปแบบรูปภาพไม่ถูกต้อง";
    
    var contentType = parts[0].split(':')[1].split(';')[0];
    var decodedData = Utilities.base64Decode(parts[1]);
    var blob = Utilities.newBlob(decodedData, contentType);
    
    var resource = { 
      title: 'OCR_TEMP_' + new Date().getTime(),
      mimeType: contentType
    };
    
    // Drive API v2 - insert with OCR
    var file = Drive.Files.insert(resource, blob, { ocr: true, ocrLanguage: 'th,en' });
    
    if (!file || !file.id) throw "ไม่สามารถสร้างไฟล์ OCR ใน Google Drive ได้";
    
    var doc = DocumentApp.openById(file.id);
    var text = doc.getBody().getText();
    
    // Cleanup temporary file
    try { Drive.Files.remove(file.id); } catch(e) {}
    
    if (!text || text.trim().length === 0) throw "ไม่พบตัวหนังสือในรูปภาพ กรุณาถ่ายใบงานให้ชัดเจนขึ้น";
    
    return parsePickingList(text);
  } catch (e) { 
    throw "AI OCR Error: " + e.toString(); 
  }
}

function parsePickingList(text) {
  var result = {
    header: {
      billNo: (text.match(/DTH[0-9]{10,15}/) || [""])[0],
      site: (text.match(/Site:\s*([^\n]+)/i) || ["", ""])[1].trim(),
      project: (text.match(/Project:\s*([^\n]+)/i) || ["", ""])[1].trim(),
      duid: ""
    },
    items: []
  };
  
  var lines = text.split('\n');
  lines.forEach(function(line) {
    var itemMatch = line.match(/\b([A-Z0-9-]{8,15})\b/);
    if (itemMatch && !itemMatch[0].includes("DTH") && !itemMatch[0].includes("SITE") && !itemMatch[0].includes("PROJECT")) {
      var qtyMatch = line.match(/([0-9]+)\s*(PCS|M|SET)?/i);
      var type = "ANTENNA"; // Default
      if (line.match(/BBU/i)) type = "BBU";
      else if (line.match(/RRU/i)) type = "RRU";
      else if (line.match(/AAU/i)) type = "AAU";
      else if (line.match(/BOARD/i)) type = "BOARD";
      else if (line.match(/SFP/i)) type = "SFP";
      else if (line.match(/DCDU|DPU/i)) type = "DCDU/DPU";
      else if (line.match(/2x10/)) type = "Power Cable 2x10 sqmm.";
      else if (line.match(/2x6/)) type = "Power Cable 2x6 sqmm.";
      else if (line.match(/THWA.*25/i)) type = "THWA Gnd Cable 1x25 sqmm.";
      else if (line.match(/THWA.*16/i)) type = "THWA Gnd Cable 1x16 sqmm.";
      else if (line.match(/THW.*16/i)) type = "THW Gnd Cable 1x16 sqmm.";
      else if (line.match(/THW.*6/i)) type = "THW Gnd Cable 1x6 sqmm.";
      else if (line.match(/RG8/i)) type = "Cable RG8";
      else if (line.match(/GPS/i)) type = "GPS";
      
      result.items.push({ type: type, model: "", code: itemMatch[0], desc: "", qty: qtyMatch ? qtyMatch[1] : "1", sn: "" });
    }
  });
  return result;
}

/* --- TELEGRAM BOT --- */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.callback_query) { handleCallback(data.callback_query); return ContentService.createTextOutput("ok"); }
    var msg = data.message || data.edited_message;
    if (!msg) return ContentService.createTextOutput("ok");
    var chatId = msg.chat.id;
    var userId = msg.from.id;
    if (msg.photo || (msg.document && msg.document.mime_type && msg.document.mime_type.includes("image"))) {
      handleTelegramOCR(chatId, userId, msg);
    } else if (msg.text) {
      var text = msg.text.trim();
      if (text === "/start") sendMessage(chat_id, "ยินดีต้อนรับ! ส่งรูปภาพใบงานเพื่อบันทึก Inventory");
      else handleTextMessage(chatId, userId, text);
    }
  } catch (err) {}
  return ContentService.createTextOutput("ok");
}

function handleTelegramOCR(chatId, userId, msg) {
  sendMessage(chatId, "🔍 กำลังประมวลผล OCR...");
  try {
    var fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.document.file_id;
    var fileRes = UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/getFile?file_id=" + fileId);
    var blob = UrlFetchApp.fetch("https://api.telegram.org/file/bot" + TELEGRAM_BOT_TOKEN + "/" + JSON.parse(fileRes.getContentText()).result.file_path).getBlob();
    var resource = { name: "temp", title: "temp", mimeType: "image/jpeg" };
    var file = Drive.Files.insert(resource, blob, { ocr: true });
    var text = DocumentApp.openById(file.id).getBody().getText();
    Drive.Files.remove(file.id);
    var ocrData = parsePickingList(text);
    var firstItem = ocrData.items.length > 0 ? ocrData.items[0] : { code: "", type: "BOT", qty: "1" };
    var data = { customer: text.includes("AIS") ? "AIS" : "TRUE", type: "IN", duid: ocrData.header.billNo, project: ocrData.header.project, site: ocrData.header.site, itemCode: firstItem.code, itemType: firstItem.type, serial: "", qty: firstItem.qty };
    askConfirmation(chatId, userId, data);
  } catch (e) { sendMessage(chatId, "OCR Error: " + e.toString()); }
}

function handleTextMessage(chatId, userId, text) {
  var p = text.split(/\s+/).filter(function(x) { return x.length > 0; });
  if (p.length < 8) return sendMessage(chatId, "❌ ข้อมูลไม่ครบ (ต้องมี 8 ส่วน)");
  askConfirmation(chatId, userId, { customer: p[0].toUpperCase(), type: p[1].toUpperCase(), duid: p[2], project: p[3], site: p[4], itemCode: p[5], serial: p[6], qty: p[7], itemType: "MANUAL" });
}

function askConfirmation(chatId, userId, data) {
  CacheService.getScriptCache().put("pending_" + userId, JSON.stringify(data), 600);
  var summary = "🏢: " + data.customer + "\n🔄: " + data.type + "\n🆔: " + data.duid + "\n📁: " + data.project + "\n📍: " + data.site + "\n📦: " + data.itemType + " (" + data.itemCode + ")\n🔢: " + data.serial + "\n🔢: " + data.qty;
  UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage", { method: "post", contentType: "application/json", payload: JSON.stringify({ chat_id: chatId, text: "ยืนยันข้อมูล:\n" + summary, reply_markup: { inline_keyboard: [[{ text: "✅ ยืนยัน", callback_data: "CONFIRM" }, { text: "❌ ยกเลิก", callback_data: "CANCEL" }]] } }) });
}

function handleCallback(query) {
  var userId = query.from.id;
  if (query.data === "CONFIRM") {
    var cached = CacheService.getScriptCache().get("pending_" + userId);
    if (cached) {
      var data = JSON.parse(cached);
      var result = saveToSheet({ customer: data.customer, project: data.project, site: data.site, duid: data.duid, type: data.type, itemType: data.itemType || "BOT", billNo: "TELEGRAM", itemCode: data.itemCode, qty: data.qty, serial: data.serial, model: "", desc: "" });
      if (result.success) {
        sendMessage(query.message.chat.id, "✅ " + result.message);
      } else {
        sendMessage(query.message.chat.id, "❌ " + result.message);
      }
    }
  } else { 
    sendMessage(query.message.chat.id, "❌ ยกเลิกรายการ"); 
  }
}

function saveToSheet(d) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheetName = d.customer === "AIS" ? "INOUT_HW_AIS" : "INOUT_HW_TRUE";
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw "ไม่พบแผ่นงานชื่อ " + sheetName;

    var dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    var lastRow = sheet.getLastRow();
    var nextNo = lastRow > 0 ? (parseInt(sheet.getRange(lastRow, 1).getValue()) || 0) + 1 : 1;
    sheet.appendRow([nextNo, d.project || "", "", d.site || "", "", d.duid || "", d.type || "", d.itemType || "", dateStr, d.billNo || "", d.model || "", d.itemCode || "", d.desc || "", d.qty || "1", d.serial || ""]);
    return { success: true, message: "บันทึกข้อมูลเรียบร้อย!" };
  } catch (e) { 
    return { success: false, message: "Error: " + e.toString() }; 
  }
}

function sendMessage(id, txt) { UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage", { method: "post", contentType: "application/json", payload: JSON.stringify({ chat_id: id, text: txt }) }); }
