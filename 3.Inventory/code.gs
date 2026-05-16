/*
 * 🚀 Inventory Smart System - MASTER VERSION 6.1.5
 * Fix: targeted GID recording & Reliable setValues
 */

var SPREADSHEET_ID = '1afmWjTNetqHNT69k-jzB3mAdTsFaRdodlJ1hJaJfpSQ';
var LINE_ACCESS_TOKEN = 'eZe15XyurA2eFNBEjeMJ1PNG3lEiujNpzJ01GGarnoq7GFaYDqBttYZk0BHHh7KE5ZOaQdNJUdmhoCc+UoXxqmT1CdHZ7KHUWr7XACo1VY4ezEZpWVHuzufGydzTBOWnVgEgcksIJQDFeQrL3dvkUQdB04t89/1O/w1cDnyilFU=';
var LINE_DESTINATIONS = ['Cb4baf5e474773f54f2b6538e4cd4d9ac', 'U110afe8872d7f73074e56c457df2859']; 
var ROOT_FOLDER_ID = '1164j34sS24xhE-iM9b2r2spMFg7N3_sh';

function doGet(e) {
  try {
    var template = HtmlService.createTemplateFromFile('app');
    return template.evaluate()
        .setTitle('Inventory Smart App V.6.1.5')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) { return ContentService.createTextOutput("Critical Error: " + err.toString()); }
}

function saveMultiData(header, items) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var customer = (header.customer || "AIS").toString().trim().toUpperCase();
    
    // 1. ค้นหาแผ่นงาน (เน้น GID 1508842054)
    var sheet = null;
    var allSheets = ss.getSheets();
    for (var i = 0; i < allSheets.length; i++) {
      if (allSheets[i].getSheetId() == 1508842054) { sheet = allSheets[i]; break; }
    }
    if (!sheet) {
      sheet = ss.getSheetByName("INOUT_HW_" + customer) || ss.getSheetByName("Inventory") || ss.getSheets()[0];
    }

    var dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    
    // 2. อัปโหลดรูปภาพ
    if (header.photoArray && header.photoArray.length > 0) {
      header.photoArray.forEach(function(base64, index) {
        try { if (base64) uploadInventoryPhoto(header, base64, index + 1); } catch (e) {}
      });
    }

    // 3. บันทึกข้อมูล
    items.forEach(function(item) {
      // หาบรรทัดสุดท้ายจริงจาก Column A
      var lastRow = sheet.getLastRow();
      var rangeA = sheet.getRange("A1:A" + (lastRow + 20)).getValues();
      var actualLastRow = 0;
      for (var r = 0; r < rangeA.length; r++) { if (rangeA[r][0] !== "") actualLastRow = r + 1; }
      
      var nextRow = actualLastRow + 1;
      var nextNo = actualLastRow > 0 ? (parseInt(rangeA[actualLastRow-1][0]) || 0) + 1 : 1;
      
      // Mapping 14 คอลัมน์ (A-N)
      var rowData = [
        nextNo, header.duid || "", header.region || "", header.type || "", item.type || "", 
        dateStr, header.billNo || "", item.model || "", item.code || "", item.desc || "", 
        item.qty || 1, item.sn || "", header.ownerWarehouse || "", header.ownerReceiver || ""
      ];
      
      sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
    });

    SpreadsheetApp.flush();
    try { sendLineNotification(header, items); } catch (e) {}
    return { success: true, message: "✅ บันทึกข้อมูลลงแผ่นงาน '" + sheet.getName() + "' เรียบร้อยแล้ว" };
  } catch (e) { return { success: false, message: "❌ Error: " + e.toString() }; }
}

function sendLineNotification(header, items) {
  var url = 'https://api.line.me/v2/bot/message/push';
  var messageText = "📦 รายงาน Inventory (V.6.1.5)\n" +
                "━━━━━━━━━━━━━━━\n" +
                "👤 ลูกค้า: " + header.customer + "\n" +
                "🛠 งาน: " + header.type + "\n" +
                "📍 Region: " + header.region + "\n" +
                "🧾 Bill No: " + (header.billNo || "N/A") + "\n" +
                "🆔 DUID: " + header.duid + "\n" +
                "🏢 คลัง: " + (header.ownerWarehouse || "-") + "\n" +
                "👷 ผู้รับ: " + (header.ownerReceiver || "-") + "\n" +
                "📸 รูปถ่าย: " + (header.photoArray ? header.photoArray.length : 0) + " รูป\n" +
                "━━━━━━━━━━━━━━━\n" +
                "📦 รายการสินค้า (" + items.length + " รายการ):\n";
  
  items.forEach(function(item, index) {
    messageText += (index + 1) + ". " + item.type + " | " + item.model + "\n";
    messageText += "   SN: " + (item.sn || "N/A") + " | Qty: " + item.qty + "\n";
  });
  
  messageText += "━━━━━━━━━━━━━━━\n" +
                "✅ บันทึกสำเร็จ!";

  LINE_DESTINATIONS.forEach(function(destId) {
    var payload = { to: destId, messages: [{ type: 'text', text: messageText }] };
    UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + LINE_ACCESS_TOKEN }, payload: JSON.stringify(payload), muteHttpExceptions: true });
  });
}

function getBOMData(customer) { try { var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var sheetName = customer === "AIS" ? "BOM AIS" : "BOM TRUE"; var sheet = ss.getSheetByName(sheetName); if (!sheet) return []; var data = sheet.getDataRange().getValues(); var result = []; for (var i = 1; i < data.length; i++) { if (data[i][0] || data[i][1]) result.push({ type: data[i][0], model: data[i][1], code: data[i][2], desc: data[i][3] }); } return result; } catch (e) { return []; } }
function getProjectData() { try { var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var targetSheet = ss.getSheets().find(s => s.getSheetId() == 1568241517) || ss.getSheetByName("data"); if (!targetSheet) return []; var data = targetSheet.getDataRange().getValues(); var result = []; for (var i = 1; i < data.length; i++) { if (!data[i][0]) continue; result.push({ duid: String(data[i][0]).trim(), region: String(data[i][7] || "") }); } return result; } catch (e) { return []; } }
function uploadInventoryPhoto(h, base64, pNum) { try { var root = DriveApp.getFolderById(ROOT_FOLDER_ID); var regF = getOrCreateSubFolder(root, h.region || "NoRegion"); var duidF = getOrCreateSubFolder(regF, (h.duid || "NoDUID").toString().trim()); var typeF = getOrCreateSubFolder(duidF, h.type.replace("/", "_")); var fileName = h.type.replace("/", "_") + "_" + (h.billNo || "NoBill") + "_" + new Date().getTime() + "_" + pNum + ".jpg"; var blob = Utilities.newBlob(Utilities.base64Decode(base64.split(',')[1]), "image/jpeg", fileName); typeF.createFile(blob); } catch (e) {} }
function getOrCreateSubFolder(parent, name) { var iter = parent.getFoldersByName(name); return iter.hasNext() ? iter.next() : parent.createFolder(name); }
function getOwnerData() { try { var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var ws = [], rs = []; ss.getSheets().forEach(function(s){ if(s.getName().indexOf("INOUT")>-1 || s.getName()=="Inventory"){ var d=s.getDataRange().getValues(); for(var i=1;i<d.length;i++){ if(d[i][12]) ws.push(String(d[i][12]).trim()); if(d[i][13]) rs.push(String(d[i][13]).trim()); } } }); return { warehouses: [...new Set(ws)].sort(), receivers: [...new Set(rs)].sort() }; } catch (e) { return { warehouses: [], receivers: [] }; } }
function searchByBillNo(billNo, customer) { try { var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var sheet = ss.getSheets().find(s => s.getSheetId() == 1508842054) || ss.getSheetByName("INOUT_HW_" + customer); if (!sheet) return { success: false }; var data = sheet.getDataRange().getValues(); for (var i = data.length - 1; i >= 1; i--) { if (data[i][6] == billNo) return { success: true, data: { duid: data[i][1], region: data[i][2] } }; } return { success: false }; } catch (e) { return { success: false }; } }
