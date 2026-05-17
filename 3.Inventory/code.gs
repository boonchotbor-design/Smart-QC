/*
 * 🚀 Inventory Smart System - MASTER VERSION 6.4.2
 * รวมฟีเจอร์: บันทึกแยกส่วน + Progress Bar + ค้นหา Model จากทุก Sheet (Cascading Dropdown) + จัด Folder เป็นระเบียบ
 */

var SPREADSHEET_ID = '1afmWjTNetqHNT69k-jzB3mAdTsFaRdodlJ1hJaJfpSQ';
var LINE_ACCESS_TOKEN = 'eZe15XyurA2eFNBEjeMJ1PNG3lEiujNpzJ01GGarnoq7GFaYDqBttYZk0BHHh7KE5ZOaQdNJUdmhoCc+UoXxqmT1CdHZ7KHUWr7XACo1VY4ezEZpWVHuzufGydzTBOWnVgEgcksIJQDFeQrL3dvkUQdB04t89/1O/w1cDnyilFU=';
var LINE_DESTINATIONS = ['Cb4baf5e474773f54f2b6538e4cd4d9ac', 'U110afe8872d7f73074e56c457df2859']; 
var ROOT_FOLDER_ID = '1164j34sS24xhE-iM9b2r2spMFg7N3_sh';

function doGet(e) {
  return HtmlService.createTemplateFromFile('app').evaluate()
      .setTitle('Inventory Smart App V.6.4.2')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// --- 1. ดึงข้อมูล BOM และ Model จากทุก Sheet ที่เกี่ยวข้อง ---
function getBOMData(customer) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var results = [];
    var sheetsToSearch = [
      customer === "AIS" ? "BOM AIS" : "BOM TRUE",    // Sheet มาสเตอร์
      customer === "AIS" ? "data AIS" : "data TRUE",  // Sheet ข้อมูลเดินบัญชี
      "INOUT_HW_" + customer                           // Sheet ประวัติเดิม
    ];
    
    sheetsToSearch.forEach(function(sName) {
      var sheet = ss.getSheetByName(sName);
      if (!sheet) return;
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (sName.indexOf("BOM") > -1 || sName.indexOf("data") > -1) {
          if (data[i][1]) {
            results.push({
              type: String(data[i][0] || "OTHER").trim(),
              model: String(data[i][1] || "").trim(),
              code: String(data[i][2] || "").trim(),
              desc: String(data[i][3] || "").trim()
            });
          }
        } else if (sName.indexOf("INOUT") > -1) {
          if (data[i][7]) {
            results.push({
              type: String(data[i][4] || "OTHER").trim(),
              model: String(data[i][7] || "").trim(),
              code: String(data[i][8] || "").trim(),
              desc: String(data[i][9] || "").trim()
            });
          }
        }
      }
    });

    var seen = {};
    return results.filter(function(item) {
      var key = (item.type + "|" + item.model + "|" + item.code).toLowerCase();
      if (!item.model || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  } catch (e) { return []; }
}

// --- 2. บันทึกข้อมูลลง Spreadsheet ---
function saveMainData(header, items) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var customer = (header.customer || "AIS").toString().trim().toUpperCase();
    var sheetName = "INOUT_HW_" + customer;
    var sheet = ss.getSheetByName(sheetName) || ss.getSheets()[0];
    var dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    
    var colA = sheet.getRange("A1:A").getValues();
    var actualLastRow = 0;
    for (var i = 0; i < colA.length; i++) {
      if (colA[i][0] !== "") actualLastRow = i + 1;
      else if (i < colA.length - 1 && colA[i+1][0] === "") break;
    }
    if (actualLastRow < 1) actualLastRow = 1;
    
    var nextRow = actualLastRow + 1;
    var lastNo = actualLastRow > 1 ? (parseInt(sheet.getRange(actualLastRow, 1).getValue()) || 0) : 0;

    var allRows = items.map(function(item, index) {
      return [
        lastNo + index + 1, header.duid || "", header.region || "", header.type || "", 
        item.type || "", dateStr, header.billNo || "", item.model || "", 
        item.code || "", item.desc || "", item.qty || 1, item.sn || "", 
        header.ownerWarehouse || "", header.ownerReceiver || "",
        "", "", "", "", ""
      ];
    });

    if (allRows.length > 0) sheet.getRange(nextRow, 1, allRows.length, 19).setValues(allRows);
    SpreadsheetApp.flush();
    return { success: true, message: "✅ บันทึกสำเร็จที่แถว " + nextRow };
  } catch (e) { return { success: false, message: "❌ Error: " + e.toString() }; }
}

// --- 3. อัปโหลดรูปภาพ (โครงสร้าง Region > DUID > Type) ---
function uploadPhotoOnly(h, base64, pNum) { 
  try { 
    var root = DriveApp.getFolderById(ROOT_FOLDER_ID); 
    
    // ชั้นที่ 1: Region
    var regionName = (h.region || "NoRegion").toString().trim();
    var regF = getOrCreateSubFolder(root, regionName); 
    
    // ชั้นที่ 2: DUID
    var duidName = (h.duid || "NoDUID").toString().trim();
    var duidF = getOrCreateSubFolder(regF, duidName); 
    
    // ชั้นที่ 3: Type (งาน)
    var typeFolderName = h.type.toString().trim().replace("/", "_");
    var typeF = getOrCreateSubFolder(duidF, typeFolderName); 
    
    // ตั้งชื่อไฟล์รูป
    var fileName = typeFolderName + "_" + (h.billNo || "NoBill").toString().trim() + "_" + new Date().getTime() + "_" + pNum + ".jpg"; 
    var blob = Utilities.newBlob(Utilities.base64Decode(base64.split(',')[1]), "image/jpeg", fileName); 
    
    typeF.createFile(blob); 
    return { success: true };
  } catch (e) { return { success: false, error: e.toString() }; } 
}

// --- 4. ส่งแจ้งเตือน Line ---
function notifyOnly(header, items) {
  try { sendLineNotification(header, items); return { success: true }; } catch (e) { return { success: false }; }
}

// ฟังก์ชันช่วยหา/สร้าง Folder โดยไม่ซ้ำ
function getOrCreateSubFolder(parent, name) { 
  var folderName = name.toString().trim();
  var iter = parent.getFoldersByName(folderName); 
  while (iter.hasNext()) { 
    var folder = iter.next(); 
    if (!folder.isTrashed()) return folder; 
  }
  return parent.createFolder(folderName); 
}

// --- ฟังก์ชันดึงข้อมูลอื่นๆ ---
function getProjectData() { try { var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var targetSheet = ss.getSheets().find(s => s.getSheetId() == 1568241517) || ss.getSheetByName("data"); if (!targetSheet) return []; var data = targetSheet.getDataRange().getValues(); var result = []; for (var i = 1; i < data.length; i++) { if (!data[i][0]) continue; result.push({ duid: String(data[i][0]).trim(), region: String(data[i][7] || "") }); } return result; } catch (e) { return []; } }
function getOwnerData() { try { var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var ws = [], rs = []; ss.getSheets().forEach(function(s){ if(s.getName().indexOf("INOUT")>-1 || s.getName()=="Inventory"){ var d=s.getDataRange().getValues(); for(var i=1;i<d.length;i++){ if(d[i][12]) ws.push(String(d[i][12]).trim()); if(d[i][13]) rs.push(String(d[i][13]).trim()); } } }); return { warehouses: [...new Set(ws)].sort(), receivers: [...new Set(rs)].sort() }; } catch (e) { return { warehouses: [], receivers: [] }; } }
function searchByBillNo(billNo, customer) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName("INOUT_HW_" + customer) || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    var results = { duid: "", region: "", ownerWarehouse: "", ownerReceiver: "", items: [] };
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (data[i][6] == billNo) { // Bill No อยู่ที่ Column G (Index 6)
        if (!found) {
          results.duid = data[i][1]; // B
          results.region = data[i][2]; // C
          results.ownerWarehouse = data[i][12]; // M
          results.ownerReceiver = data[i][13]; // N
          found = true;
        }
        results.items.push({
          type: data[i][4], // E (Item Type)
          model: data[i][7], // H
          code: data[i][8], // I
          desc: data[i][9], // J
          qty: data[i][10], // K
          sn: data[i][11] // L
        });
      }
    }
    
    if (found) return { success: true, data: results };
    return { success: false };
  } catch (e) { return { success: false, error: e.toString() }; }
}

function sendLineNotification(header, items) {
  var url = 'https://api.line.me/v2/bot/message/push';
  var dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
  
  var messageText = "📦 รายงาน Inventory (V.6.4.2)\n" +
                "━━━━━━━━━━━━━━━\n" +
                "👤 ลูกค้า: " + header.customer + "\n" +
                "🛠 งาน: " + header.type + "\n" +
                "📍 Region: " + header.region + "\n" +
                "🆔 DUID: " + header.duid + "\n" +
                "🏢 คลัง: " + (header.ownerWarehouse || "-") + "\n" +
                "👷 ผู้รับ: " + (header.ownerReceiver || "-") + "\n" +
                "━━━━━━━━━━━━━━━\n" +
                "📦 รายการสินค้า (" + items.length + " รายการ):\n";
  
  items.forEach(function(item, index) {
    messageText += "🔹 รายการที่ " + (index + 1) + ":\n" +
                   "• Type: " + item.type + "\n" +
                   "• Pick up Date: " + dateStr + "\n" +
                   "• Bill No: " + (header.billNo || "-") + "\n" +
                   "• Model: " + item.model + "\n" +
                   "• Item Code: " + item.code + "\n" +
                   "• Item Description: " + (item.desc || "-") + "\n" +
                   "• Sum of Req.Qty: " + item.qty + "\n" +
                   "• Serial: " + (item.sn || "-") + "\n";
    if (index < items.length - 1) messageText += "----------- \n";
  });
  
  messageText += "━━━━━━━━━━━━━━━\n" +
                "✅ บันทึกสำเร็จ!";

  LINE_DESTINATIONS.forEach(function(destId) {
    var payload = { to: destId, messages: [{ type: 'text', text: messageText }] };
    UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + LINE_ACCESS_TOKEN }, payload: JSON.stringify(payload), muteHttpExceptions: true });
  });
}

// --- 5. AI OCR Logic ---
function handleOCR(base64) {
  try {
    var blob = Utilities.newBlob(Utilities.base64Decode(base64.split(',')[1]), "image/jpeg", "ocr_temp.jpg");
    var resource = { title: blob.getName(), mimeType: blob.getContentType() };
    var tempFile = Drive.Files.insert(resource, blob, { ocr: true, ocrLanguage: "en,th" });
    
    var doc = DocumentApp.openById(tempFile.id);
    var text = doc.getBody().getText();
    
    // Clean up
    Drive.Files.remove(tempFile.id);
    
    return { success: true, data: parsePickingList(text) };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function parsePickingList(text) {
  var data = { billNo: "", duid: "", items: [] };
  
  // Regex patterns
  var billMatch = text.match(/Bill No[:\s]*(\d+)/i) || text.match(/เลขที่[:\s]*(\d+)/i) || text.match(/No\.?[:\s]*(\d+)/i);
  if (billMatch) data.billNo = billMatch[1];
  
  var duidMatch = text.match(/SPRYM_[\w\d_]+/i) || text.match(/DUID[:\s]*([\w\d_]+)/i);
  if (duidMatch) data.duid = duidMatch[0].replace("DUID:", "").trim();

  // Try to find items (Model/Code)
  // Example pattern: Model Name followed by Code (8-10 digits)
  var lines = text.split('\n');
  lines.forEach(function(line) {
    var codeMatch = line.match(/\b(\d{7,10})\b/); // Item code is usually 7-10 digits
    if (codeMatch) {
      // Find model name in the same line or nearby (very basic heuristic)
      var modelMatch = line.match(/[A-Z]{2,}\d+[A-Z\d]*/); 
      if (modelMatch) {
        data.items.push({
          model: modelMatch[0],
          code: codeMatch[1],
          qty: 1
        });
      }
    }
  });

  return data;
}
