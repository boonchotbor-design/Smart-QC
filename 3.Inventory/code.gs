/*
 * 🚀 Inventory Smart System - V.6.4.8 (STABLE SYNC)
 * รวมฟีเจอร์: บันทึกแยกส่วน + Progress Bar + จัด Folder เป็นระเบียบ + ระบบค้นหาอัจฉริยะ (Cascading) + ระบบ Multi-Bot แจ้งเตือน (กัน Quota เต็ม)
 */

var SPREADSHEET_ID = '1afmWjTNetqHNT69k-jzB3mAdTsFaRdodlJ1hJaJfpSQ';
var LINE_ACCESS_TOKENS = [
  'eZe15XyurA2eFNBEjeMJ1PNG3lEiujNpzJ01GGarnoq7GFaYDqBttYZk0BHHh7KE5ZOaQdNJUdmhoCc+UoXxqmT1CdHZ7KHUWr7XACo1VY4ezEZpWVHuzufGydzTBOWnVgEgcksIJQDFeQrL3dvkUQdB04t89/1O/w1cDnyilFU=',
  'VOVhBbD6EG9VwKFo0V1s/wAclekysxBkWrudqSrkp5kFd/8tdrWyi1der1Eui54whdk/E0XWQxF9amI05MWgRq2/Nu628A/1O4yZJB/6warrshDOj2MtnhnM59yZh7b66qbEb/Qsx5XY3OzgXnkNZgdB04t89/1O/w1cDnyilFU=',
  '+rX1Vp8W/wacBl/JTAqkRMDfx7oj/wvTV66GSpASORlUoTL2LHlAoNKIlQDXAX8cLYFHufC5EOPIBWElgRYXjC9qNUNbSjpq9JZ9rInybwWVSVSs9jYObP2EqRTgreI/30kjvTz8U2rnFvAYxX8mGwdB04t89/1O/w1cDnyilFU='
];
var LINE_DESTINATIONS = ['Cb4baf5e474773f54f2b6538e4cd4d9ac', 'U110afe8872d7f73074e56c457df2859']; 
var ROOT_FOLDER_ID = '1IKefCE5rhBAoyM0uQBTLvEkPlRUm6lD_'; 

function doGet(e) {
  return HtmlService.createTemplateFromFile('app').evaluate()
      .setTitle('Inventory Smart App V.6.4.8')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// --- 1. ดึงข้อมูล BOM และ Model (เน้นความถูกต้องของ Column) ---
function getBOMData(customer) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var masterResults = [];
    var historyResults = [];
    
    // 1.1 อ่านจาก Master BOM (ลำดับความสำคัญสูงสุด)
    var masterSheetName = customer === "AIS" ? "BOM AIS" : "BOM TRUE";
    var masterSheet = ss.getSheetByName(masterSheetName);
    if (masterSheet) {
      var data = masterSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var model = String(data[i][1] || "").trim();
        var code = String(data[i][2] || "").trim();
        if (model || code) {
          masterResults.push({
            type: String(data[i][0] || "OTHER").trim(),
            model: model,
            code: code,
            desc: String(data[i][3] || "").trim(),
            source: "MASTER"
          });
        }
      }
    }
    
    // 1.2 อ่านจากประวัติ (เอาไว้กันเหนียว กรณีไม่มีใน BOM)
    var historySheets = [
      customer === "AIS" ? "data AIS" : "data TRUE",
      "INOUT_HW_" + customer
    ];
    historySheets.forEach(function(sName) {
      var sheet = ss.getSheetByName(sName);
      if (!sheet) return;
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var model = String(data[i][7] || "").trim();
        var code = String(data[i][8] || "").trim();
        if (model || code) {
          historyResults.push({
            type: String(data[i][4] || "OTHER").trim(),
            model: model,
            code: code,
            desc: String(data[i][9] || "").trim(),
            source: "HISTORY"
          });
        }
      }
    });

    // รวมข้อมูล โดยเอา Master นำหน้า
    var combined = masterResults.concat(historyResults);
    var seen = {};
    return combined.filter(function(item) {
      var key = (item.type + "|" + item.model + "|" + item.code + "|" + item.desc).toLowerCase();
      if (seen[key]) return false;
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
    var sheet = ss.getSheetByName("INOUT_HW_" + customer) || ss.getSheets()[0];
    var dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    var colA = sheet.getRange("A1:A").getValues();
    var actualLastRow = 0;
    for (var i = 0; i < colA.length; i++) { if (colA[i][0] !== "") actualLastRow = i + 1; }
    var nextRow = actualLastRow + 1;
    
    // หาเลขลำดับล่าสุดเฉพาะ DUID นี้ เพื่อให้รันเลขต่อกัน (Continuous Sequence per DUID)
    var lastNo = 0;
    var duidToFind = String(header.duid || "").trim();
    if (actualLastRow > 1) {
      var allData = sheet.getRange(1, 1, actualLastRow, 2).getValues();
      for (var i = 1; i < allData.length; i++) {
        if (String(allData[i][1]).trim() === duidToFind) {
          var num = parseInt(allData[i][0]);
          if (!isNaN(num) && num > lastNo) lastNo = num;
        }
      }
    }

    var allRows = items.map(function(item, index) {
      return [ lastNo+index+1, header.duid, header.region, header.type, item.type, dateStr, header.billNo, item.model, item.code, item.desc, item.qty, item.sn, header.ownerWarehouse, header.ownerReceiver, header.locationWarehouse || "", header.locationReceiver || "", "", "", "" ];
    });
    if (allRows.length > 0) sheet.getRange(nextRow, 1, allRows.length, 19).setValues(allRows);
    SpreadsheetApp.flush();
    return { success: true };
  } catch (e) { return { success: false, message: e.toString() }; }
}

// --- 3. อัปโหลดรูปภาพ ---
function uploadPhotoOnly(h, base64, pNum) { 
  try { 
    var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var regF = getOrCreateSubFolder(root, (h.region || "NoRegion"));
    var duidF = getOrCreateSubFolder(regF, (h.duid || "NoDUID"));
    var typeFolderName = (h.type || "OTHER").toString().replace("/", "_");
    var typeF = getOrCreateSubFolder(duidF, typeFolderName);
    var fileName = typeFolderName + "_" + (h.billNo || "NoBill") + "_" + new Date().getTime() + "_" + pNum + ".jpg"; 
    var blob = Utilities.newBlob(Utilities.base64Decode(base64.split(',')[1]), "image/jpeg", fileName); 
    var file = typeF.createFile(blob); 
    return { success: true, debugPath: root.getName() + " > " + regF.getName() + " > " + duidF.getName() + " > " + typeF.getName(), folderUrl: duidF.getUrl() };
  } catch (e) { return { success: false, error: e.toString() }; } 
}

function getOrCreateSubFolder(parent, name) { 
  var folderName = name.toString().trim();
  var iter = parent.getFoldersByName(folderName); 
  while (iter.hasNext()) { var folder = iter.next(); if (!folder.isTrashed()) return folder; }
  return parent.createFolder(folderName); 
}

// --- 4. แจ้งเตือน ---
function notifyOnly(header, items) { try { sendLineNotification(header, items); return { success: true }; } catch (e) { return { success: false }; } }
function sendLineNotification(header, items) {
  var url = 'https://api.line.me/v2/bot/message/push';
  var dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");

  var messageText = "📦 รายงาน Inventory (V.6.4.8)\n" +
                "━━━━━━━━━━━━━━━\n" +
                "👤 ลูกค้า: " + header.customer + "\n" +
                "🛠 งาน: " + header.type + "\n" +
                "📍 Region: " + header.region + "\n" +
                "🆔 DUID: " + header.duid + "\n" +
                "🏢 คลัง: " + (header.ownerWarehouse || "-") + "\n" +
                "👷 ผู้รับ: " + (header.ownerReceiver || "-") + "\n" +
                "📍 Loc Warehouse: " + (header.locationWarehouse || "-") + "\n" +
                "📍 Loc Receiver: " + (header.locationReceiver || "-") + "\n" +
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

  LINE_ACCESS_TOKENS.forEach(function(token) {
    LINE_DESTINATIONS.forEach(function(destId) {
      var payload = { to: destId, messages: [{ type: 'text', text: messageText }] };
      UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + token }, payload: JSON.stringify(payload), muteHttpExceptions: true });
    });
  });
}

function getProjectData() { try { var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var s = ss.getSheets().find(s => s.getSheetId() == 1568241517) || ss.getSheetByName("data"); var d = s.getDataRange().getValues(); return d.slice(1).map(r => ({ duid: String(r[0]), region: String(r[7]||"") })); } catch(e){return [];} }
function getOwnerData() { try { var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var ws=[], rs=[]; ss.getSheets().forEach(function(s){ if(s.getName().indexOf("INOUT")>-1){ var d=s.getDataRange().getValues(); for(var i=1;i<d.length;i++){ if(d[i][12]) ws.push(String(d[i][12])); if(d[i][13]) rs.push(String(d[i][13])); } } }); return { warehouses: [...new Set(ws)].sort(), receivers: [...new Set(rs)].sort() }; } catch(e){return {warehouses:[],receivers:[]};} }
function searchByBillNo(billNo, customer) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var sheet = ss.getSheetByName("INOUT_HW_" + customer) || ss.getSheets()[0]; var data = sheet.getDataRange().getValues(); var results = { duid: "", region: "", ownerWarehouse: "", ownerReceiver: "", locationWarehouse: "", locationReceiver: "", items: [] }; var found = false;
    for (var i = 1; i < data.length; i++) { if (data[i][6] == billNo) { if (!found) { results.duid = data[i][1]; results.region = data[i][2]; results.ownerWarehouse = data[i][12]; results.ownerReceiver = data[i][13]; results.locationWarehouse = data[i][14]; results.locationReceiver = data[i][15]; found = true; } results.items.push({ type: data[i][4], model: data[i][7], code: data[i][8], desc: data[i][9], qty: data[i][10], sn: data[i][11] }); } }
    return found ? { success: true, data: results } : { success: false };
  } catch (e) { return { success: false, error: e.toString() }; }
}