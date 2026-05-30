/*
 * 🚀 Inventory Smart System - V.6.5.5
 * Includes: Absolute Integrity Save, Row Tracking, and Detailed Feedback
 */

var SPREADSHEET_ID = '1afmWjTNetqHNT69k-jzB3mAdTsFaRdodlJ1hJaJfpSQ';
var ROOT_FOLDER_ID = '1IKefCE5rhBAoyM0uQBTLvEkPlRUm6lD_'; 
var NODE_JS_WEBHOOK_URL = 'https://vipcode-ai-inspector-yhfn.vercel.app/notify'; 

function doGet(e) {
  if (!e || !e.parameter) return HtmlService.createHtmlOutput("Please access via Web App URL");
  if (e.parameter.duid) {
    var result = searchByDuidOnly(e.parameter.duid);
    if (e.parameter.format === "text") {
      return ContentService.createTextOutput(result.formattedText || result.message || "❌ V.6.5.5: Not found");
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }

  return HtmlService.createTemplateFromFile('app').evaluate()
      .setTitle('Inventory Smart App V.6.5.5')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function saveMainData(header, items) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
    
    Logger.log("--- SAVE PROCESS START ---");
    if (!header || !items) return { success: false, message: "❌ ข้อมูลไม่สมบูรณ์ (Header/Items null)" };

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var customer = (header.customer || "AIS").toString().trim().toUpperCase();
    var sheetName = "INOUT_HW_" + customer; 
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) return { success: false, message: "❌ ไม่พบหน้า Sheet ชื่อ '" + sheetName + "'" };

    // 1. จัดการข้อมูลให้สะอาด
    var cleanDuid = String(header.duid || "").trim();
    var cleanBill = String(header.billNo || "").trim();

    // 2. ตรวจสอบสถานะ Closed
    if (isDuidClosed(cleanDuid, customer)) {
      return { success: false, message: "❌ DUID: " + cleanDuid + " มีสถานะเป็น 'Closed' แล้ว ไม่สามารถบันทึกได้" };
    }

    var dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    var allRows = items.map(function(item) { 
      var row = new Array(22).fill("");
      row[0] = cleanDuid; 
      row[1] = String(header.region || "").trim();
      row[2] = String(header.type || "").trim(); // IN / OUT
      row[3] = String(item.type || "").trim();
      row[4] = dateStr;
      row[5] = cleanBill;
      row[6] = String(item.model || "").trim();
      row[7] = String(item.code || "").trim();
      row[8] = String(item.desc || "").trim();
      row[9] = Number(item.qty) || 0;
      row[10] = String(item.sn || "").trim();
      row[11] = String(header.ownerWarehouse || "").trim();
      row[12] = String(header.ownerReceiver || "").trim();
      row[13] = String(header.locationWarehouse || "").trim();
      row[14] = String(header.locationReceiver || "").trim();
      return row;
    });
    
    // 3. บันทึกข้อมูล
    var rowBefore = sheet.getLastRow();
    if (allRows.length > 0) {
      sheet.getRange(rowBefore + 1, 1, allRows.length, 22).setValues(allRows);
      SpreadsheetApp.flush(); // บังคับเขียนลงไฟล์ทันที
      
      var rowAfter = sheet.getLastRow();
      if (rowAfter === rowBefore) {
        // กรณีพิเศษ: getLastRow ทำงานพลาด ลองใช้ appendRow เป็นตัวสำรอง
        allRows.forEach(function(r) { sheet.appendRow(r); });
        SpreadsheetApp.flush();
        rowAfter = sheet.getLastRow();
      }
      
      // อัปเดตสถานะ DUID
      updateDuidStatus(cleanDuid, customer);
      
      Logger.log("✅ Save Success: " + sheetName + " at row " + (rowBefore + 1));
      return { 
        success: true, 
        debug: "✅ บันทึกสำเร็จ!\n📍 Sheet: " + sheetName + "\n🔢 แถวที่: " + (rowBefore + 1) + " ถึง " + rowAfter + "\n📄 Bill: " + cleanBill
      };
    } else {
      return { success: false, message: "❌ ไม่มีรายการสินค้าให้บันทึก" };
    }

  } catch (e) { 
    Logger.log("❌ CRITICAL ERROR: " + e.toString());
    return { success: false, message: "❌ ระบบขัดข้อง: " + e.toString() }; 
  } finally {
    lock.releaseLock();
  }
}

function isDuidClosed(duid, customer) {
  try {
    if (!duid) return false;
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheetName = "INOUT_HW_" + customer;
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return false;
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return false;
    var headerRow = data[0].map(h => String(h || "").trim().toUpperCase());
    var dCol = headerRow.indexOf("DUID"), sCol = headerRow.indexOf("STATUS");
    if (sCol === -1) sCol = 21; 
    
    var targetDuid = String(duid || "").trim().toLowerCase();
    for (var i = 1; i < data.length; i++) {
      var sheetDuid = String(data[i][dCol] || "").trim().toLowerCase();
      if (sheetDuid === targetDuid && String(data[i][sCol]).trim().toUpperCase() === "CLOSED") return true;
    }
  } catch (e) { Logger.log("isDuidClosed Error: " + e.toString()); }
  return false;
}

function updateDuidStatus(duid, customer) {
  try {
    if (!duid) return;
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheetName = "INOUT_HW_" + customer;
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return;
    var headerRow = data[0].map(h => String(h || "").trim().toUpperCase());
    var idx = { duid: headerRow.indexOf("DUID"), type: Math.max(headerRow.indexOf("IN/OUT"), 2), qty: Math.max(headerRow.indexOf("QTY"), 9), status: headerRow.indexOf("STATUS") };
    if (idx.status === -1) { idx.status = 21; sheet.getRange(1, 22).setValue("STATUS"); }
    
    var totalIn = 0, totalOut = 0, matchingRows = [], targetDuid = String(duid || "").trim();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idx.duid]).trim() === targetDuid) {
        matchingRows.push(i + 1);
        var type = String(data[i][idx.type]).toUpperCase(), qty = Number(data[i][idx.qty]) || 0;
        if (type.indexOf("IN") > -1 || type === "RETURN" || type === "DISMANTLE") totalIn += qty;
        else if (type.indexOf("OUT") > -1) totalOut += qty;
      }
    }
    var status = "Pending";
    if (totalIn > 0 && totalOut === 0) status = "On Process";
    else if (totalIn > 0 && totalIn === totalOut) status = "Closed";
    if (matchingRows.length > 0) {
      var statusData = sheet.getRange(1, idx.status + 1, data.length, 1).getValues();
      matchingRows.forEach(r => { if (statusData[r-1]) statusData[r-1][0] = status; });
      sheet.getRange(1, idx.status + 1, data.length, 1).setValues(statusData);
    }
  } catch (e) { Logger.log("updateDuidStatus Error: " + e.toString()); }
}

function uploadPhotoOnly(h, base64, pNum) { 
  try { 
    var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var regF = getOrCreateSubFolder(root, (h.region || "NoRegion")), duidF = getOrCreateSubFolder(regF, (h.duid || "NoDUID"));
    var typeFolderName = (h.type || "OTHER").toString().replace("/", "_"), typeF = getOrCreateSubFolder(duidF, typeFolderName);
    var fileName = typeFolderName + "_" + (h.billNo || "NoBill") + "_" + new Date().getTime() + "_" + pNum + ".jpg"; 
    var blob = Utilities.newBlob(Utilities.base64Decode(base64.split(',')[1]), "image/jpeg", fileName); 
    var file = typeF.createFile(blob); 
    return { success: true, debugPath: root.getName() + " > " + regF.getName() + " > " + duidF.getName() + " > " + typeF.getName(), folderUrl: duidF.getUrl() };
  } catch (e) { return { success: false, error: e.toString() }; } 
}

function getOrCreateSubFolder(parent, name) { 
  var folderName = name.toString().trim(), iter = parent.getFoldersByName(folderName); 
  while (iter.hasNext()) { var folder = iter.next(); if (!folder.isTrashed()) return folder; }
  return parent.createFolder(folderName); 
}

function notifyOnly(header, items) { try { sendToNodeJS(header, items); return { success: true }; } catch (e) { return { success: false }; } }
function sendToNodeJS(header, items) { if (!NODE_JS_WEBHOOK_URL) return; var payload = { header: header, items: items }, options = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true }; UrlFetchApp.fetch(NODE_JS_WEBHOOK_URL, options); }

function getProjectData() { 
  try { 
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID); 
    var sheet = ss.getSheetByName("data");
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    var results = [];
    for (var i = 1; i < data.length; i++) { if (data[i][0]) results.push({ duid: String(data[i][0]).trim(), region: String(data[i][2]).trim() }); }
    var seen = {}; return results.filter(i => { if (!i.duid || seen[i.duid]) return false; seen[i.duid] = true; return true; });
  } catch(e) { return []; } 
}

function getOwnerData() { 
  try { 
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID); 
    var ws=[], rs=[]; 
    ss.getSheets().forEach(function(s){ 
      if(s.getName().indexOf("INOUT") > -1 || s.getName() === "data"){ 
        var d = s.getDataRange().getValues(); 
        if (d.length < 2) return;
        var h = d[0].map(v => String(v || "").trim().toUpperCase());
        var wCol = Math.max(h.indexOf("OWNER WAREHOUSE"), h.indexOf("OWNER WAREHOUSE ")), rCol = Math.max(h.indexOf("OWNER RECEIVER"), h.indexOf("OWNER RECEIVER "));
        for(var i=1; i<d.length; i++){ if(wCol > -1 && d[i][wCol]) ws.push(String(d[i][wCol])); if(rCol > -1 && d[i][rCol]) rs.push(String(d[i][rCol])); } 
      } 
    }); 
    return { warehouses: [...new Set(ws)].sort(), receivers: [...new Set(rs)].sort() }; 
  } catch(e){return {warehouses:[],receivers:[]};} 
}

function searchByBillNo(billNo, customer) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID); 
    var sheet = ss.getSheetByName("INOUT_HW_" + customer) || ss.getSheets()[0]; 
    var data = sheet.getDataRange().getValues(); 
    var header = data[0].map(h => String(h || "").trim().toUpperCase());
    var idx = { duid: header.indexOf("DUID"), region: 1, billNo: header.indexOf("BILL NO"), type: header.indexOf("TYPE"), model: header.indexOf("MODEL"), code: header.indexOf("CODE"), desc: header.indexOf("DESCRIPTION"), qty: header.indexOf("QTY"), sn: header.indexOf("SN"), ownerW: header.indexOf("OWNER WAREHOUSE"), ownerR: header.indexOf("OWNER RECEIVER"), locW: header.indexOf("LOCATION WAREHOUSE"), locR: header.indexOf("LOCATION RECEIVER"), status: header.indexOf("STATUS") };
    var results = { duid: "", region: "", items: [] }, found = false;
    for (var i = 1; i < data.length; i++) { 
      if (data[i][idx.billNo] == billNo) { 
        if (!found) { results.duid = data[i][idx.duid]; results.region = data[i][idx.region]; results.status = data[i][idx.status]; results.ownerWarehouse = data[i][idx.ownerW]; results.ownerReceiver = data[i][idx.ownerR]; results.locationWarehouse = data[i][idx.locW]; results.locationReceiver = data[i][idx.locR]; found = true; } 
        results.items.push({ type: data[i][idx.type], model: data[i][idx.model], code: data[i][idx.code], desc: data[i][idx.desc], qty: data[i][idx.qty], sn: data[i][idx.sn] }); 
      } 
    }
    return found ? { success: true, data: results } : { success: false };
  } catch (e) { return { success: false }; }
}

function searchByDuidOnly(duid) {
  if (!duid) return { success: false, message: "❌ กรุณาระบุ DUID" };
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var targetSheets = ["INOUT_HW_AIS", "INOUT_HW_TRUE"]; 
    var groups = {}; 
    var found = false;
    var totalItemsCount = 0;
    var targetDuid = duid.toString().replace(/\s+/g, ' ').trim().toLowerCase();
    var currentStatus = "Pending";

    targetSheets.forEach(function(sName) {
      var sheet = ss.getSheetByName(sName);
      if (!sheet) return;
      var data = sheet.getDataRange().getValues();
      if (data.length < 2) return;
      var headerRow = data[0].map(h => String(h || "").trim().toUpperCase());
      var idx = { duid: headerRow.indexOf("DUID"), region: 1, transType: headerRow.indexOf("IN/OUT"), billNo: headerRow.indexOf("BILL NO"), model: headerRow.indexOf("MODEL"), sn: headerRow.indexOf("SN"), qty: headerRow.indexOf("QTY"), ownerW: headerRow.indexOf("OWNER WAREHOUSE"), ownerR: headerRow.indexOf("OWNER RECEIVER"), locW: headerRow.indexOf("LOCATION WAREHOUSE"), locR: headerRow.indexOf("LOCATION RECEIVER"), status: headerRow.indexOf("STATUS") };
      
      for (var i = 1; i < data.length; i++) {
        var sheetDuid = String(data[i][idx.duid] || "").replace(/\s+/g, ' ').trim().toLowerCase();
        if (sheetDuid === targetDuid) {
          if (idx.status > -1 && data[i][idx.status]) currentStatus = String(data[i][idx.status]);
          var tType = String(data[i][idx.transType] || "").toUpperCase();
          var bNo = String(data[i][idx.billNo] || "-");
          var groupKey = tType + "|" + bNo + "|" + sName; 
          if (!groups[groupKey]) {
            groups[groupKey] = {
              header: {
                customer: sName.indexOf("TRUE") > -1 ? "TRUE" : "AIS",
                transType: tType, billNo: bNo, region: data[i][idx.region] || "-",
                duid: data[i][idx.duid], ownerWarehouse: data[i][idx.ownerW] || "-",
                ownerReceiver: data[i][idx.ownerR] || "-", locWarehouse: data[i][idx.locW] || "-", locReceiver: data[i][idx.locR] || "-"
              },
              items: []
            };
          }
          groups[groupKey].items.push({ model: data[i][idx.model] || "NA", sn: data[i][idx.sn] || "NA", qty: data[i][idx.qty] || 0 });
          totalItemsCount++; found = true;
        }
      }
    });
    if (!found) return { success: false, message: "❌ ไม่พบข้อมูลสำหรับ DUID: " + duid };
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
  var sections = [], globalItemCount = 0, timestamp = Utilities.formatDate(new Date(), "GMT+7", "HH:mm:ss");
  keys.forEach(function(key, index) {
    var g = groups[key], h = g.header;
    var text = "📊 ข้อมูล DUID: " + h.duid + "\n━━━━━━━━━━━━━━━\n📌 สถานะ: " + (status || "Pending") + "\n👤 ลูกค้า: " + h.customer + "\n🛠 งาน: " + h.transType + "\nbill No : " + h.billNo + "\n📍 Region: " + h.region + "\n🆔 DUID: " + h.duid + "\n🏢 คลัง: " + h.ownerWarehouse + "\n👷 ผู้รับ: " + h.ownerReceiver + "\n📍 Loc Warehouse: " + h.locWarehouse + "\n📍 Loc Receiver: " + h.locReceiver + "\n━━━━━━━━━━━━━━━\n";
    if (index === 0) text += "📦 รายการสินค้า (" + totalItems + " รายการ):\n";
    g.items.forEach(function(item) { globalItemCount++; text += "🔹 " + globalItemCount + ": " + item.model + "\n   (SN: " + item.sn + ", Qty: " + item.qty + ")\n"; });
    sections.push(text);
  });
  return sections.join("\n====================\n") + "\n━━━━━━━━━━━━━━━\n🔍 ค้นหาเมื่อ: " + timestamp;
}
