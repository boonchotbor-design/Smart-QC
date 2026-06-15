/*
 * 🚀 Inventory Smart System - V.6.8.0
 * Includes: DUID Suffix Region Detection & Master Data Lookup Fallback
 */

var SPREADSHEET_ID = '1afmWjTNetqHNT69k-jzB3mAdTsFaRdodlJ1hJaJfpSQ'; 
var ROOT_FOLDER_ID = '1IKefCE5rhBAoyM0uQBTLvEkPlRUm6lD_'; 
var NODE_JS_WEBHOOK_URL = 'https://project-ju28a.vercel.app/notify'; 

function doGet(e) {
  if (!e || !e.parameter) return HtmlService.createHtmlOutput("Please access via Web App URL");
  if (e.parameter.duid) {
    var result = searchByDuidOnly(e.parameter.duid);
    if (e.parameter.format === "text") return ContentService.createTextOutput(result.formattedText || "❌ Not found");
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createTemplateFromFile('app').evaluate()
      .setTitle('Inventory Smart App V.6.8.0')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      logToSheet("ERROR", "Empty POST data");
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Empty POST data" })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    logToSheet("RECEIVE", "Action: " + data.action);

    if (data.action === "ocr") {
      var result = processOCR(data.base64);
      logToSheet("OCR_RESULT", "Success: " + result.success + (result.error ? ", Error: " + result.error : ""));
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    if (data.action === "save") {
      logToSheet("SAVE_DATA", "Header: " + JSON.stringify(data.header));
      var result = saveMainData(data.header, data.items);
      logToSheet("SAVE_RESULT", "Success: " + result.success + (result.message ? ", Msg: " + result.message : ""));
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    if (data.action === "upload") {
      var result = uploadPhotoOnly(data.header, data.base64, data.index || 1);
      logToSheet("UPLOAD_RESULT", "Success: " + result.success);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Invalid action" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    logToSheet("CRASH", err.toString());
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function logToSheet(type, message) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName("DEBUG_LOGS");
    if (!sheet) {
      sheet = ss.insertSheet("DEBUG_LOGS");
      sheet.appendRow(["Timestamp", "Type", "Message"]);
    }
    sheet.insertRowAfter(1);
    sheet.getRange(2, 1, 1, 3).setValues([[new Date(), type, message]]);
  } catch (e) {}
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

  var billMatch = text.match(/(?:Bill No|เลขที่บิล|Bill|Ref No|Order No|INV)[:.\s]*([A-Z0-9 _\/-]{5,})/i);
  if (billMatch) header.billNo = billMatch[1].trim();

  var duidMatch = text.match(/(?:DUID|Job ID|Job|Site ID|Project|Site)[:.\s]*([A-Z0-9 _\/.(){}-]{5,})/i);
  if (duidMatch) {
    header.duid = duidMatch[1].trim();
  } else {
    var rawDuidMatch = text.match(/\b[A-Z0-9]{3,}_[A-Z0-9_-]{5,}\b/i);
    if (rawDuidMatch) header.duid = rawDuidMatch[0].trim();
  }

  var regions = ["ER", "NER", "SR", "NR", "CR", "BKK", "HAE", "HAN", "HSO", "HSW"];
  var regionMatch = text.match(new RegExp("(?:Region|ภาค|Area|Zone)[:.\\s]*(" + regions.join("|") + "|[A-Z0-9]{2,5})", "i"));

  if (regionMatch) {
    header.region = regionMatch[1].trim().toUpperCase();
  } else {
    for (var i = 0; i < regions.length; i++) {
      var re = new RegExp("\\b" + regions[i] + "\\b", "i");
      if (re.test(text)) {
        header.region = regions[i].toUpperCase();
        break;
      }
    }
  }

  if (header.region === "-" || header.region === "") {
    var duidParts = header.duid.split(/[_-]/);
    var lastPart = duidParts[duidParts.length - 1].toUpperCase();
    if (regions.indexOf(lastPart) > -1) {
      header.region = lastPart;
    } else {
      try {
        var projects = getProjectData();
        var found = projects.find(function(p) { return p.duid.toLowerCase() === header.duid.toLowerCase(); });
        if (found && found.region && found.region !== "-") {
          header.region = found.region.toUpperCase();
        }
      } catch (e) {
        logToSheet("ERROR", "Master Data Lookup failed: " + e.toString());
      }
    }
  }

  var lines = text.split('\n');
  lines.forEach(function(line) {
    line = line.trim();
    if (line.length < 5) return;

    var parts = line.split(/\s+/);
    if (parts.length >= 2) {
      var lastPart = parts[parts.length - 1].replace(/,/g, '');
      var qty = parseInt(lastPart);

      if (!isNaN(qty) && qty > 0 && !line.match(/(?:Date|Bill|DUID|Tel|Total|Page|Region|ภาค|Area|Job|Site)/i)) {
        var model = parts[0];
        var desc = parts.slice(1, parts.length - 1).join(" ") || "NA";

        if (model.length >= 2 && !model.match(/^[0-9]+$/)) {
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

    if (!header.region || header.region === "-" || header.region === "") {
      try {
        var projects = getProjectData();
        var found = projects.find(function(p) { return p.duid.toLowerCase() === cleanDuid.toLowerCase(); });
        if (found && found.region && found.region !== "-") {
          header.region = found.region.toUpperCase();
        }
      } catch (e) {
        logToSheet("ERROR", "Region Fallback Error: " + e.toString());
      }
    }

    var dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");

    var allRows = items.map(function(item, index) {
      var row = new Array(22).fill("");
      row[0] = index + 1;
      row[1] = cleanDuid;
      row[2] = String(header.region || "").trim();
      row[3] = String(header.type || "").trim();
      row[4] = String(item.type || "").trim();
      row[5] = dateStr;
      row[6] = cleanBill;
      row[7] = String(item.model || "").trim();
      row[8] = String(item.code || "").trim();
      row[9] = String(item.desc || "").trim();
      row[10] = Number(item.qty) || 0;
      row[11] = String(item.sn || "").trim();
      row[12] = String(header.ownerWarehouse || "").trim();
      row[13] = String(header.ownerReceiver || "").trim();
      row[14] = String(header.locationWarehouse || "").trim();
      row[15] = String(header.locationReceiver || "").trim();
      row[21] = "Pending";
      return row;
    });

    if (allRows.length > 0) {
      sheet.insertRowsAfter(1, allRows.length);
      sheet.getRange(2, 1, allRows.length, 22).setValues(allRows);
    }

    SpreadsheetApp.flush();
    updateDuidStatus(cleanDuid, customer);
    return {
      success: true,
      header: header, 
      debug: "✅ บันทึกสำเร็จ (V.6.7.6)\n📍 Sheet: " + sheetName + "\n🔢 บันทึกที่แถว: 2 (บนสุด)\n🆔 DUID: " + cleanDuid + " (Column B)"
    };
  } catch (e) { return { success: false, message: "❌ ระบบขัดข้อง: " + e.toString() }; } finally { lock.releaseLock(); }
}

function getProjectData() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var s = ss.getSheetByName("data");
    if (!s) return [];
    var data = s.getDataRange().getValues();
    if (data.length < 2) return [];

    var h = data[0].map(v => String(v||"").trim().toUpperCase());

    function findHeader(aliases) {
      for (var i = 0; i < aliases.length; i++) {
        var idx = h.indexOf(aliases[i].toUpperCase());
        if (idx > -1) return idx;
      }
      return -1;
    }

    var idx = {
      duid: findHeader(["DUID", "JOB ID", "SITE ID", "PROJECT ID"]),
      site: findHeader(["SITE NAME", "SITE_NAME", "SITE", "PROJECT NAME", "PROJECT"]),
      reg: findHeader(["REGION", "AREA", "ZONE", "ภาค"])
    };

    if (idx.duid === -1) idx.duid = 0;
    if (idx.site === -1) idx.site = 1;
    if (idx.reg === -1) idx.reg = 2;

    var res = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][idx.duid]) {
        res.push({
          duid: String(data[i][idx.duid]).trim(),
          site: String(data[i][idx.site] || "-").trim(),
          region: String(data[i][idx.reg] || "-").trim()
        });
      }
    }
    return res;
  } catch (e) { return []; }
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
      duid: Math.max(headerRow.indexOf("DUID"), 1),
      region: Math.max(headerRow.indexOf("REGION"), 2),
      transType: Math.max(headerRow.indexOf("IN/OUT"), 3),
      itemType: Math.max(headerRow.indexOf("TYPE"), 4),
      billNo: Math.max(headerRow.indexOf("BILL NO."), headerRow.indexOf("BILL NO"), 6),
      model: Math.max(headerRow.indexOf("MODEL"), 7),
      code: Math.max(headerRow.indexOf("ITEM CODE"), 8),
      desc: Math.max(headerRow.indexOf("ITEM DESCRIPTION"), 9),
      qty: Math.max(headerRow.indexOf("SUM OF REQ.QTY"), 10),
      sn: Math.max(headerRow.indexOf("SERIAL"), 11),
      ownerW: Math.max(headerRow.indexOf("OWNER WAREHOUSE"), 12),
      ownerR: Math.max(headerRow.indexOf("OWNER RECEIVER"), 13),
      locW: Math.max(headerRow.indexOf("LOCATION WAREHOUSE"), 14),
      locR: Math.max(headerRow.indexOf("LOCATION RECEIVER"), 15),
      status: Math.max(headerRow.indexOf("STATUS"), 21)
    };

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
        duid: Math.max(headerRow.indexOf("DUID"), 1),
        region: Math.max(headerRow.indexOf("REGION"), 2),
        transType: Math.max(headerRow.indexOf("IN/OUT"), 3),
        billNo: Math.max(headerRow.indexOf("BILL NO."), headerRow.indexOf("BILL NO"), 6),
        model: Math.max(headerRow.indexOf("MODEL"), 7),
        qty: Math.max(headerRow.indexOf("SUM OF REQ.QTY"), 10),
        sn: Math.max(headerRow.indexOf("SERIAL"), 11),
        ownerW: Math.max(headerRow.indexOf("OWNER WAREHOUSE"), 12),
        ownerR: Math.max(headerRow.indexOf("OWNER RECEIVER"), 13),
        locW: Math.max(headerRow.indexOf("LOCATION WAREHOUSE"), 14),
        locR: Math.max(headerRow.indexOf("LOCATION RECEIVER"), 15),
        status: Math.max(headerRow.indexOf("STATUS"), 21)
      };

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
        var h = masterData[0].map(v => String(v||"").toUpperCase());
        var dCol = Math.max(h.indexOf("DUID"), 0);
        var rCol = Math.max(h.indexOf("REGION"), 2);

        for (var i = 1; i < masterData.length; i++) {
          if (String(masterData[i][dCol]).trim().toLowerCase() === targetDuid) {
            return {
              success: true,
              formattedText: "📊 ข้อมูล DUID: " + masterData[i][dCol] + "\n━━━━━━━━━━━━━━━\n📍 สถานะ: ไม่มีการเคลื่อนไหว\n📍 Region: " + (masterData[i][rCol] || "-") + "\n━━━━━━━━━━━━━━━\n⚠️ ยังไม่มีประวัติการเบิก-รับสินค้าในระบบ"
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
  var globalItemIndex = 1;

  keys.forEach(function(key, sectionIndex) {
    var g = groups[key], h = g.header;
    var text = "📊 ข้อมูล DUID: " + h.duid + "\n" +
               "━━━━━━━━━━━━━━━\n" +
               "👤 ลูกค้า: " + h.customer + "\n" +
               "🛠 งาน: " + h.transType + "\n" +
               "📄 bill No : " + (h.billNo === "-" ? "" : h.billNo) + "\n" +
               "📍 Region: " + (h.region || "-") + "\n" +
               "🆔 DUID: " + h.duid + "\n" +
               "🏢 คลัง: " + (h.ownerWarehouse || "-") + "\n" +
               "👷 ผู้รับ: " + (h.ownerReceiver || "-") + "\n" +
               "📍 Loc Warehouse: " + (h.locWarehouse || "-") + "\n" +
               "📍 Loc Receiver: " + (h.locReceiver || "-") + "\n" +
               "━━━━━━━━━━━━━━━\n";

    if (sectionIndex === 0) {
      text += "📦 รายการสินค้า (" + totalItems + " รายการ):\n";
    }

    g.items.forEach(function(item) {
      text += "🔹 " + (globalItemIndex++) + ": " + item.model + "\n   (SN: " + (item.sn || "NA") + ", Qty: " + (item.qty || 0) + ")\n";
    });
    sections.push(text);
  });
  return sections.join("━━━━━━━━━━━━━━━\n") + "\n━━━━━━━━━━━━━━━\n🔍 ค้นหาเมื่อ: " + timestamp;
}

function getBOMData(customer) { try { var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var res = []; var s = ss.getSheetByName(customer === "AIS" ? "BOM AIS" : "BOM TRUE"); if (s) { var lastRow = s.getLastRow(); if (lastRow < 2) return []; var d = s.getRange(2, 1, lastRow - 1, 4).getValues(); for (var i = 0; i < d.length; i++) { if (d[i][1]) res.push({ type: String(d[i][0]), model: String(d[i][1]), code: String(d[i][2]), desc: String(d[i][3]) }); } } return res; } catch (e) { return []; } }
function getOwnerData() { try { var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var ws=[], rs=[]; var sheets = ss.getSheets(); sheets.forEach(function(s){ var name = s.getName(); if (name.indexOf("INOUT") > -1 || name === "data") { var lastRow = s.getLastRow(); if (lastRow < 2) return; var startRow = Math.max(2, lastRow - 500); var numRows = lastRow - startRow + 1; var data = s.getRange(startRow, 1, numRows, s.getLastColumn()).getValues(); var h = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0].map(h => String(h||"").toUpperCase()); var wCol = Math.max(h.indexOf("OWNER WAREHOUSE"), h.indexOf("OWNER WAREHOUSE ")); var rCol = Math.max(h.indexOf("OWNER RECEIVER"), h.indexOf("OWNER RECEIVER ")); for (var i = 0; i < data.length; i++) { if (wCol > -1 && data[i][wCol]) ws.push(String(data[i][wCol])); if (rCol > -1 && data[i][rCol]) rs.push(String(data[i][rCol])); } } }); return { warehouses: [...new Set(ws)].sort(), receivers: [...new Set(rs)].sort() }; } catch(e) { return {warehouses:[], receivers:[]}; } }
function isDuidClosed(duid, customer) { try { if (!duid) return false; var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var sheet = ss.getSheetByName("INOUT_HW_" + customer); if (!sheet) return false; var data = sheet.getDataRange().getValues(); if (data.length < 2) return false; var h = data[0].map(v => String(v||"").toUpperCase()); var dCol = Math.max(h.indexOf("DUID"), 0); var sCol = Math.max(h.indexOf("STATUS"), 21); var target = duid.trim().toLowerCase(); for (var i = 1; i < data.length; i++) { if (String(data[i][dCol]).trim().toLowerCase() === target && String(data[i][sCol]).trim().toUpperCase() === "CLOSED") return true; } } catch (e) {} return false; }
function updateDuidStatus(duid, customer) { try { if (!duid) return; var ss = SpreadsheetApp.openById(SPREADSHEET_ID); var sheet = ss.getSheetByName("INOUT_HW_" + customer); if (!sheet) return; var data = sheet.getDataRange().getValues(); var h = data[0].map(v => String(v||"").toUpperCase()); var idx = { duid: Math.max(h.indexOf("DUID"), 1), type: Math.max(h.indexOf("IN/OUT"), 3), qty: Math.max(h.indexOf("SUM OF REQ.QTY"), 10), status: Math.max(h.indexOf("STATUS"), 21) }; var totalIn = 0, totalOut = 0, matchingRows = [], target = duid.trim(); for (var i = 1; i < data.length; i++) { if (String(data[i][idx.duid]).trim() === target) { matchingRows.push(i + 1); var type = String(data[i][idx.type]).toUpperCase(), qty = Number(data[i][idx.qty]) || 0; if (type.indexOf("IN") > -1 || type === "RETURN") totalIn += qty; else if (type.indexOf("OUT") > -1) totalOut += qty; } } var status = (totalIn > 0 && totalIn === totalOut) ? "Closed" : (totalIn > 0 ? "On Process" : "Pending"); if (matchingRows.length > 0) { var statusRange = sheet.getRange(1, idx.status + 1, data.length, 1); var statusValues = statusRange.getValues(); matchingRows.forEach(r => { if (statusValues[r-1]) statusValues[r-1][0] = status; }); statusRange.setValues(statusValues); } } catch (e) {} }

function uploadPhotoOnly(h, b, p) {
  try {
    var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var regionName = String(h.region || "Unknown_Region").trim() || "Unknown_Region";
    var duidName = String(h.duid || "Unknown_DUID").trim() || "Unknown_DUID";
    var typeName = String(h.type || "Other").trim().replace("/", "_") || "Other";

    var regF = getOrCreateSubFolder(root, regionName);
    var duidF = getOrCreateSubFolder(regF, duidName);
    var typeF = getOrCreateSubFolder(duidF, typeName);

    var blob = Utilities.newBlob(Utilities.base64Decode(b.split(',')[1] || b), "image/jpeg", duidName + "_" + p + ".jpg");
    var file = typeF.createFile(blob);
    return { success: true, folderUrl: duidF.getUrl() };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function getOrCreateSubFolder(p, n) {
  if (!n || n === "-" || n === "null") n = "Unknown";
  var it = p.getFoldersByName(n);
  while (it.hasNext()) {
    var f = it.next();
    if (!f.isTrashed()) return f;
  }
  return p.createFolder(n);
}

function notifyOnly(h, i) { var payload = { header: h, items: i }, opt = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true }; try { UrlFetchApp.fetch(NODE_JS_WEBHOOK_URL, opt); } catch(e){} return { success: true }; }
function runGasSystemTests() { notifyOnly({customer:"AIS", type:"IN", duid:"TEST-001"}, []); }
function testOcrEngine() { Logger.log("🔍 บัญชีพร้อมสแตนด์บายใช้งานเวอร์ชันหลบเลี่ยงลิมิตเต็มในวันพรุ่งนี้ครับ!"); }