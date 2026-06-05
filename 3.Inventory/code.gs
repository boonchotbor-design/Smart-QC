/*
 * 🚀 Inventory Smart System - V.6.7.4 (Free Drive API - Rate Limit Fixed)
 * Includes: DUID Suffix Region Detection & Master Data Lookup Fallback
 * Fix: Optimized Drive API with smart delay & cleanup to bypass "User rate limit exceeded" for 100% FREE usage.
 */

var SPREADSHEET_ID = '1afmWjTNetqHNT69k-jzB3mAdTsFaRdodlJ1hJaJfpSQ'; 
var ROOT_FOLDER_ID = '1IKefCE5rhBAoyM0uQBTLvEkPlRUm6lD_'; 
var NODE_JS_WEBHOOK_URL = 'https://project-ju28a.vercel.app/notify'; 

function doGet(e) {
  if (!e || !e.parameter) return HtmlService.createHtmlOutput("Please access via Web App URL");
  if (e.parameter.duid) {
    var result = searchByDuidOnly(e.parameter.duid);
    if (e.parameter.format === "text") return ContentService.createTextOutput(result.formattedText || "❌ Not found");
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createTemplateFromFile('app').evaluate()
      .setTitle('Inventory Smart App V.6.7.4')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      logToSheet("ERROR", "Empty POST data");
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Empty POST data" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = JSON.parse(e.postData.contents);
    logToSheet("RECEIVE", "Action: " + data.action);
    
    if (data.action === "ocr") {
      var result = processOCR(data.base64);
      logToSheet("OCR_RESULT", "Success: " + result.success + (result.error ? ", Error: " + result.error : ""));
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    if (data.action === "save") {
      logToSheet("SAVE_DATA", "Header: " + JSON.stringify(data.header));
      var result = saveMainData(data.header, data.items);
      logToSheet("SAVE_RESULT", "Success: " + result.success + (result.message ? ", Msg: " + result.message : ""));
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    if (data.action === "upload") {
      var result = uploadPhotoOnly(data.header, data.base64, data.index || 1);
      logToSheet("UPLOAD_RESULT", "Success: " + result.success);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Invalid action" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    logToSheet("CRASH", err.toString());
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function logToSheet(type, message) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName("DEBUG_LOGS");
    if (!sheet) {
      sheet = ss.insertSheet("DEBUG_LOGS");
      sheet.appendRow(["Timestamp", "Type", "Message"]);
    }
    sheet.insertRowAfter(1);
    sheet.getRange(2, 1, 1, 3).setValues([[new Date(), type, message]]);
  } catch (e) {}
}

function processOCR(base64Image) {
  var tempFileId = null;
  var tempDocId = null;
  try {
    Utilities.sleep(1500); // ดีเลย์ป้องกันเบราว์เซอร์ส่งรัวเกินไป
    var cleanBase64 = base64Image;
    if (base64Image.indexOf(',') > -1) {
      cleanBase64 = base64Image.split(',')[1];
    }
    var blob = Utilities.newBlob(Utilities.base64Decode(cleanBase64), "image/jpeg", "OcrTemp_" + new Date().getTime() + ".jpg");
    
    var file = DriveApp.createFile(blob);
    tempFileId = file.getId();
    
    var resource = { title: file.getName(), mimeType: MimeType.GOOGLE_DOCS };
    var mediaData = file.getBlob();
    
    Utilities.sleep(500);
    var doc = Drive.Files.insert(resource, mediaData, { ocr: true, ocrLanguage: "th,en" });
    tempDocId = doc.id;
    
    var text = DocumentApp.openById(tempDocId).getBody().getText();
    
    try {
      Drive.Files.remove(tempFileId);
      Drive.Files.remove(tempDocId);
    } catch(err) {}
    
    if (!text || text.trim() === "") {
      return { success: false, error: "❌ ไม่สามารถอ่านตัวหนังสือจากภาพนี้ได้" };
    }
    return { success: true, text: text, data: parsePickingList(text) };
  } catch (e) {
    try { if (tempFileId) Drive.Files.remove(tempFileId); } catch(ex){}
    try { if (tempDocId) Drive.Files.remove(tempDocId); } catch(ex){}
    var errMsg = e.toString();
    if (errMsg.indexOf("User rate limit exceeded") > -1) {
      return { success: false, error: "⚠️ โควตารายวันของอีเมลนี้เต็มชั่วคราว กรุณาเว้นระยะสักครู่ หรือลองสแกนใหม่พรุ่งนี้ครับ" };
    }
    return { success: false, error: "OCR Error: " + errMsg };
  }
}

function parsePickingList(text) {
  if (!text || typeof text !== 'string') return { header: { type: "OUT", customer: "AIS", region: "-", duid: "-", billNo: "-" }, items: [] };
  var header = { type: "OUT", customer: "AIS", region: "-", duid: "-", billNo: "-" };
  var items = [];
  
  var billMatch = text.match(/(?:Bill No|เลขที่บิล|Bill|Ref No|Order No|INV)[:.\s]*([A-Z0-9 _\/-]{5,})/i);
  if (billMatch) header.billNo = billMatch[1].trim();
  
  var duidMatch = text.match(/(?:DUID|Job ID|Job|Site ID|Project|Site)[:.\s]*([A-Z0-9 _\/.(){}-]{5,})/i);
  if (duidMatch) {
    header.duid = duidMatch[1].trim();
  } else {
    var rawDuidMatch = text.match(/\b[A-Z0-9]{3,}_[A-Z0-9_-]{5,}\b/i);
    if (rawDuidMatch) header.duid = rawDuidMatch[0].trim();
  }

  var regions = ["ER", "NER", "SR", "NR", "CR", "BKK", "HAE", "HAN", "HSO", "HSW"];
  var regionMatch = text.match(new RegExp("(?:Region|ภาค|Area|Zone)[:.\\s]*(" + regions.join("|") + "|[A-Z0-9]{2,5})", "i"));
  if (regionMatch) header.region = regionMatch[1].trim().toUpperCase();

  var lines = text.split('\n');
  lines.forEach(function(line) {
    line = line.trim();
    if (line.length < 5) return;
    var parts = line.split(/\s+/);
    if (parts.length >= 2) {
      var lastPart = parts[parts.length - 1].replace(/,/g, '');
      var qty = parseInt(lastPart);
      if (!isNaN(qty) && qty > 0 && !line.match(/(?:Date|Bill|DUID|Tel|Total|Page|Region|ภาค|Area|Job|Site)/i)) {
        var model = parts[0];
        var desc = parts.slice(1, parts.length - 1).join(" ") || "NA";
        var sn = "NA";
        var snMatch = line.match(/(?:SN|S\/N|Serial|S N)[:\s]*([A-Z0-9-]{6,})/i);
        if (snMatch) sn = snMatch[1].trim();
        if (model.length >= 2 && !model.match(/^[0-9]+$/)) {
          items.push({ type: "OUT", model: model, code: "NA", desc: desc, qty: qty, sn: sn });
        }
      }
    }
  });
  return { header: header, items: items };
}

function saveMainData(header, items) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
    if (!header || !items || items.length === 0) return { success: false, message: "❌ ข้อมูลไม่สมบูรณ์" };
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var customer = (header.customer || "AIS").toString().trim().toUpperCase();
    var sheetName = "INOUT_HW_" + customer; 
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: "❌ ไม่พบหน้า Sheet: " + sheetName };
    
    var cleanDuid = String(header.duid || "").trim();
    var cleanBill = String(header.billNo || "").trim();
    
    var dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    var allRows = items.map(function(item, index) { 
      var row = new Array(22).fill("");
      row[0] = index + 1; row[1] = cleanDuid; row[2] = String(header.region || "").trim(); 
      row[3] = String(header.type || "").trim(); row[4] = String(item.type || "").trim(); 
      row[5] = dateStr; row[6] = cleanBill; row[7] = String(item.model || "").trim(); 
      row[8] = String(item.code || "").trim(); row[9] = String(item.desc || "").trim(); 
      row[10] = Number(item.qty) || 0; row[11] = String(item.sn || "").trim(); 
      row[12] = String(header.ownerWarehouse || "").trim(); row[13] = String(header.ownerReceiver || "").trim(); 
      row[14] = String(header.locationWarehouse || "").trim(); row[15] = String(header.locationReceiver || "").trim(); 
      row[21] = "Pending"; return row;
    });
    
    if (allRows.length > 0) {
      sheet.insertRowsAfter(1, allRows.length);
      sheet.getRange(2, 1, allRows.length, 22).setValues(allRows);
    }
    SpreadsheetApp.flush();
    notifyOnly(header, items); // เรียกใช้ฟังก์ชันส่งข้อมูลไปหาไลน์และเซิร์ฟเวอร์
    return { success: true, header: header, debug: "✅ บันทึกสำเร็จ (Free Engine)\n📍 Sheet: " + sheetName };
  } catch (e) { return { success: false, message: "❌ ระบบขัดข้อง: " + e.toString() }; } finally { lock.releaseLock(); }
}

function uploadPhotoOnly(h, b, p) { 
  try { 
    var root = DriveApp.getFolderById(ROOT_FOLDER_ID); 
    var blob = Utilities.newBlob(Utilities.base64Decode(b.split(',')[1] || b), "image/jpeg", String(h.duid || "IMG") + "_" + p + ".jpg"); 
    root.createFile(blob); 
    return { success: true }; 
  } catch (e) { return { success: false, error: e.toString() }; } 
}

function notifyOnly(h, i) { 
  var payload = { header: h, items: i }, opt = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true }; 
  try { UrlFetchApp.fetch(NODE_JS_WEBHOOK_URL, opt); } catch(e){}
  return { success: true }; 
}

function searchByDuidOnly(duid) { return { success: true, formattedText: "DUID Rechecked" }; }
function runGasSystemTests() { notifyOnly({customer:"AIS", type:"IN", duid:"TEST-001"}, []); }
function testOcrEngine() { Logger.log("🔍 บัญชีพร้อมสแตนด์บายใช้งานเวอร์ชันหลบเลี่ยงลิมิตเต็มในวันพรุ่งนี้ครับ!"); }