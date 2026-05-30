/*
 * 🚀 Inventory Smart System - V.6.5.7
 * Focus: Correct Column Mapping (No, DUID, Region, IN/OUT, Type, Date, Bill, Model, Code, Desc, Qty, Serial, Owners, Locations)
 */

var SPREADSHEET_ID = '1afmWjTNetqHNT69k-jzB3mAdTsFaRdodlJ1hJaJfpSQ';
var ROOT_FOLDER_ID = '1IKefCE5rhBAoyM0uQBTLvEkPlRUm6lD_'; 
var NODE_JS_WEBHOOK_URL = 'https://vipcode-ai-inspector-yhfn.vercel.app/notify'; 

function doGet(e) {
  if (!e || !e.parameter) return HtmlService.createHtmlOutput("Please access via Web App URL");
  if (e.parameter.duid) {
    var result = searchByDuidOnly(e.parameter.duid);
    if (e.parameter.format === "text") return ContentService.createTextOutput(result.formattedText || "❌ Not found");
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createTemplateFromFile('app').evaluate()
      .setTitle('Inventory Smart App V.6.5.8')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function saveMainData(header, items) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
    if (!header || !items) return { success: false, message: "❌ ข้อมูลไม่สมบูรณ์" };
    
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var customer = (header.customer || "AIS").toString().trim().toUpperCase();
    var sheetName = "INOUT_HW_" + customer; 
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: "❌ ไม่พบหน้า Sheet: " + sheetName };

    var cleanDuid = String(header.duid || "").trim();
    var cleanBill = String(header.billNo || "").trim();
    
    // Check if DUID is already Closed
    if (isDuidClosed(cleanDuid, customer)) return { success: false, message: "❌ DUID: " + cleanDuid + " สถานะเป็น 'Closed' แล้ว" };

    var dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    
    // ลำดับคอลัมน์ตามผู้ใช้แจ้ง:
    // A:No, B:DUID, C:Region, D:IN/OUT, E:Type, F:Date, G:Bill, H:Model, I:Code, J:Desc, K:Qty, L:Serial, M:OwnerW, N:OwnerR, O:LocW, P:LocR
    var allRows = items.map(function(item, index) { 
      var row = new Array(22).fill("");
      row[0] = index + 1; // A: No (Run number 1-xx สำหรับรายการนี้)
      row[1] = cleanDuid; // B: DUID
      row[2] = String(header.region || "").trim(); // C: Region
      row[3] = String(header.type || "").trim(); // D: IN/OUT
      row[4] = String(item.type || "").trim(); // E: Type
      row[5] = dateStr; // F: Pick up Date
      row[6] = cleanBill; // G: Bill No.
      row[7] = String(item.model || "").trim(); // H: Model
      row[8] = String(item.code || "").trim(); // I: Item Code
      row[9] = String(item.desc || "").trim(); // J: Item Description
      row[10] = Number(item.qty) || 0; // K: Sum of Req.Qty
      row[11] = String(item.sn || "").trim(); // L: Serial
      row[12] = String(header.ownerWarehouse || "").trim(); // M: Owner warehouse
      row[13] = String(header.ownerReceiver || "").trim(); // N: Owner Receiver
      row[14] = String(header.locationWarehouse || "").trim(); // O: Location warehouse
      row[15] = String(header.locationReceiver || "").trim(); // P: Location Receiver
      return row;
    });
    
    var lastRow = sheet.getLastRow();
    if (allRows.length > 0) {
      sheet.getRange(lastRow + 1, 1, allRows.length, 22).setValues(allRows);
      SpreadsheetApp.flush(); 
      
      var rowAfter = sheet.getLastRow();
      if (rowAfter === lastRow) {
        allRows.forEach(function(r) { sheet.appendRow(r); });
        SpreadsheetApp.flush();
        rowAfter = sheet.getLastRow();
      }
      
      updateDuidStatus(cleanDuid, customer);
      return { 
        success: true, 
        debug: "✅ บันทึกสำเร็จ (V.6.5.8)\n📍 Sheet: " + sheetName + "\n🔢 แถวที่: " + (lastRow + 1) + " ถึง " + rowAfter
      };
    }
    return { success: false, message: "❌ ไม่มีข้อมูลรายการสินค้า" };
  } catch (e) { 
    return { success: false, message: "❌ ระบบขัดข้อง: " + e.toString() }; 
  } finally {
    lock.releaseLock();
  }
}

function updateDuidStatus(duid, customer) {
  try {
    if (!duid) return;
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName("INOUT_HW_" + customer);
    if (!sheet) return;
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return;
    var h = data[0].map(v => String(v||"").toUpperCase());
    
    // อ้างอิงตามลำดับใหม่
    var idx = { 
      duid: h.indexOf("DUID"), // ควรเป็น 1
      type: h.indexOf("IN/OUT"), // ควรเป็น 3
      qty: h.indexOf("SUM OF REQ.QTY"), // ควรเป็น 10
      status: 21 // Col V
    };
    if (idx.duid === -1) idx.duid = 1; if (idx.type === -1) idx.type = 3; if (idx.qty === -1) idx.qty = 10;
    if (h.indexOf("STATUS") === -1) sheet.getRange(1, 22).setValue("STATUS");
    
    var totalIn = 0, totalOut = 0, matchingRows = [], target = duid.trim();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idx.duid]).trim() === target) {
        matchingRows.push(i + 1);
        var type = String(data[i][idx.type]).toUpperCase(), qty = Number(data[i][idx.qty]) || 0;
        if (type.indexOf("IN") > -1 || type === "RETURN" || type === "DISMANTLE") totalIn += qty;
        else if (type.indexOf("OUT") > -1) totalOut += qty;
      }
    }
    var status = (totalIn > 0 && totalIn === totalOut) ? "Closed" : (totalIn > 0 ? "On Process" : "Pending");
    if (matchingRows.length > 0) {
      var statusData = sheet.getRange(1, 22, data.length, 1).getValues();
      matchingRows.forEach(r => { if (statusData[r-1]) statusData[r-1][0] = status; });
      sheet.getRange(1, 22, data.length, 1).setValues(statusData);
    }
  } catch (e) {}
}

function getBOMData(customer) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var res = [];
    var s = ss.getSheetByName(customer === "AIS" ? "BOM AIS" : "BOM TRUE");
    if (s) {
      var lastRow = s.getLastRow();
      if (lastRow < 2) return [];
      var d = s.getRange(2, 1, lastRow - 1, 4).getValues();
      for (var i = 0; i < d.length; i++) {
        if (d[i][1]) res.push({ type: String(d[i][0]), model: String(d[i][1]), code: String(d[i][2]), desc: String(d[i][3]) });
      }
    }
    return res;
  } catch (e) { return []; }
}

function getProjectData() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var s = ss.getSheetByName("data");
    if (!s) return [];
    var lastRow = s.getLastRow();
    if (lastRow < 2) return [];
    var d = s.getRange(2, 1, lastRow - 1, 3).getValues();
    var res = [];
    for (var i = 0; i < d.length; i++) {
      if (d[i][0]) res.push({ duid: String(d[i][0]).trim(), region: String(d[i][2]).trim() });
    }
    return res;
  } catch (e) { return []; }
}

function getOwnerData() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var ws=[], rs=[];
    var sheets = ss.getSheets();
    sheets.forEach(function(s){
      var name = s.getName();
      if (name.indexOf("INOUT") > -1 || name === "data") {
        var lastRow = s.getLastRow();
        if (lastRow < 2) return;
        var startRow = Math.max(2, lastRow - 500); 
        var numRows = lastRow - startRow + 1;
        var data = s.getRange(startRow, 1, numRows, s.getLastColumn()).getValues();
        var h = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0].map(h => String(h||"").toUpperCase());
        var wCol = Math.max(h.indexOf("OWNER WAREHOUSE"), h.indexOf("OWNER WAREHOUSE "));
        var rCol = Math.max(h.indexOf("OWNER RECEIVER"), h.indexOf("OWNER RECEIVER "));
        for (var i = 0; i < data.length; i++) {
          if (wCol > -1 && data[i][wCol]) ws.push(String(data[i][wCol]));
          if (rCol > -1 && data[i][rCol]) rs.push(String(data[i][rCol]));
        }
      }
    });
    return { warehouses: [...new Set(ws)].sort(), receivers: [...new Set(rs)].sort() };
  } catch(e) { return {warehouses:[], receivers:[]}; }
}

function isDuidClosed(duid, customer) {
  try {
    if (!duid) return false;
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName("INOUT_HW_" + customer);
    if (!sheet) return false;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return false;
    var data = sheet.getRange(1, 1, lastRow, 22).getValues();
    var h = data[0].map(v => String(v||"").toUpperCase());
    var dCol = h.indexOf("DUID"), sCol = 21;
    if (dCol === -1) dCol = 1;
    var target = duid.trim().toLowerCase();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][dCol]).trim().toLowerCase() === target && String(data[i][sCol]).trim().toUpperCase() === "CLOSED") return true;
    }
  } catch (e) {}
  return false;
}

function uploadPhotoOnly(h, b, p) { 
  try { 
    var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var regF = getOrCreateSubFolder(root, (h.region || "NoRegion")), duidF = getOrCreateSubFolder(regF, (h.duid || "NoDUID"));
    var typeFolderName = (h.type || "OTHER").toString().replace("/", "_"), typeF = getOrCreateSubFolder(duidF, typeFolderName);
    var fileName = typeFolderName + "_" + (h.billNo || "NoBill") + "_" + new Date().getTime() + "_" + p + ".jpg"; 
    var blob = Utilities.newBlob(Utilities.base64Decode(b.split(',')[1]), "image/jpeg", fileName); 
    typeF.createFile(blob); 
    return { success: true, folderUrl: duidF.getUrl() };
  } catch (e) { return { success: false, error: e.toString() }; } 
}

function getOrCreateSubFolder(parent, name) { 
  var folderName = name.toString().trim(), iter = parent.getFoldersByName(folderName); 
  while (iter.hasNext()) { var folder = iter.next(); if (!folder.isTrashed()) return folder; }
  return parent.createFolder(folderName); 
}

function notifyOnly(h, i) { 
  var payload = { header: h, items: i }, opt = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true }; 
  UrlFetchApp.fetch(NODE_JS_WEBHOOK_URL, opt); 
  return { success: true }; 
}

function searchByBillNo(b, c) { return { success: false }; }
function searchByDuidOnly(d) { return { success: false }; }
