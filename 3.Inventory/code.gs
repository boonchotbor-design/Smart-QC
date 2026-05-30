/*
 * 🚀 Inventory Smart System - V.6.6.3
 * Includes: OCR Support, Telegram Image Handling & Enhanced Notifications
 */

var SPREADSHEET_ID = '1afmWjTNetqHNT69k-jzB3mAdTsFaRdodlJ1hJaJfpSQ'; // ตรวจสอบว่า ID นี้ถูกต้องสำหรับ Sheet ของคุณ
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
      .setTitle('Inventory Smart App V.6.6.3')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === "ocr") {
      var result = processOCR(data.base64);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    if (data.action === "save") {
      var result = saveMainData(data.header, data.items);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Invalid action" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function processOCR(base64) {
  try {
    var blob = Utilities.newBlob(Utilities.base64Decode(base64), "image/jpeg", "ocr_temp.jpg");
    var resource = { title: 'ocr_temp', mimeType: 'image/jpeg' };
    var file = Drive.Files.insert(resource, blob, { ocr: true, ocrLanguage: 'en,th' });
    var doc = DocumentApp.openById(file.id);
    var text = doc.getBody().getText();
    Drive.Files.remove(file.id);
    return { success: true, text: text, data: parsePickingList(text) };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function parsePickingList(text) {
  if (!text || typeof text !== 'string') return { header: { type: "OUT", customer: "AIS", region: "-", duid: "-", billNo: "-" }, items: [] };
  
  var header = { type: "OUT", customer: "AIS", region: "-", duid: "-", billNo: "-" };
  var items = [];
  
  // 1. ค้นหา Bill No (รองรับหลายรูปแบบ)
  var billMatch = text.match(/(?:Bill No|เลขที่บิล|Bill|Ref No|Order No|INV)[:.\s]*([A-Z0-9 _\/-]+)/i);
  if (billMatch) header.billNo = billMatch[1].trim();
  
  // 2. ค้นหา DUID (รองรับรูปแบบยาวที่มีช่องว่างและอักขระพิเศษ)
  var duidMatch = text.match(/(?:DUID|Job ID|Job|Site ID|Project|Site)[:.\s]*([A-Z0-9 _\/.(){}-]{5,})/i);
  if (duidMatch) header.duid = duidMatch[1].trim();

  // 3. ค้นหา Region
  var regionMatch = text.match(/(?:Region|ภาค|Area)[:.\s]*([A-Z0-9]{2,5})/i);
  if (regionMatch) header.region = regionMatch[1].trim();

  // 4. ค้นหา รายการสินค้า (Flexible Parsing)
  var lines = text.split('\n');
  lines.forEach(function(line) {
    line = line.trim();
    if (line.length < 10) return; // ข้ามบรรทัดสั้นเกินไป
    
    // ตรวจสอบว่าบรรทัดนี้ลงท้ายด้วยตัวเลข (Quantity) หรือไม่
    var parts = line.split(/\s+/);
    if (parts.length >= 2) {
      var lastPart = parts[parts.length - 1].replace(/,/g, '');
      var qty = parseInt(lastPart);
      
      // ถ้าตัวสุดท้ายเป็นตัวเลข และบรรทัดนี้ไม่ใช่ Header
      if (!isNaN(qty) && qty > 0 && !line.match(/(?:Date|Bill|DUID|Tel|Total|Page)/i)) {
        // Model คือส่วนแรกของบรรทัด
        var model = parts[0];
        // Description คือส่วนที่เหลือ ยกเว้นตัวสุดท้าย
        var desc = parts.slice(1, parts.length - 1).join(" ") || "NA";
        
        // กรองเอาเฉพาะบรรทัดที่น่าจะเป็นสินค้าจริง (เช่น มีรหัสสินค้าหรือความยาวพอสมควร)
        if (model.length >= 3) {
          items.push({
            type: "OUT",
            model: model,
            code: "NA",
            desc: desc,
            qty: qty,
            sn: "NA"
          });
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
    if (isDuidClosed(cleanDuid, customer)) return { success: false, message: "❌ DUID: " + cleanDuid + " สถานะเป็น 'Closed' แล้ว" };
    var dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    var allRows = items.map(function(item, index) { 
      var row = new Array(22).fill("");
      row[0] = index + 1; // A: No
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
    
    if (allRows.length > 0) {
      sheet.insertRowsAfter(1, allRows.length);
      sheet.getRange(2, 1, allRows.length, 22).setValues(allRows);
    }
    
    SpreadsheetApp.flush(); 
    updateDuidStatus(cleanDuid, customer);
    return { success: true, debug: "✅ บันทึกสำเร็จ (V.6.6.3)\n📍 Sheet: " + sheetName + "\n🔢 บันทึกที่แถว: 2 (บนสุด)" };
  } catch (e) { return { success: false, message: "❌ ระบบขัดข้อง: " + e.toString() }; } finally { lock.releaseLock(); }
}

function searchByBillNo(billNo, customer) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheetName = "INOUT_HW_" + (customer || "AIS").toString().toUpperCase();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: "❌ ไม่พบหน้า Sheet: " + sheetName };
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: false, message: "❌ ไม่มีข้อมูลในระบบ" };
    
    var headerRow = data[0].map(h => String(h || "").trim().toUpperCase());
    var idx = {
      billNo: Math.max(headerRow.indexOf("BILL NO."), headerRow.indexOf("BILL NO")),
      duid: headerRow.indexOf("DUID"),
      region: headerRow.indexOf("REGION"),
      ownerW: headerRow.indexOf("OWNER WAREHOUSE"),
      ownerR: headerRow.indexOf("OWNER RECEIVER"),
      locW: headerRow.indexOf("LOCATION WAREHOUSE"),
      locR: headerRow.indexOf("LOCATION RECEIVER"),
      itemType: headerRow.indexOf("TYPE"),
      model: headerRow.indexOf("MODEL"),
      code: headerRow.indexOf("ITEM CODE"),
      desc: headerRow.indexOf("ITEM DESCRIPTION"),
      qty: Math.max(headerRow.indexOf("SUM OF REQ.QTY"), headerRow.indexOf("QTY")),
      sn: Math.max(headerRow.indexOf("SERIAL"), headerRow.indexOf("SN")),
      status: headerRow.indexOf("STATUS")
    };
    
    if (idx.billNo === -1) idx.billNo = 6;
    if (idx.duid === -1) idx.duid = 1;
    if (idx.region === -1) idx.region = 2;
    if (idx.itemType === -1) idx.itemType = 4;
    if (idx.model === -1) idx.model = 7;
    if (idx.code === -1) idx.code = 8;
    if (idx.desc === -1) idx.desc = 9;
    if (idx.qty === -1) idx.qty = 10;
    if (idx.sn === -1) idx.sn = 11;
    if (idx.ownerW === -1) idx.ownerW = 12;
    if (idx.ownerR === -1) idx.ownerR = 13;
    if (idx.locW === -1) idx.locW = 14;
    if (idx.locR === -1) idx.locR = 15;
    if (idx.status === -1) idx.status = 21;

    var targetBill = String(billNo || "").trim().toLowerCase();
    var results = { duid: "", region: "", ownerWarehouse: "", ownerReceiver: "", locationWarehouse: "", locationReceiver: "", items: [] };
    var found = false;

    for (var i = 1; i < data.length; i++) {
      var rowBill = String(data[i][idx.billNo] || "").trim().toLowerCase();
      if (rowBill === targetBill) {
        if (!found) {
          results.duid = String(data[i][idx.duid] || "");
          results.region = String(data[i][idx.region] || "");
          results.ownerWarehouse = String(data[i][idx.ownerW] || "");
          results.ownerReceiver = String(data[i][idx.ownerR] || "");
          results.locationWarehouse = String(data[i][idx.locW] || "");
          results.locationReceiver = String(data[i][idx.locR] || "");
          results.status = String(data[i][idx.status] || "");
          found = true;
        }
        results.items.push({
          type: String(data[i][idx.itemType] || ""),
          model: String(data[i][idx.model] || ""),
          code: String(data[i][idx.code] || ""),
          desc: String(data[i][idx.desc] || ""),
          qty: data[i][idx.qty] || 0,
          sn: String(data[i][idx.sn] || "")
        });
      }
    }
    return found ? { success: true, data: results } : { success: false, message: "❌ ไม่พบเลขบิล: " + billNo };
  } catch (e) { return { success: false, message: e.toString() }; }
}

function searchByDuidOnly(duid) {
  if (!duid) return { success: false, message: "❌ กรุณาระบุ DUID" };
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var targetSheets = ["INOUT_HW_AIS", "INOUT_HW_TRUE"];
    var groups = {}, found = false, totalItemsCount = 0, targetDuid = duid.toString().trim().toLowerCase(), currentStatus = "Pending";
    
    targetSheets.forEach(function(sName) {
      var sheet = ss.getSheetByName(sName);
      if (!sheet) return;
      var data = sheet.getDataRange().getValues();
      if (data.length < 2) return;
      
      var headerRow = data[0].map(h => String(h || "").trim().toUpperCase());
      var idx = {
        duid: headerRow.indexOf("DUID"),
        region: headerRow.indexOf("REGION"),
        transType: Math.max(headerRow.indexOf("IN/OUT"), headerRow.indexOf("WORK TYPE")),
        billNo: Math.max(headerRow.indexOf("BILL NO."), headerRow.indexOf("BILL NO")),
        model: headerRow.indexOf("MODEL"),
        sn: Math.max(headerRow.indexOf("SERIAL"), headerRow.indexOf("SN")),
        qty: Math.max(headerRow.indexOf("SUM OF REQ.QTY"), headerRow.indexOf("QTY")),
        ownerW: headerRow.indexOf("OWNER WAREHOUSE"),
        ownerR: headerRow.indexOf("OWNER RECEIVER"),
        locW: headerRow.indexOf("LOCATION WAREHOUSE"),
        locR: headerRow.indexOf("LOCATION RECEIVER"),
        status: headerRow.indexOf("STATUS")
      };
      
      // Fallback for standard indexes if headers not matched
      if (idx.duid === -1) idx.duid = 1;
      if (idx.region === -1) idx.region = 2;
      if (idx.transType === -1) idx.transType = 3;
      if (idx.billNo === -1) idx.billNo = 6;
      if (idx.model === -1) idx.model = 7;
      if (idx.qty === -1) idx.qty = 10;
      if (idx.sn === -1) idx.sn = 11;
      if (idx.ownerW === -1) idx.ownerW = 12;
      if (idx.ownerR === -1) idx.ownerR = 13;
      if (idx.locW === -1) idx.locW = 14;
      if (idx.locR === -1) idx.locR = 15;
      if (idx.status === -1) idx.status = 21;

      for (var i = 1; i < data.length; i++) {
        var sheetDuid = String(data[i][idx.duid] || "").trim().toLowerCase();
        if (sheetDuid === targetDuid) {
          if (data[i][idx.status]) currentStatus = String(data[i][idx.status]);
          var tType = String(data[i][idx.transType] || "").toUpperCase(), bNo = String(data[i][idx.billNo] || "-"), groupKey = tType + "|" + bNo + "|" + sName; 
          if (!groups[groupKey]) {
            groups[groupKey] = { header: { customer: sName.indexOf("TRUE") > -1 ? "TRUE" : "AIS", transType: tType, billNo: bNo, region: data[i][idx.region], duid: data[i][idx.duid], ownerWarehouse: data[i][idx.ownerW], ownerReceiver: data[i][idx.ownerR], locWarehouse: data[i][idx.locW], locReceiver: data[i][idx.locR] }, items: [] };
          }
          groups[groupKey].items.push({ model: data[i][idx.model] || "NA", sn: data[i][idx.sn] || "NA", qty: data[i][idx.qty] || 0 });
          totalItemsCount++; found = true;
        }
      }
    });

    if (!found) {
      var masterSheet = ss.getSheetByName("data");
      if (masterSheet) {
        var masterData = masterSheet.getDataRange().getValues();
        for (var i = 1; i < masterData.length; i++) {
          if (String(masterData[i][0]).trim().toLowerCase() === targetDuid) {
            return { 
              success: true, 
              formattedText: "📊 ข้อมูล DUID: " + masterData[i][0] + "\n━━━━━━━━━━━━━━━\n📍 สถานะ: ไม่มีการเคลื่อนไหว\n📍 Region: " + (masterData[i][2] || "-") + "\n━━━━━━━━━━━━━━━\n⚠️ ยังไม่มีประวัติการเบิก-รับสินค้าในระบบ" 
            };
          }
        }
      }
    }

    if (!found) return { success: false, message: "❌ ไม่พบข้อมูล DUID: " + duid };
    return { success: true, formattedText: formatDuidResponse(groups, totalItemsCount, currentStatus) };
  } catch (e) { return { success: false, message: "❌ ระบบขัดข้อง: " + e.toString() }; }
}

function formatDuidResponse(groups, totalItems, status) {
  var order = ["IN", "OUT", "STR/IN", "STR/OUT", "DISMANTLE", "RETURN"];
  var keys = Object.keys(groups).sort(function(a, b) {
    var gA = groups[a].header, gB = groups[b].header;
    var idxA = order.indexOf(gA.transType), idxB = order.indexOf(gB.transType);
    if (idxA !== idxB) return idxA - idxB;
    return String(gA.billNo).localeCompare(String(gB.billNo));
  });
  var sections = [], timestamp = Utilities.formatDate(new Date(), "GMT+7", "HH:mm:ss");
  keys.forEach(function(key) {
    var g = groups[key], h = g.header;
    var text = "📊 ข้อมูล DUID: " + h.duid + "\n" +
               "━━━━━━━━━━━━━━━\n" +
               "👤 ลูกค้า: " + h.customer + "\n" +
               "🛠 งาน: " + h.transType + "\n" +
               "bill No : " + (h.billNo === "-" ? "" : h.billNo) + "\n" +
               "📍 Region: " + (h.region || "-") + "\n" +
               "🆔 DUID: " + h.duid + "\n" +
               "🏢 คลัง: " + (h.ownerWarehouse || "-") + "\n" +
               "👷 ผู้รับ: " + (h.ownerReceiver || "-") + "\n" +
               "📍 Loc Warehouse: " + (h.locWarehouse || "-") + "\n" +
               "📍 Loc Receiver: " + (h.locReceiver || "-") + "\n" +
               "━━━━━━━━━━━━━━━\n" +
               "📦 รายการสินค้า (" + g.items.length + " รายการ):\n";
    
    g.items.forEach(function(item, i) { 
      text += "🔹 " + (i + 1) + ": " + item.model + "\n   (SN: " + (item.sn || "NA") + ", Qty: " + (item.qty || 0) + ")\n"; 
    });
    sections.push(text);
  });
  return sections.join("\n====================================================================\n") + "\n━━━━━━━━━━━━━━━\n🔍 ค้นหาเมื่อ: " + timestamp;
}

function getBOMData(customer) { try { var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var res = []; var s = ss.getSheetByName(customer === "AIS" ? "BOM AIS" : "BOM TRUE"); if (s) { var lastRow = s.getLastRow(); if (lastRow < 2) return []; var d = s.getRange(2, 1, lastRow - 1, 4).getValues(); for (var i = 0; i < d.length; i++) { if (d[i][1]) res.push({ type: String(d[i][0]), model: String(d[i][1]), code: String(d[i][2]), desc: String(d[i][3]) }); } } return res; } catch (e) { return []; } }
function getProjectData() { try { var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var s = ss.getSheetByName("data"); if (!s) return []; var lastRow = s.getLastRow(); if (lastRow < 2) return []; var d = s.getRange(2, 1, lastRow - 1, 3).getValues(); var res = []; for (var i = 0; i < d.length; i++) { if (d[i][0]) res.push({ duid: String(d[i][0]).trim(), region: String(d[i][2]).trim() }); } return res; } catch (e) { return []; } }
function getOwnerData() { try { var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var ws=[], rs=[]; var sheets = ss.getSheets(); sheets.forEach(function(s){ var name = s.getName(); if (name.indexOf("INOUT") > -1 || name === "data") { var lastRow = s.getLastRow(); if (lastRow < 2) return; var startRow = Math.max(2, lastRow - 500); var numRows = lastRow - startRow + 1; var data = s.getRange(startRow, 1, numRows, s.getLastColumn()).getValues(); var h = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0].map(h => String(h||"").toUpperCase()); var wCol = Math.max(h.indexOf("OWNER WAREHOUSE"), h.indexOf("OWNER WAREHOUSE ")); var rCol = Math.max(h.indexOf("OWNER RECEIVER"), h.indexOf("OWNER RECEIVER ")); for (var i = 0; i < data.length; i++) { if (wCol > -1 && data[i][wCol]) ws.push(String(data[i][wCol])); if (rCol > -1 && data[i][rCol]) rs.push(String(data[i][rCol])); } } }); return { warehouses: [...new Set(ws)].sort(), receivers: [...new Set(rs)].sort() }; } catch(e) { return {warehouses:[], receivers:[]}; } }
function isDuidClosed(duid, customer) { try { if (!duid) return false; var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var sheet = ss.getSheetByName("INOUT_HW_" + customer); if (!sheet) return false; var lastRow = sheet.getLastRow(); if (lastRow < 2) return false; var data = sheet.getRange(1, 1, lastRow, 22).getValues(); var h = data[0].map(v => String(v||"").toUpperCase()); var dCol = 1, sCol = 21; var target = duid.trim().toLowerCase(); for (var i = 1; i < data.length; i++) { if (String(data[i][dCol]).trim().toLowerCase() === target && String(data[i][sCol]).trim().toUpperCase() === "CLOSED") return true; } } catch (e) {} return false; }
function updateDuidStatus(duid, customer) { try { if (!duid) return; var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var sheet = ss.getSheetByName("INOUT_HW_" + customer); if (!sheet) return; var data = sheet.getDataRange().getValues(); var idx = { duid: 1, type: 3, qty: 10, status: 21 }; var totalIn = 0, totalOut = 0, matchingRows = [], target = duid.trim(); for (var i = 1; i < data.length; i++) { if (String(data[i][idx.duid]).trim() === target) { matchingRows.push(i + 1); var type = String(data[i][idx.type]).toUpperCase(), qty = Number(data[i][idx.qty]) || 0; if (type.indexOf("IN") > -1 || type === "RETURN") totalIn += qty; else if (type.indexOf("OUT") > -1) totalOut += qty; } } var status = (totalIn > 0 && totalIn === totalOut) ? "Closed" : (totalIn > 0 ? "On Process" : "Pending"); if (matchingRows.length > 0) { var statusData = sheet.getRange(1, 22, data.length, 1).getValues(); matchingRows.forEach(r => { if (statusData[r-1]) statusData[r-1][0] = status; }); sheet.getRange(1, 22, data.length, 1).setValues(statusData); } } catch (e) {} }
function uploadPhotoOnly(h, b, p) { try { var root = DriveApp.getFolderById(ROOT_FOLDER_ID); var regF = getOrCreateSubFolder(root, h.region), duidF = getOrCreateSubFolder(regF, h.duid), typeF = getOrCreateSubFolder(duidF, h.type.replace("/", "_")); var blob = Utilities.newBlob(Utilities.base64Decode(b.split(',')[1]), "image/jpeg", h.duid + "_" + p + ".jpg"); typeF.createFile(blob); return { success: true, folderUrl: duidF.getUrl() }; } catch (e) { return { success: false, error: e.toString() }; } }
function getOrCreateSubFolder(p, n) { var it = p.getFoldersByName(n); while (it.hasNext()) { var f = it.next(); if (!f.isTrashed()) return f; } return p.createFolder(n); }
function notifyOnly(h, i) { var payload = { header: h, items: i }, opt = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true }; UrlFetchApp.fetch(NODE_JS_WEBHOOK_URL, opt); return { success: true }; }

/**
 * 🧪 ฟังก์ชันสำหรับทดสอบระบบ (รันจาก GAS Editor ได้เลย)
 * ทดสอบ: Notify LINE/Telegram, Search Bill, Search DUID
 */
function runGasSystemTests() {
  var VERCEL_URL = 'https://vipcode-ai-inspector-yhfn.vercel.app'; // 🚩 ตรวจสอบ URL ของคุณ
  
  var mockData = {
    header: { customer: "AIS", type: "IN", region: "ER", duid: "TEST-DUID-999", billNo: "TEST-BILL-001", ownerWarehouse: "TEST_WH", ownerReceiver: "TEST_RC" },
    items: [{ type: "AISG", model: "AISG 3m", code: "4070193", desc: "Test Item", qty: 1, sn: "TEST-SN-001" }]
  };

  Logger.log("🚀 เริ่มการทดสอบระบบ (GAS Version)...");

  // 1. ทดสอบแจ้งเตือนการบันทึก (/notify) -> ส่งไปทั้ง LINE & Telegram
  try {
    var opt1 = { method: 'post', contentType: 'application/json', payload: JSON.stringify(mockData), muteHttpExceptions: true };
    var res1 = UrlFetchApp.fetch(VERCEL_URL + '/notify', opt1);
    Logger.log("1️⃣  ผลการทดสอบแจ้งเตือน: " + res1.getContentText());
  } catch (e) { Logger.log("❌ Error 1: " + e); }

  // 2. ทดสอบค้นหา DUID ผ่าน Telegram Webhook
  try {
    var duidPayload = { message: { chat: { id: 7378939928 }, text: "SHSSM_2025 Coverage Expansion Ph1_New Site_Remote-BBU_ER" } };
    var opt2 = { method: 'post', contentType: 'application/json', payload: JSON.stringify(duidPayload), muteHttpExceptions: true };
    var res2 = UrlFetchApp.fetch(VERCEL_URL + '/telegram-webhook', opt2);
    Logger.log("2️⃣  ผลการทดสอบค้นหา DUID: " + res2.getContentText());
  } catch (e) { Logger.log("❌ Error 2: " + e); }

  // 3. ทดสอบค้นหา Bill No ผ่าน Web App
  try {
    var billResult = searchByBillNo("TEST-BILL-001", "AIS");
    Logger.log("3️⃣  ผลการทดสอบค้นหา Bill (Internal): " + JSON.stringify(billResult));
  } catch (e) { Logger.log("❌ Error 3: " + e); }
  
  Logger.log("🏁 จบการทดสอบ ตรวจสอบผลลัพธ์ใน Telegram/LINE");
}

/**
 * 🧪 ทดสอบระบบ OCR ภายใน GAS (รันจาก Editor)
 * เพื่อเช็คว่าเปิดใช้งาน Drive API หรือยัง และ Regex อ่านได้ไหม
 */
function testOcrEngine() {
  // Mock Base64 (รูปภาพ 1x1 สีขาว)
  var mockBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
  
  Logger.log("🔍 กำลังทดสอบ Drive API OCR...");
  try {
    var result = processOCR(mockBase64);
    Logger.log("✅ Drive API Status: " + (result.success ? "พร้อมใช้งาน" : "มีปัญหา"));
    if (!result.success) Logger.log("❌ Error: " + result.error);
    
    // ทดสอบ Regex ด้วยข้อความจำลอง
    var mockText = "Bill No: T0826-TEST-001\nDUID: SHSSM_TEST_SITE_2025\nRegion: ER\nBBU5900 1\nUBBPg2 2";
    var parsed = parsePickingList(mockText);
    Logger.log("📝 ผลการ Parsing จำลอง:");
    Logger.log("🆔 DUID: " + parsed.header.duid);
    Logger.log("📄 Bill: " + parsed.header.billNo);
    Logger.log("📦 รายการ: " + parsed.items.length + " รายการ");
  } catch (e) {
    Logger.log("❌ CRITICAL ERROR: " + e.toString());
    Logger.log("💡 คำแนะนำ: ตรวจสอบว่าในเมนู Services (+) ทางซ้ายมือ ได้เพิ่ม 'Drive API' หรือยัง");
  }
}
