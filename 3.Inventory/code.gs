/*
 * 🚀 Inventory Smart Scanner System (Ultimate Version 5.2)
 * FIXED: Removed all // comments to prevent "Flattening/White Screen" bugs.
 * ADDED: Camera scan buttons for both Item Code and SN.
 * IMPROVED: Robust OCR parsing for Picking Lists.
 */

var SPREADSHEET_ID = '1afmWjTNetqHNT69k-jzB3mAdTsFaRdodlJ1hJaJfpSQ';
var TELEGRAM_BOT_TOKEN = '8585490322:AAHdjJHtn0tT84T-QEg5NLUUWymEkhBrtHk';

function doGet(e) {
  try {
    return HtmlService.createTemplateFromFile('app').evaluate()
        .setTitle('Inventory Smart Scanner')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString());
  }
}

function processImageOcr(base64Data) {
  try {
    var parts = base64Data.split(',');
    var blob = Utilities.newBlob(Utilities.base64Decode(parts[1]), parts[0].split(':')[1].split(';')[0]);
    var resource = { name: 'OCR_TEMP', title: 'OCR_TEMP', mimeType: 'image/jpeg' };
    var file;
    try {
      file = Drive.Files.insert(resource, blob, { ocr: true, ocrLanguage: 'th,en' });
    } catch (e) {
      file = Drive.Files.create(resource, blob, { ocr: true });
    }
    var doc = DocumentApp.openById(file.id);
    var text = doc.getBody().getText();
    Drive.Files.remove(file.id);
    Logger.log("OCR Text: " + text);
    return parsePickingList(text);
  } catch (e) {
    throw "OCR Error: " + e.toString();
  }
}

function parsePickingList(text) {
  var lines = text.split('\n');
  var result = {
    header: {
      billNo: (text.match(/DTH[0-9]{10,15}/) || [""])[0],
      site: (text.match(/Site:\s*([^\n]+)/i) || ["", ""])[1].trim(),
      project: (text.match(/Project:\s*([^\n]+)/i) || ["", ""])[1].trim(),
    },
    items: []
  };
  lines.forEach(function(line) {
    var itemMatch = line.match(/\b([A-Z0-9-]{8,15})\b/);
    if (itemMatch && !itemMatch[0].includes("DTH") && !itemMatch[0].includes("SITE")) {
      var qtyMatch = line.match(/([0-9]+)\s*(PCS|M|SET)?/i);
      result.items.push({
        code: itemMatch[0],
        qty: qtyMatch ? qtyMatch[1] : "1",
        sn: ""
      });
    }
  });
  return result;
}

function saveMultiData(header, items) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheetName = header.customer === "AIS" ? "INOUT_HW_AIS" : "INOUT_HW_TRUE";
  var sheet = ss.getSheetByName(sheetName);
  var dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
  items.forEach(function(item) {
    var lastRow = sheet.getLastRow();
    var nextNo = lastRow > 0 ? (parseInt(sheet.getRange(lastRow, 1).getValue()) || 0) + 1 : 1;
    sheet.appendRow([nextNo, header.project, "", header.site, "", header.duid || header.billNo, header.type, item.type, dateStr, header.billNo, item.code, "", item.qty, item.sn]);
  });
  return "Success";
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.callback_query) { handleCallback(data.callback_query); return ContentService.createTextOutput("ok"); }
    var msg = data.message || data.edited_message;
    if (!msg) return ContentService.createTextOutput("ok");
    if (msg.photo || (msg.document && msg.document.mime_type && msg.document.mime_type.includes("image"))) {
      handleTelegramOCR(msg.chat.id, msg.from.id, msg);
    } else if (msg.text) {
      if (msg.text.trim() === "/start") sendMessage(msg.chat.id, "Ready!");
      else handleTextMessage(msg.chat.id, msg.from.id, msg.text.trim());
    }
  } catch (err) {}
  return ContentService.createTextOutput("ok");
}

function handleTelegramOCR(chatId, userId, msg) {
  try {
    var fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.document.file_id;
    var res = UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/getFile?file_id=" + fileId);
    var blob = UrlFetchApp.fetch("https://api.telegram.org/file/bot" + TELEGRAM_BOT_TOKEN + "/" + JSON.parse(res.getContentText()).result.file_path).getBlob();
    var resource = { name: "temp", title: "temp", mimeType: "image/jpeg" };
    var file;
    try { file = Drive.Files.insert(resource, blob, { ocr: true }); } catch (e) { file = Drive.Files.create(resource, blob, { ocr: true }); }
    var text = DocumentApp.openById(file.id).getBody().getText();
    Drive.Files.remove(file.id);
    var data = { customer: text.includes("AIS") ? "AIS" : "TRUE", type: "IN", duid: (text.match(/DTH[0-9]{10,15}/) || [""])[0], project: "", site: "", itemCode: "", serial: "", qty: "1" };
    askConfirmation(chatId, userId, data);
  } catch (e) { sendMessage(chatId, "OCR Error"); }
}

function handleTextMessage(chatId, userId, text) {
  var p = text.split(/\s+/).filter(function(x) { return x.length > 0; });
  if (p.length < 8) return sendMessage(chatId, "Incomplete data");
  askConfirmation(chatId, userId, { customer: p[0].toUpperCase(), type: p[1].toUpperCase(), duid: p[2], project: p[3], site: p[4], itemCode: p[5], serial: p[6], qty: p[7] });
}

function askConfirmation(chatId, userId, data) {
  CacheService.getScriptCache().put("pending_" + userId, JSON.stringify(data), 600);
  var summary = "🏢: " + data.customer + "\n🔄: " + data.type + "\n🆔: " + data.duid + "\n📁: " + data.project + "\n📍: " + data.site + "\n📦: " + data.itemCode + "\n🔢: " + data.serial + "\n🔢: " + data.qty;
  UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage", { method: "post", contentType: "application/json", payload: JSON.stringify({ chat_id: chatId, text: "Confirm:\n" + summary, reply_markup: { inline_keyboard: [[{ text: "✅ Yes", callback_data: "CONFIRM" }, { text: "❌ No", callback_data: "CANCEL" }]] } }) });
}

function handleCallback(query) {
  if (query.data === "CONFIRM") {
    var data = JSON.parse(CacheService.getScriptCache().get("pending_" + query.from.id) || "{}");
    saveToSheet(data);
    sendMessage(query.message.chat.id, "✅ Saved!");
  } else { sendMessage(query.message.chat.id, "❌ Cancelled"); }
}

function sendMessage(id, txt) { UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage", { method: "post", contentType: "application/json", payload: JSON.stringify({ chat_id: id, text: txt }) }); }
function setWebhook() { UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/setWebhook?url=" + ScriptApp.getService().getUrl()); }

function forceCleanupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var count = 0;
  sheets.forEach(function(s) { if (s.getName().indexOf("Form Responses") > -1) { try { ss.deleteSheet(s); count++; } catch (e) {} } });
  Browser.msgBox("Deleted " + count + " sheets.");
}
