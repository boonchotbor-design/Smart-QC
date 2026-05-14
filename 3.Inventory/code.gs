/*
 * 🚀 Inventory Smart System - MASTER VERSION 5.9.9
 * ALL-IN-ONE: Cascading BOM + 19 Columns + BKK Region + Folder Management
 */

var SPREADSHEET_ID = '1afmWjTNetqHNT69k-jzB3mAdTsFaRdodlJ1hJaJfpSQ';

function doGet(e) {
  try {
    var template = HtmlService.createTemplateFromFile('app');
    return template.evaluate()
        .setTitle('Inventory Smart App V.5.9.9')
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
    
    // จัดการ Folder และรูปภาพ
    var folderUrl = "";
    if (header.photoBase64) {
      folderUrl = uploadInventoryPhoto(header);
    }

    items.forEach(function(item) {
      var lastRow = sheet.getLastRow();
      var nextNo = lastRow > 0 ? (parseInt(sheet.getRange(lastRow, 1).getValue()) || 0) + 1 : 1;
      
      // บันทึก 19 คอลัมน์ (A-S)
      sheet.appendRow([
        nextNo,                  // A: No
        header.project || "",    // B: Project Code
        header.internalProject || "", // C: Internal Project
        header.phaseInternal || "",   // D: Phase Internal
        header.site || "",       // E: Site Code
        header.won || "",        // F: WON
        header.duid || "",       // G: DUID
        header.region || "",     // H: Region
        header.type || "",       // I: IN/OUT
        item.type || "",         // J: Item Category (Type จาก BOM)
        dateStr,                 // K: Pick up Date
        header.billNo || "",     // L: Bill No.
        item.model || "",        // M: Model
        item.code || "",         // N: Item Code
        item.desc || "",         // O: Item Description
        item.qty || 1,           // P: Qty
        item.sn || "",           // Q: Serial
        header.ownerWarehouse || "", // R: Owner warehouse
        header.ownerReceiver || ""   // S: Owner Receiver
      ]);
    });
    return { success: true, message: "บันทึกข้อมูลเรียบร้อย " + items.length + " รายการ" };
  } catch (e) { 
    return { success: false, message: "Error: " + e.toString() }; 
  }
}

function getBOMData(customer) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheetName = customer === "AIS" ? "BOM AIS" : "BOM TRUE";
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    var result = [];
    // คอลัมน์ A:Type, B:Model, C:Code, D:Description
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] || data[i][1]) {
        result.push({ type: data[i][0], model: data[i][1], code: data[i][2], desc: data[i][3] });
      }
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
      if (data[i][11] == billNo) { // คอลัมน์ L (Index 11)
        if (!foundData) {
          foundData = {
            project: data[i][1], internalProject: data[i][2], phaseInternal: data[i][3],
            site: data[i][4], won: data[i][5], duid: data[i][6], region: data[i][7],
            ownerWarehouse: data[i][17], ownerReceiver: data[i][18]
          };
        }
        items.push({ type: data[i][9], model: data[i][12], code: data[i][13], desc: data[i][14], qty: data[i][15], sn: data[i][16] });
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
  
  var blob = Utilities.newBlob(Utilities.base64Decode(h.photoBase64.split(',')[1]), "image/jpeg", h.type.replace("/", "_") + "_" + h.billNo + ".jpg");
  var file = typeFolder.createFile(blob);
  return file.getUrl();
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
    return { 
      header: { 
        billNo: (text.match(/DTH[0-9]{10,15}/) || [""])[0], 
        site: (text.match(/Site:\s*([^\n]+)/i) || ["", ""])[1].trim(), 
        project: (text.match(/Project:\s*([^\n]+)/i) || ["", ""])[1].trim() 
      } 
    };
  } catch (e) { throw "OCR Error: " + e.toString(); }
}
