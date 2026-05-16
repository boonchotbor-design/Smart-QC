/*
 * 🚀 Inventory Smart System - MASTER VERSION 6.0.6
 * Simplified Fields: Removed Site, Project, Internal Project, Phase, WON
 */

var SPREADSHEET_ID = '1afmWjTNetqHNT69k-jzB3mAdTsFaRdodlJ1hJaJfpSQ';

function doGet(e) {
  try {
    var template = HtmlService.createTemplateFromFile('app');
    return template.evaluate()
        .setTitle('Inventory Smart App V.6.0.6')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return ContentService.createTextOutput("Critical Error: " + err.toString());
  }
}

function saveMultiData(header, items) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheetName = header.customer === "AIS" ? "INOUT_HW_AIS" : "INOUT_HW_TRUE";
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw "ไม่พบแผ่นงาน: " + sheetName;
    var dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    if (header.photoBase64) { uploadInventoryPhoto(header); }

    items.forEach(function(item) {
      var lastRow = sheet.getLastRow();
      var nextNo = lastRow > 0 ? (parseInt(sheet.getRange(lastRow, 1).getValue()) || 0) + 1 : 1;
      sheet.appendRow([
        nextNo, "", "", "", // Project Code, Internal Project, Phase Internal (Removed)
        "", "", header.duid || "", header.region || "", // Site Code, WON (Removed)
        header.type || "", item.type || "", dateStr, header.billNo || "", 
        item.model || "", item.code || "", item.desc || "", item.qty || 1, 
        item.sn || "", header.ownerWarehouse || "", header.ownerReceiver || ""
      ]);
    });
    return { success: true, message: "บันทึกข้อมูลเรียบร้อย " + items.length + " รายการ" };
  } catch (e) { return { success: false, message: "Error: " + e.toString() }; }
}

function getBOMData(customer) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheetName = customer === "AIS" ? "BOM AIS" : "BOM TRUE";
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    var result = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] || data[i][1]) { result.push({ type: data[i][0], model: data[i][1], code: data[i][2], desc: data[i][3] }); }
    }
    return result;
  } catch (e) { return []; }
}

function getProjectData() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var targetSheet = ss.getSheets().find(s => s.getSheetId() == 1568241517);
    if (!targetSheet) return [];
    var data = targetSheet.getDataRange().getValues();
    var result = [];
    var headers = data[0];
    var colDUID = headers.indexOf("DUID"), colProject = headers.indexOf("Project Code"), colInternal = headers.indexOf("Internal Project");
    var colSite = headers.indexOf("Site Code"), colWON = headers.indexOf("WON"), colRegion = headers.indexOf("Region"), colPhase = headers.indexOf("Phase Internal");
    if (colDUID === -1) colDUID = 6; if (colProject === -1) colProject = 1; if (colInternal === -1) colInternal = 2;
    var seen = new Set();
    for (var i = data.length - 1; i >= 1; i--) {
      var d = String(data[i][colDUID] || ""), p = String(data[i][colProject] || ""), n = String(data[i][colInternal] || "");
      if (!d && !p && !n) continue;
      var key = d + "|" + p + "|" + n;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        duid: d, project: p, internal: n, site: colSite > -1 ? String(data[i][colSite] || "") : "",
        won: colWON > -1 ? String(data[i][colWON] || "") : "", region: colRegion > -1 ? String(data[i][colRegion] || "") : "",
        phase: colPhase > -1 ? String(data[i][colPhase] || "") : ""
      });
      if (result.length >= 3000) break;
    }
    return result;
  } catch (e) { return []; }
}

function searchByBillNo(billNo, customer) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheetName = customer === "AIS" ? "INOUT_HW_AIS" : "INOUT_HW_TRUE";
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false };
    var data = sheet.getDataRange().getValues();
    var foundData = null, items = [];
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][11] == billNo) {
        if (!foundData) {
          foundData = { duid: data[i][6], region: data[i][7], ownerWarehouse: data[i][17], ownerReceiver: data[i][18] };
        }
        items.push({ category: data[i][9], model: data[i][12], code: data[i][13], desc: data[i][14], qty: data[i][15], sn: data[i][16] });
      }
    }
    return foundData ? { success: true, data: foundData, items: items } : { success: false };
  } catch (e) { return { success: false }; }
}

function uploadInventoryPhoto(h) {
  var rootName = "Inventory_Photos";
  var rootFolder = DriveApp.getFoldersByName(rootName).hasNext() ? DriveApp.getFoldersByName(rootName).next() : DriveApp.createFolder(rootName);
  var regionFolder = getOrCreateSubFolder(rootFolder, h.region);
  var duidFolder = getOrCreateSubFolder(regionFolder, h.duid);
  var typeFolder = getOrCreateSubFolder(duidFolder, h.type.replace("/", "_"));
  var blob = Utilities.newBlob(Utilities.base64Decode(h.photoBase64.split(',')[1]), "image/jpeg", h.type.replace("/", "_") + "_" + h.billNo + "_" + new Date().getTime() + ".jpg");
  typeFolder.createFile(blob);
}

function getOrCreateSubFolder(parent, name) {
  var iter = parent.getFoldersByName(name);
  return iter.hasNext() ? iter.next() : parent.createFolder(name);
}

function processImageOcr(base64) {
  try {
    var blob = Utilities.newBlob(Utilities.base64Decode(base64.split(',')[1]), "image/jpeg", "temp.jpg");
    var file = Drive.Files.insert({ title: 'OCR_TEMP' }, blob, { ocr: true, ocrLanguage: 'th,en' });
    var text = DocumentApp.openById(file.id).getBody().getText();
    Drive.Files.remove(file.id);
    return { header: { billNo: (text.match(/DTH[0-9]{10,15}/) || [""])[0] } };
  } catch (e) { throw "OCR Error: " + e.toString(); }
}