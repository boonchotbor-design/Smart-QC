/*
 * 🚀 Inventory Smart System - V.6.5.3
 * Includes: Ultimate Robust DUID Search (All Sheets)
 */

var SPREADSHEET_ID = '1afmWjTNetqHNT69k-jzB3mAdTsFaRdodlJ1hJaJfpSQ';
var ROOT_FOLDER_ID = '1IKefCE5rhBAoyM0uQBTLvEkPlRUm6lD_'; 
var NODE_JS_WEBHOOK_URL = 'https://vipcode-ai-inspector-yhfn.vercel.app/notify'; 

function doGet(e) {
  if (e.parameter.duid) {
    var result = searchByDuidOnly(e.parameter.duid);
    if (e.parameter.format === "text") {
      return ContentService.createTextOutput(result.formattedText || result.message || "❌ V.6.5.3: Not found");
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }

  return HtmlService.createTemplateFromFile('app').evaluate()
      .setTitle('Inventory Smart App V.6.5.3')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function searchByDuidOnly(duid) {
  if (!duid) return { success: false, message: "❌ (V.6.5.3) กรุณาระบุ DUID" };
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheets = ss.getSheets();
    var groups = {}; 
    var found = false;
    var totalItems = 0;
    var targetDuid = duid.toString().replace(/\s+/g, ' ').trim().toLowerCase();

    sheets.forEach(function(sheet) {
      var sName = sheet.getName();
      var data = sheet.getDataRange().getValues();
      var customer = sName.indexOf("TRUE") > -1 ? "TRUE" : "AIS"; 
      
      for (var i = 1; i < data.length; i++) {
        var rawSheetDuid = String(data[i][1] || "");
        var sheetDuid = rawSheetDuid.replace(/\s+/g, ' ').trim().toLowerCase();
        
        if (sheetDuid === targetDuid) {
          var jobType = String(data[i][3] || "UNKNOWN").trim() || "UNKNOWN";
          if (!groups[jobType]) {
            groups[jobType] = {
              header: {
                customer: customer,
                jobType: jobType,
                region: data[i][2] || "-",
                duid: data[i][1] || rawSheetDuid,
                ownerWarehouse: data[i][12] || "-",
                ownerReceiver: data[i][13] || "-",
                locWarehouse: data[i][14] || "-",
                locReceiver: data[i][15] || "-"
              },
              items: []
            };
          }
          groups[jobType].items.push({
            model: data[i][7] || "NA",
            sn: data[i][11] || "NA",
            qty: data[i][10] || 0
          });
          totalItems++;
          found = true;
        }
      }
    });

    if (!found) {
      return { 
        success: false, 
        message: "❌ (V.6.5.3) ไม่พบข้อมูลสำหรับ DUID: \"" + duid + "\"\nกรุณาตรวจสอบคอลัมน์ B ใน Sheet ของคุณครับ" 
      };
    }

    var formattedText = formatDuidResponse(groups, totalItems);
    return { success: true, groups: groups, totalItems: totalItems, formattedText: formattedText };
  } catch (e) {
    return { success: false, message: "❌ (V.6.5.3) ระบบขัดข้อง: " + e.toString() };
  }
}

function formatDuidResponse(groups, totalItems) {
  var order = ["IN", "OUT", "STR/IN", "STR/OUT", "DISMANTLE", "RETURN"];
  var sortedJobTypes = Object.keys(groups).sort(function(a, b) {
    var idxA = order.indexOf(a.toUpperCase());
    var idxB = order.indexOf(b.toUpperCase());
    if (idxA === -1) idxA = 99;
    if (idxB === -1) idxB = 99;
    return idxA - idxB;
  });

  var sections = [];
  var globalItemCount = 0;
  var timestamp = Utilities.formatDate(new Date(), "GMT+7", "HH:mm:ss");

  sortedJobTypes.forEach(function(jobType, index) {
    var g = groups[jobType];
    var h = g.header;
    var text = "📊 ข้อมูล DUID: " + h.duid + "\n";
    text += "━━━━━━━━━━━━━━━\n";
    text += "👤 ลูกค้า: " + h.customer + "\n";
    text += "🛠 งาน: " + h.jobType + "\n";
    text += "📍 Region: " + h.region + "\n";
    text += "🆔 DUID: " + h.duid + "\n";
    text += "🏢 คลัง: " + h.ownerWarehouse + "\n";
    text += "👷 ผู้รับ: " + h.ownerReceiver + "\n";
    text += "📍 Loc Warehouse: " + h.locWarehouse + "\n";
    text += "📍 Loc Receiver: " + h.locReceiver + "\n";
    text += "━━━━━━━━━━━━━━━\n";
    if (index === 0) text += "📦 รายการสินค้า (" + totalItems + " รายการ):\n";
    g.items.forEach(function(item) {
      globalItemCount++;
      text += "🔹 " + globalItemCount + ": " + (item.model || "NA") + "\n";
      text += "   (SN: " + (item.sn || "NA") + ", Qty: " + (item.qty || 0) + ")\n";
    });
    sections.push(text);
  });

  var fullText = sections.join("\n====================================================================\n\n");
  fullText += "\n━━━━━━━━━━━━━━━\n";
  fullText += "🔍 ค้นหาเมื่อ: " + timestamp;
  return fullText;
}

function getBOMData(customer) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var masterResults = [], historyResults = [];
    var masterSheetName = customer === "AIS" ? "BOM AIS" : "BOM TRUE";
    var masterSheet = ss.getSheetByName(masterSheetName);
    if (masterSheet) {
      var data = masterSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var model = String(data[i][1] || "").trim(), code = String(data[i][2] || "").trim();
        if (model || code) masterResults.push({ type: String(data[i][0] || "OTHER").trim(), model: model, code: code, desc: String(data[i][3] || "").trim(), source: "MASTER" });
      }
    }
    var historySheets = [customer === "AIS" ? "data AIS" : "data TRUE", "INOUT_HW_" + customer];
    historySheets.forEach(function(sName) {
      var sheet = ss.getSheetByName(sName);
      if (!sheet) return;
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var model = String(data[i][7] || "").trim(), code = String(data[i][8] || "").trim();
        if (model || code) historyResults.push({ type: String(data[i][4] || "OTHER").trim(), model: model, code: code, desc: String(data[i][9] || "").trim(), source: "HISTORY" });
      }
    });
    var combined = masterResults.concat(historyResults), seen = {};
    return combined.filter(function(item) {
      var key = (item.type + "|" + item.model + "|" + item.code + "|" + item.desc).toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  } catch (e) { return []; }
}

function saveMainData(header, items) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var customer = (header.customer || "AIS").toString().trim().toUpperCase();
    var sheet = ss.getSheetByName("INOUT_HW_" + customer) || ss.getSheets()[0];
    var dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    var colA = sheet.getRange("A1:A").getValues(), actualLastRow = 0;
    for (var i = 0; i < colA.length; i++) { if (colA[i][0] !== "") actualLastRow = i + 1; }
    var nextRow = actualLastRow + 1, lastNo = 0, duidToFind = String(header.duid || "").trim();
    if (actualLastRow > 1) {
      var allData = sheet.getRange(1, 1, actualLastRow, 2).getValues();
      for (var i = 1; i < allData.length; i++) { if (String(allData[i][1]).trim() === duidToFind) { var num = parseInt(allData[i][0]); if (!isNaN(num) && num > lastNo) lastNo = num; } }
    }
    var allRows = items.map(function(item, index) { return [ lastNo+index+1, header.duid, header.region, header.type, item.type, dateStr, header.billNo, item.model, item.code, item.desc, item.qty, item.sn, header.ownerWarehouse, header.ownerReceiver, header.locationWarehouse || "", header.locationReceiver || "", "", "", "" ]; });
    if (allRows.length > 0) sheet.getRange(nextRow, 1, allRows.length, 19).setValues(allRows);
    SpreadsheetApp.flush();
    return { success: true };
  } catch (e) { return { success: false, message: e.toString() }; }
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
    var sheets = ss.getSheets(), allDuidData = [];
    sheets.forEach(function(s) {
      var d = s.getDataRange().getValues();
      if (d.length > 1) {
        var rows = d.slice(1).map(r => ({ duid: String(r[1] || "").trim(), region: String(r[2] || "").trim() }));
        allDuidData = allDuidData.concat(rows);
      }
    });
    var seen = {};
    return allDuidData.filter(function(item) { if (!item.duid || seen[item.duid]) return false; seen[item.duid] = true; return true; });
  } catch(e) { return []; } 
}

function getOwnerData() { try { var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var ws=[], rs=[]; ss.getSheets().forEach(function(s){ if(s.getName().indexOf("INOUT")>-1){ var d=s.getDataRange().getValues(); for(var i=1;i<d.length;i++){ if(d[i][12]) ws.push(String(d[i][12])); if(d[i][13]) rs.push(String(d[i][13])); } } }); return { warehouses: [...new Set(ws)].sort(), receivers: [...new Set(rs)].sort() }; } catch(e){return {warehouses:[],receivers:[]};} }
function searchByBillNo(billNo, customer) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var sheet = ss.getSheetByName("INOUT_HW_" + customer) || ss.getSheets()[0]; var data = sheet.getDataRange().getValues(); var results = { duid: "", region: "", ownerWarehouse: "", ownerReceiver: "", locationWarehouse: "", locationReceiver: "", items: [] }; var found = false;
    for (var i = 1; i < data.length; i++) { if (data[i][6] == billNo) { if (!found) { results.duid = data[i][1]; results.region = data[i][2]; results.ownerWarehouse = data[i][12]; results.ownerReceiver = data[i][13]; results.locationWarehouse = data[i][14]; results.locationReceiver = data[i][15]; found = true; } results.items.push({ type: data[i][4], model: data[i][7], code: data[i][8], desc: data[i][9], qty: data[i][10], sn: data[i][11] }); } }
    return found ? { success: true, data: results } : { success: false };
  } catch (e) { return { success: false, error: e.toString() }; }
}

function testSearch() {
  var testDuid = "RGPPP_2025 Coverage Expansion Ph1_New Site_Remote-BBU_ER"; 
  var result = searchByDuidOnly(testDuid);
  if (result.success) { Logger.log("✅ ค้นพบข้อมูล!"); Logger.log("\n--- ข้อความที่จะส่งไปที่ Bot ---\n"); Logger.log(result.formattedText); } 
  else { Logger.log("❌ ไม่พบข้อมูล: " + result.message); }
}

function testDuidList() {
  var data = getProjectData();
  Logger.log("📊 จำนวน DUID ที่พบทั้งหมด: " + data.length + " รายการ");
  if (data.length > 0) { Logger.log("ตัวอย่าง DUID 5 รายการแรก:"); data.slice(0, 5).forEach(i => Logger.log("- " + i.duid + " (" + i.region + ")")); }
}
