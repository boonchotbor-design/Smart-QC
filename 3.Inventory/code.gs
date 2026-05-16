/*
 * 🚀 Inventory Smart System - MASTER VERSION 6.1.4
 * Focus: High Stability for Android (Manual Entry + Standard Photo Upload)
 */

var SPREADSHEET_ID = '1afmWjTNetqHNT69k-jzB3mAdTsFaRdodlJ1hJaJfpSQ';
var LINE_ACCESS_TOKEN = 'eZe15XyurA2eFNBEjeMJ1PNG3lEiujNpzJ01GGarnoq7GFaYDqBttYZk0BHHh7KE5ZOaQdNJUdmhoCc+UoXxqmT1CdHZ7KHUWr7XACo1VY4ezEZpWVHuzufGydzTBOWnVgEgcksIJQDFeQrL3dvkUQdB04t89/1O/w1cDnyilFU=';
var LINE_DESTINATIONS = ['Cb4baf5e474773f54f2b6538e4cd4d9ac', 'U110afe8872d7f73074e56c457df2859']; 
var ROOT_FOLDER_ID = '1164j34sS24xhE-iM9b2r2spMFg7N3_sh';

function doGet(e) {
  try {
    var template = HtmlService.createTemplateFromFile('app');
    return template.evaluate()
        .setTitle('Inventory Smart App V.6.1.4')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) { return ContentService.createTextOutput("Critical Error: " + err.toString()); }
}

function saveMultiData(header, items) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var customer = (header.customer || "AIS").toString().trim().toUpperCase();
    var sheetName = customer === "AIS" ? "INOUT_HW_AIS" : "INOUT_HW_TRUE";
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw "ไม่พบแผ่นงาน: " + sheetName;

    var dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    
    if (header.photoArray && header.photoArray.length > 0) {
      header.photoArray.forEach(function(base64, index) {
        try { if (base64) uploadInventoryPhoto(header, base64, index + 1); } catch (e) {}
      });
    }

    items.forEach(function(item) {
      var lastRow = sheet.getLastRow();
      var nextNo = 1;
      if (lastRow >= 1) {
        var val = sheet.getRange(lastRow, 1).getValue();
        nextNo = (parseInt(val) || 0) + 1;
      }
      sheet.appendRow([nextNo, header.projectCode || "", header.internalProject || "", header.phaseInternal || "", header.siteCode || "", header.won || "", header.duid || "", header.region || "", header.type || "", item.type || "", dateStr, header.billNo || "", item.model || "", item.code || "", item.desc || "", item.qty || 1, item.sn || "", header.ownerWarehouse || "", header.ownerReceiver || ""]);
    });

    SpreadsheetApp.flush();
    try { sendLineNotification(header, items); } catch (e) {}
    return { success: true, message: "✅ บันทึกข้อมูลลง " + sheetName + " เรียบร้อยแล้ว" };
  } catch (e) { return { success: false, message: "❌ Error: " + e.toString() }; }
}

function uploadInventoryPhoto(h, base64, photoNum) {
  try {
    var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var regionFolder = getOrCreateSubFolder(rootFolder, h.region || "NoRegion");
    var safeDuid = (h.duid || "NoDUID").toString().trim();
    var duidFolder = getOrCreateSubFolder(regionFolder, safeDuid);
    var typeFolder = getOrCreateSubFolder(duidFolder, h.type.replace("/", "_"));
    var fileName = h.type.replace("/", "_") + "_" + (h.billNo || "NoBill") + "_" + new Date().getTime() + "_" + photoNum + ".jpg";
    var blob = Utilities.newBlob(Utilities.base64Decode(base64.split(',')[1]), "image/jpeg", fileName);
    typeFolder.createFile(blob);
  } catch (err) {}
}

function getOrCreateSubFolder(parent, name) {
  var iter = parent.getFoldersByName(name);
  return iter.hasNext() ? iter.next() : parent.createFolder(name);
}

function sendLineNotification(header, items) {
  var url = 'https://api.line.me/v2/bot/message/push';
  var messageText = "📦 *Inventory App (V.6.1.4)*\n" +
                "👤 ลูกค้า: " + header.customer + "\n" +
                "🛠 งาน: " + header.type + "\n" +
                "🧾 Bill No: " + header.billNo + "\n" +
                "📸 รูปถ่าย: " + (header.photoArray ? header.photoArray.length : 0) + " รูป\n" +
                "✅ บันทึกสำเร็จ!";
  LINE_DESTINATIONS.forEach(function(destId) {
    var payload = { to: destId, messages: [{ type: 'text', text: messageText }] };
    UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + LINE_ACCESS_TOKEN }, payload: JSON.stringify(payload), muteHttpExceptions: true });
  });
}

function getBOMData(customer) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheetName = customer === "AIS" ? "BOM AIS" : "BOM TRUE";
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    var result = [];
    for (var i = 1; i < data.length; i++) { if (data[i][0] || data[i][1]) result.push({ type: data[i][0], model: data[i][1], code: data[i][2], desc: data[i][3] }); }
    return result;
  } catch (e) { return []; }
}

function getProjectData() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var targetSheet = ss.getSheets().find(s => s.getSheetId() == 1568241517) || ss.getSheetByName("data");
    if (!targetSheet) return [];
    var data = targetSheet.getDataRange().getValues();
    var result = [];
    var colDUID = 0; // column A
    for (var i = 1; i < data.length; i++) {
      if (!data[i][colDUID]) continue;
      result.push({ duid: String(data[i][colDUID]).trim(), project: String(data[i][1] || ""), internal: String(data[i][2] || ""), site: String(data[i][4] || ""), won: String(data[i][5] || ""), region: String(data[i][7] || ""), phase: String(data[i][3] || "") });
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
        if (!foundData) { foundData = { projectCode: data[i][1], internalProject: data[i][2], phaseInternal: data[i][3], siteCode: data[i][4], won: data[i][5], duid: data[i][6], region: data[i][7] }; }
        items.push({ category: data[i][9], model: data[i][12], code: data[i][13], desc: data[i][14], qty: data[i][15], sn: data[i][16] });
      }
    }
    return foundData ? { success: true, data: foundData, items: items } : { success: false };
  } catch (e) { return { success: false }; }
}
