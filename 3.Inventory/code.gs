/*
 * Inventory Smart System - V.7.4.1
 * Includes: DUID Suffix Region Detection, Master Data Lookup Fallback,
 *           Status Check API, User Tracking & Audit Log System
 * Fix V.6.9.1: Server-side email detection + deploy mode fallback
 * Fix V.6.9.2: DISMANTLE/RETURN status logic — ติดตาม row existence แยกจาก qty
 *              ป้องกัน DISMANTLE หรือ RETURN เดี่ยวๆ แสดง Closed ผิดๆ
 * Fix V.6.9.3: getDuidStatus ใช้ computeDuidStatus (live) แทนการอ่าน STATUS column
 *              แก้ DISMANTLE เห็น "Closed" และ RETURN แล้วไม่ Close
 *              app.html: Email Whitelist Dropdown + Add Own Email + Device Detection
 * Fix V.6.9.4: computeDuidStatus ใช้ case-insensitive compare (toLowerCase) ในทุกจุด
 *              getDuidStatus: normalize target เป็น lowercase ก่อนเปรียบเทียบ
 *              app.html: เพิ่ม DUID threshold จาก 3 → 5 ตัว ลด false call
 * V.7.1.2: Fixed multiple bots sending duplicate push messages issue by adding failover break.
 */

var SPREADSHEET_ID      = '1afmWjTNetqHNT69k-jzB3mAdTsFaRdodlJ1hJaJfpSQ';
var ROOT_FOLDER_ID      = '1IKefCE5rhBAoyM0uQBTLvEkPlRUm6lD_';
var NODE_JS_WEBHOOK_URL = 'https://project-ju28a.vercel.app/notify';

// ─────────────────────────────────────────────
// ENTRY POINTS
// ─────────────────────────────────────────────

function doGet(e) {
  if (!e || !e.parameter) return HtmlService.createHtmlOutput("Please access via Web App URL");

  if (e.parameter.export === "dashboard") {
    var result = getDashboardData();
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (e.parameter.duid) {
    var result = searchByDuidOnly(e.parameter.duid);
    if (e.parameter.format === "text")
      return ContentService.createTextOutput(result.formattedText || "❌ Not found");
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (e.parameter.page === "dashboard") {
    return HtmlService.createTemplateFromFile('dashboard').evaluate()
      .setTitle('Inventory Dashboard V.7.3.0')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService.createTemplateFromFile('app').evaluate()
    .setTitle('Inventory Smart App V.7.3.0')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      logToSheet("ERROR", "Empty POST data");
      return jsonOut({ success: false, message: "Empty POST data" });
    }

    var data = JSON.parse(e.postData.contents);

    // ── ใช้ข้อมูล User จาก Client (localStorage) 100% ──
    var userEmail = data.userEmail || "Unknown (Web)";
    var userName  = data.userName  || "Web User";

    logToSheet("RECEIVE", "Action: " + data.action + " | User: " + userEmail);

    if (data.action === "ocr") {
      var result = processOCR(data.base64);
      logToSheet("OCR_RESULT", "Success: " + result.success + (result.error ? ", Error: " + result.error : ""));
      return jsonOut(result);
    }

    if (data.action === "save") {
      logToSheet("SAVE_DATA", "Header: " + JSON.stringify(data.header) + " | User: " + userEmail);
      var result = saveMainData(data.header, data.items, userEmail, userName);
      logToSheet("SAVE_RESULT", "Success: " + result.success + (result.message ? ", Msg: " + result.message : ""));
      return jsonOut(result);
    }

    if (data.action === "upload") {
      var result = uploadPhotoOnly(data.header, data.base64, data.index || 1, userEmail, userName);
      logToSheet("UPLOAD_RESULT", "Success: " + result.success + " | User: " + userEmail);
      return jsonOut(result);
    }

    return jsonOut({ success: false, message: "Invalid action" });

  } catch (err) {
    logToSheet("CRASH", err.toString());
    return jsonOut({ success: false, message: err.toString() });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────
// USER TRACKING
// ─────────────────────────────────────────────

/**
 * ดึงข้อมูล User ปัจจุบัน (เรียกจาก client ผ่าน google.script.run)
 * V.6.9.1: ลอง getActiveUser ก่อน ถ้าไม่ได้ลอง getEffectiveUser
 */
function getCurrentUser() {
  try {
    var email = "";
    try { email = Session.getActiveUser().getEmail() || ""; } catch (e) {}
    if (!email) {
      try { email = Session.getEffectiveUser().getEmail() || ""; } catch (e) {}
    }

    if (!email) return { email: "Unknown (System)", name: "Unknown User" };

    var name = "";
    try { name = ContactsApp.getContact(email).getFullName(); } catch (e) {}
    return { email: email, name: name || email.split("@")[0] };
  } catch (e) {
    return { email: "Unknown (System)", name: "Unknown User" };
  }
}

// ─────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────

/**
 * บันทึก Audit Log ทุกการกระทำ
 */
function logAuditEntry(action, userEmail, userName, sheetName, duid, billNo, detail) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName("AUDIT_LOG");

    if (!sheet) {
      sheet = ss.insertSheet("AUDIT_LOG");
      sheet.appendRow(["Timestamp", "User Email", "User Name", "Action",
                       "Sheet", "DUID", "Bill No", "Detail"]);
      sheet.setFrozenRows(1);
      var header = sheet.getRange(1, 1, 1, 8);
      header.setBackground("#1a73e8").setFontColor("#ffffff").setFontWeight("bold");
      sheet.setColumnWidths(1, 8, 180);
    }

    var timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
    sheet.insertRowAfter(1);
    sheet.getRange(2, 1, 1, 8).setValues([[
      timestamp,
      userEmail  || "Unknown (User)",
      userName   || "Unknown (User)",
      action,
      sheetName  || "-",
      duid       || "-",
      billNo     || "-",
      detail     || "-"
    ]]);
  } catch (e) {
    logToSheet("AUDIT_ERROR", e.toString());
  }
}

/**
 * On-Edit Trigger — บันทึกเมื่อมีการแก้ไข Sheet โดยตรง
 * ครอบคลุม INOUT_HW_AIS และ INOUT_HW_TRUE
 */
function onEditAudit(e) {
  try {
    var sheet     = e.range.getSheet();
    var sheetName = sheet.getName();
    var targets   = ["INOUT_HW_AIS", "INOUT_HW_TRUE"];
    if (targets.indexOf(sheetName) === -1) return;

    var row = e.range.getRow();
    var col = e.range.getColumn();
    if (row < 2) return;

    var ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
    var dataSheet = ss.getSheetByName(sheetName);
    var headers   = dataSheet.getRange(1, 1, 1, dataSheet.getLastColumn()).getValues()[0];
    var colName   = headers[col - 1] || ("Column " + col);

    var duid   = String(dataSheet.getRange(row, 2).getValue() || "-");
    var billNo = String(dataSheet.getRange(row, 7).getValue() || "-");

    var oldVal = e.oldValue !== undefined ? String(e.oldValue) : "(ไม่มีค่าเดิม)";
    var newVal = e.value    !== undefined ? String(e.value)    : "(ลบค่า)";

    // V.6.9.1: ดึง email จาก session ให้ได้มากที่สุด
    var userEmail = "";
    try { userEmail = Session.getActiveUser().getEmail() || ""; } catch (ex) {}
    if (!userEmail) {
      try { userEmail = Session.getEffectiveUser().getEmail() || ""; } catch (ex) {}
    }
    if (!userEmail) userEmail = "Unknown (Sheet)";
    var userName = userEmail.split("@")[0];

    var detail = "แก้ไข [" + colName + "] แถว " + row +
                 " | เดิม: \"" + oldVal + "\" → ใหม่: \"" + newVal + "\"";

    logAuditEntry("EDIT_CELL", userEmail, userName, sheetName, duid, billNo, detail);

  } catch (err) {
    logToSheet("ONEDIT_ERROR", err.toString());
  }
}

/**
 * ติดตั้ง onEdit Trigger แบบ Installable (รันครั้งเดียว)
 */
function installOnEditTrigger() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "onEditAudit") {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger("onEditAudit")
    .forSpreadsheet(ss)
    .onEdit()
    .create();
  Logger.log("✅ Installed onEditAudit trigger");
}

// ─────────────────────────────────────────────
// DEBUG LOG
// ─────────────────────────────────────────────

function logToSheet(type, message) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName("DEBUG_LOGS");
    if (!sheet) {
      sheet = ss.insertSheet("DEBUG_LOGS");
      sheet.appendRow(["Timestamp", "Type", "Message"]);
    }
    sheet.insertRowAfter(1);
    sheet.getRange(2, 1, 1, 3).setValues([[new Date(), type, message]]);
  } catch (e) {}
}

// ─────────────────────────────────────────────
// OCR
// ─────────────────────────────────────────────

function processOCR(base64) {
  try {
    var blob     = Utilities.newBlob(Utilities.base64Decode(base64), "image/jpeg", "ocr_temp.jpg");
    var resource = { title: 'ocr_temp', mimeType: 'image/jpeg' };
    var file     = Drive.Files.insert(resource, blob, { ocr: true, ocrLanguage: 'en,th' });
    var doc      = DocumentApp.openById(file.id);
    var text     = doc.getBody().getText();
    Drive.Files.remove(file.id);
    return { success: true, text: text, data: parsePickingList(text) };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─────────────────────────────────────────────
// PARSE PICKING LIST
// ─────────────────────────────────────────────

function parsePickingList(text) {
  if (!text || typeof text !== 'string')
    return { header: { type: "OUT", customer: "AIS", region: "-", duid: "-", billNo: "-" }, items: [] };

  var header = { type: "OUT", customer: "AIS", region: "-", duid: "-", billNo: "-" };
  var items  = [];

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
  var regionMatch = text.match(
    new RegExp("(?:Region|ภาค|Area|Zone)[:.\\s]*(" + regions.join("|") + "|[A-Z0-9]{2,5})", "i")
  );

  if (regionMatch) {
    header.region = regionMatch[1].trim().toUpperCase();
  } else {
    for (var i = 0; i < regions.length; i++) {
      if (new RegExp("\\b" + regions[i] + "\\b", "i").test(text)) {
        header.region = regions[i].toUpperCase();
        break;
      }
    }
  }

  if (header.region === "-" || header.region === "") {
    var duidParts = header.duid.split(/[_-]/);
    var lastPart  = duidParts[duidParts.length - 1].toUpperCase();
    if (regions.indexOf(lastPart) > -1) {
      header.region = lastPart;
    } else {
      try {
        var projects = getProjectData();
        var found = projects.find(function(p) {
          return p.duid.toLowerCase() === header.duid.toLowerCase();
        });
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
    var parts    = line.split(/\s+/);
    if (parts.length < 2) return;
    var lastPart = parts[parts.length - 1].replace(/,/g, '');
    var qty      = parseInt(lastPart);
    if (!isNaN(qty) && qty > 0 &&
        !line.match(/(?:Date|Bill|DUID|Tel|Total|Page|Region|ภาค|Area|Job|Site)/i)) {
      var model = parts[0];
      var desc  = parts.slice(1, parts.length - 1).join(" ") || "NA";
      if (model.length >= 2 && !model.match(/^[0-9]+$/)) {
        items.push({ type: "OUT", model: model, code: "NA", desc: desc, qty: qty, sn: "NA" });
      }
    }
  });

  return { header: header, items: items };
}

// ─────────────────────────────────────────────
// SAVE MAIN DATA (+ User Tracking)
// ─────────────────────────────────────────────

function saveMainData(header, items, userEmail, userName) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    if (!header || !items || items.length === 0)
      return { success: false, message: "❌ ข้อมูลไม่สมบูรณ์" };

    var ss       = SpreadsheetApp.openById(SPREADSHEET_ID);
    var customer = (header.customer || "AIS").toString().trim().toUpperCase();
    var sheetName = "INOUT_HW_" + customer;
    var sheet    = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: "❌ ไม่พบหน้า Sheet: " + sheetName };

    var cleanDuid = String(header.duid   || "").trim();
    var cleanBill = String(header.billNo || "").trim();

    // Region Fallback
    if (!header.region || header.region === "-" || header.region === "") {
      try {
        var projects = getProjectData();
        var found = projects.find(function(p) {
          return p.duid.toLowerCase() === cleanDuid.toLowerCase();
        });
        if (found && found.region && found.region !== "-")
          header.region = found.region.toUpperCase();
      } catch (e) {
        logToSheet("ERROR", "Region Fallback Error: " + e.toString());
      }
    }

    var dateStr    = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    var internalNo = generateInternalNo(sheet, String(header.region || "ER").trim().toUpperCase());

    var maxRunningNo = 0;
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var existingData = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
      for (var r = 0; r < existingData.length; r++) {
        if (String(existingData[r][1]).trim().toLowerCase() === cleanDuid.toLowerCase()) {
          var num = Number(existingData[r][0]);
          if (!isNaN(num) && num > maxRunningNo) maxRunningNo = num;
        }
      }
    }

    // สร้าง rows (25 columns: 0-22 เดิม + 23=userEmail + 24=userName)
    var allRows = items.map(function(item, index) {
      var row = new Array(25).fill("");
      row[0]  = maxRunningNo + index + 1;
      row[1]  = cleanDuid;
      row[2]  = String(header.region            || "").trim();
      row[3]  = String(header.type              || "").trim();
      row[4]  = String(item.type                || "").trim();
      row[5]  = dateStr;
      row[6]  = cleanBill;
      row[7]  = String(item.model               || "").trim();
      row[8]  = String(item.code                || "").trim();
      row[9]  = String(item.desc                || "").trim();
      row[10] = Number(item.qty) || 0;
      row[11] = String(item.sn                  || "").trim();
      row[12] = String(header.ownerWarehouse    || "").trim();
      row[13] = String(header.ownerReceiver     || "").trim();
      row[14] = String(header.locationWarehouse || "").trim();
      row[15] = String(header.locationReceiver  || "").trim();
      row[21] = "Pending";
      row[22] = internalNo;
      row[23] = userEmail || "Unknown";  // Col X — User Email
      row[24] = userName  || "Unknown";  // Col Y — User Name
      return row;
    });

    if (allRows.length > 0) {
      sheet.insertRowsAfter(1, allRows.length);
      sheet.getRange(2, 1, allRows.length, 25).setValues(allRows);
    }

    SpreadsheetApp.flush();
    updateDuidStatus(cleanDuid, customer);

    logAuditEntry(
      "SAVE_NEW",
      userEmail,
      userName,
      sheetName,
      cleanDuid,
      cleanBill,
      "บันทึก " + items.length + " รายการ | Type: " + header.type + " | Region: " + header.region
    );

    // ── แจ้งเตือน LINE + Telegram ทันที หลังบันทึกสำเร็จ ──
    if (!header.userName) header.userName = userName || userEmail || "Web User";
    if (!header.userEmail) header.userEmail = userEmail || "Unknown (Web)";
    try {
      notifyOnly(header, items);
    } catch (notifyErr) {
      logToSheet("NOTIFY_FROM_SAVE_ERROR", notifyErr.toString());
    }

    return {
      success: true,
      header:  header,
      debug:   "✅ บันทึกสำเร็จ (V.7.3.0)\n📍 Sheet: " + sheetName +
               "\n🔢 บันทึกที่แถว: 2 (บนสุด)\n🆔 DUID: " + cleanDuid +
               " (Column B)\n👤 โดย: " + (userName || userEmail || "Unknown")
    };

  } catch (e) {
    return { success: false, message: "❌ ระบบขัดข้อง: " + e.toString() };
  } finally {
    lock.releaseLock();
  }
}

// ─────────────────────────────────────────────
// GENERATE INTERNAL NO
// ─────────────────────────────────────────────

function generateInternalNo(sheet, region) {
  var d      = new Date();
  var yyyy   = Utilities.formatDate(d, "GMT+7", "yyyy");
  var mm     = Utilities.formatDate(d, "GMT+7", "MM");
  var prefix = "TLN-" + region + "-" + yyyy + "-" + mm + "-";

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return prefix + "0001";

  var data   = sheet.getRange(2, 23, lastRow - 1, 1).getValues();
  var maxNum = 0;
  for (var i = 0; i < data.length; i++) {
    var val = String(data[i][0]).trim();
    if (val.indexOf(prefix) === 0) {
      var numPart = parseInt(val.replace(prefix, ""), 10);
      if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
    }
  }
  return prefix + ("000" + (maxNum + 1)).slice(-4);
}

// ─────────────────────────────────────────────
// PROJECT / MASTER DATA
// ─────────────────────────────────────────────

function getProjectData() {
  try {
    var ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
    var s    = ss.getSheetByName("data");
    if (!s) return [];
    var data = s.getDataRange().getValues();
    if (data.length < 2) return [];

    var h = data[0].map(function(v) { return String(v || "").trim().toUpperCase(); });

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
      reg:  findHeader(["REGION", "AREA", "ZONE", "ภาค"])
    };
    if (idx.duid === -1) idx.duid = 0;
    if (idx.site === -1) idx.site = 1;
    if (idx.reg  === -1) idx.reg  = 2;

    var res = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][idx.duid]) {
        res.push({
          duid:   String(data[i][idx.duid]).trim(),
          site:   String(data[i][idx.site] || "-").trim(),
          region: String(data[i][idx.reg]  || "-").trim()
        });
      }
    }
    return res;
  } catch (e) { return []; }
}

function saveBOMData(customer, data) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var s = ss.getSheetByName(customer === "AIS" ? "BOM AIS" : "BOM TRUE");
    if (!s) return { success: false, error: "Sheet not found" };

    var lastRow = s.getLastRow();
    if (lastRow > 1) {
      s.getRange(2, 1, lastRow - 1, 4).clearContent();
    }

    if (data && data.length > 0) {
      var values = data.map(function(item) {
        return [item.type || "", item.model || "", item.code || "", item.desc || ""];
      });
      s.getRange(2, 1, values.length, 4).setValues(values);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────

function searchByBillNo(billNo, customer) {
  try {
    var ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheetName = "INOUT_HW_" + (customer || "AIS").toString().toUpperCase();
    var sheet     = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: "❌ ไม่พบหน้า Sheet: " + sheetName };

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: false, message: "❌ ไม่มีข้อมูลในระบบ" };

    var headerRow = data[0].map(function(h) { return String(h || "").trim().toUpperCase(); });
    var idx = {
      duid:      Math.max(headerRow.indexOf("DUID"), 1),
      region:    Math.max(headerRow.indexOf("REGION"), 2),
      transType: Math.max(headerRow.indexOf("IN/OUT"), 3),
      itemType:  Math.max(headerRow.indexOf("TYPE"), 4),
      billNo:    Math.max(headerRow.indexOf("BILL NO."), headerRow.indexOf("BILL NO"), 6),
      model:     Math.max(headerRow.indexOf("MODEL"), 7),
      code:      Math.max(headerRow.indexOf("ITEM CODE"), 8),
      desc:      Math.max(headerRow.indexOf("ITEM DESCRIPTION"), 9),
      qty:       Math.max(headerRow.indexOf("SUM OF REQ.QTY"), 10),
      sn:        Math.max(headerRow.indexOf("SERIAL"), 11),
      ownerW:    Math.max(headerRow.indexOf("OWNER WAREHOUSE"), 12),
      ownerR:    Math.max(headerRow.indexOf("OWNER RECEIVER"), 13),
      locW:      Math.max(headerRow.indexOf("LOCATION WAREHOUSE"), 14),
      locR:      Math.max(headerRow.indexOf("LOCATION RECEIVER"), 15),
      status:    Math.max(headerRow.indexOf("STATUS"), 21)
    };

    var targetBill = String(billNo || "").trim().toLowerCase();
    var results = {
      duid: "", region: "", ownerWarehouse: "", ownerReceiver: "",
      locationWarehouse: "", locationReceiver: "", items: []
    };
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idx.billNo] || "").trim().toLowerCase() === targetBill) {
        if (!found) {
          results.duid              = String(data[i][idx.duid]   || "");
          results.region            = String(data[i][idx.region] || "");
          results.ownerWarehouse    = String(data[i][idx.ownerW] || "");
          results.ownerReceiver     = String(data[i][idx.ownerR] || "");
          results.locationWarehouse = String(data[i][idx.locW]   || "");
          results.locationReceiver  = String(data[i][idx.locR]   || "");
          results.status            = String(data[i][idx.status] || "");
          found = true;
        }
        results.items.push({
          type:  String(data[i][idx.itemType] || ""),
          model: String(data[i][idx.model]    || ""),
          code:  String(data[i][idx.code]     || ""),
          desc:  String(data[i][idx.desc]     || ""),
          qty:   data[i][idx.qty] || 0,
          sn:    String(data[i][idx.sn]       || "")
        });
      }
    }
    return found
      ? { success: true, data: results }
      : { success: false, message: "❌ ไม่พบเลขบิล: " + billNo };
  } catch (e) { return { success: false, message: e.toString() }; }
}

function searchDuidForUI(duid) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var targetSheets = ["INOUT_HW_AIS", "INOUT_HW_TRUE"];
    var results = {
      duid: "", region: "", ownerWarehouse: "", ownerReceiver: "",
      locationWarehouse: "", locationReceiver: "", items: []
    };
    var found = false;
    var targetDuid = String(duid || "").trim().toLowerCase();

    targetSheets.forEach(function(sheetName) {
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) return;
      var data = sheet.getDataRange().getValues();
      if (data.length < 2) return;

      var headerRow = data[0].map(function(h) { return String(h || "").trim().toUpperCase(); });
      var idx = {
        duid:      Math.max(headerRow.indexOf("DUID"), 1),
        region:    Math.max(headerRow.indexOf("REGION"), 2),
        transType: Math.max(headerRow.indexOf("IN/OUT"), 3),
        itemType:  Math.max(headerRow.indexOf("TYPE"), 4),
        billNo:    Math.max(headerRow.indexOf("BILL NO."), headerRow.indexOf("BILL NO"), 6),
        model:     Math.max(headerRow.indexOf("MODEL"), 7),
        code:      Math.max(headerRow.indexOf("ITEM CODE"), 8),
        desc:      Math.max(headerRow.indexOf("ITEM DESCRIPTION"), 9),
        qty:       Math.max(headerRow.indexOf("SUM OF REQ.QTY"), 10),
        sn:        Math.max(headerRow.indexOf("SERIAL"), 11),
        ownerW:    Math.max(headerRow.indexOf("OWNER WAREHOUSE"), 12),
        ownerR:    Math.max(headerRow.indexOf("OWNER RECEIVER"), 13),
        locW:      Math.max(headerRow.indexOf("LOCATION WAREHOUSE"), 14),
        locR:      Math.max(headerRow.indexOf("LOCATION RECEIVER"), 15),
        status:    Math.max(headerRow.indexOf("STATUS"), 21)
      };

      for (var i = 1; i < data.length; i++) {
        if (String(data[i][idx.duid] || "").trim().toLowerCase() === targetDuid) {
          if (!found) {
            results.duid              = String(data[i][idx.duid]   || "");
            results.region            = String(data[i][idx.region] || "");
            results.ownerWarehouse    = String(data[i][idx.ownerW] || "");
            results.ownerReceiver     = String(data[i][idx.ownerR] || "");
            results.locationWarehouse = String(data[i][idx.locW]   || "");
            results.locationReceiver  = String(data[i][idx.locR]   || "");
            results.status            = String(data[i][idx.status] || "");
            found = true;
          }
          results.items.push({
            billNo: String(data[i][idx.billNo] || ""),
            transType: String(data[i][idx.transType] || ""),
            type:  String(data[i][idx.itemType] || ""),
            model: String(data[i][idx.model]    || ""),
            code:  String(data[i][idx.code]     || ""),
            desc:  String(data[i][idx.desc]     || ""),
            qty:   data[i][idx.qty] || 0,
            sn:    String(data[i][idx.sn]       || "")
          });
        }
      }
    });

    return found
      ? { success: true, data: results }
      : { success: false, message: "❌ ไม่พบข้อมูล DUID: " + duid };
  } catch (e) { return { success: false, message: e.toString() }; }
}

function searchByDuidOnly(duid) {
  if (!duid) return { success: false, message: "❌ กรุณาระบุ DUID" };
  try {
    var ss           = SpreadsheetApp.openById(SPREADSHEET_ID);
    var targetSheets = ["INOUT_HW_AIS", "INOUT_HW_TRUE"];
    var groups       = {}, found = false, totalItemsCount = 0;
    var targetDuid   = duid.toString().trim().toLowerCase();
    var currentStatus = "Pending";

    targetSheets.forEach(function(sName) {
      var sheet = ss.getSheetByName(sName);
      if (!sheet) return;
      var data = sheet.getDataRange().getValues();
      if (data.length < 2) return;

      var h = data[0].map(function(v) { return String(v || "").trim().toUpperCase(); });
      var idx = {
        duid:      Math.max(h.indexOf("DUID"), 1),
        region:    Math.max(h.indexOf("REGION"), 2),
        transType: Math.max(h.indexOf("IN/OUT"), 3),
        billNo:    Math.max(h.indexOf("BILL NO."), h.indexOf("BILL NO"), 6),
        model:     Math.max(h.indexOf("MODEL"), 7),
        qty:       Math.max(h.indexOf("SUM OF REQ.QTY"), 10),
        sn:        Math.max(h.indexOf("SERIAL"), 11),
        ownerW:    Math.max(h.indexOf("OWNER WAREHOUSE"), 12),
        ownerR:    Math.max(h.indexOf("OWNER RECEIVER"), 13),
        locW:      Math.max(h.indexOf("LOCATION WAREHOUSE"), 14),
        locR:      Math.max(h.indexOf("LOCATION RECEIVER"), 15),
        status:    Math.max(h.indexOf("STATUS"), 21)
      };

      for (var i = 1; i < data.length; i++) {
        if (String(data[i][idx.duid] || "").trim().toLowerCase() !== targetDuid) continue;

        if (data[i][idx.status]) currentStatus = String(data[i][idx.status]);
        var tType    = String(data[i][idx.transType] || "").toUpperCase();
        var bNo      = String(data[i][idx.billNo]    || "-");
        var groupKey = tType + "|" + bNo + "|" + sName;

        if (!groups[groupKey]) {
          groups[groupKey] = {
            header: {
              customer:       sName.indexOf("TRUE") > -1 ? "TRUE" : "AIS",
              transType:      tType,
              billNo:         bNo,
              region:         data[i][idx.region],
              duid:           data[i][idx.duid],
              ownerWarehouse: data[i][idx.ownerW],
              ownerReceiver:  data[i][idx.ownerR],
              locWarehouse:   data[i][idx.locW],
              locReceiver:    data[i][idx.locR]
            },
            items: []
          };
        }
        groups[groupKey].items.push({
          model: data[i][idx.model] || "NA",
          sn:    data[i][idx.sn]    || "NA",
          qty:   data[i][idx.qty]   || 0
        });
        totalItemsCount++;
        found = true;
      }
    });

    if (!found) {
      var masterSheet = ss.getSheetByName("data");
      if (masterSheet) {
        var masterData = masterSheet.getDataRange().getValues();
        var mh   = masterData[0].map(function(v) { return String(v || "").toUpperCase(); });
        var dCol = Math.max(mh.indexOf("DUID"), 0);
        var rCol = Math.max(mh.indexOf("REGION"), 2);
        for (var i = 1; i < masterData.length; i++) {
          if (String(masterData[i][dCol]).trim().toLowerCase() === targetDuid) {
            return {
              success: true,
              formattedText:
                "📊 ข้อมูล DUID: " + masterData[i][dCol] + "\n━━━━━━━━━━━━━━━\n" +
                "📍 สถานะ: ไม่มีการเคลื่อนไหว\n" +
                "📍 Region: " + (masterData[i][rCol] || "-") + "\n━━━━━━━━━━━━━━━\n" +
                "⚠️ ยังไม่มีประวัติการเบิก-รับสินค้าในระบบ"
            };
          }
        }
      }
    }

    if (!found) return { success: false, message: "❌ ไม่พบข้อมูล DUID: " + duid };
    return {
      success:       true,
      formattedText: formatDuidResponse(groups, totalItemsCount, currentStatus)
    };
  } catch (e) {
    return { success: false, message: "❌ ระบบขัดข้อง: " + e.toString() };
  }
}

// ─────────────────────────────────────────────
// FORMAT DUID RESPONSE
// ─────────────────────────────────────────────

function formatDuidResponse(groups, totalItems, status) {
  var order = ["IN", "OUT", "STR/IN", "STR/OUT", "DISMANTLE", "RETURN"];
  var keys  = Object.keys(groups).sort(function(a, b) {
    var gA = groups[a].header, gB = groups[b].header;
    var idxA = order.indexOf(gA.transType), idxB = order.indexOf(gB.transType);
    if (idxA !== idxB) return idxA - idxB;
    return String(gA.billNo).localeCompare(String(gB.billNo));
  });

  var sections        = [];
  var timestamp       = Utilities.formatDate(new Date(), "GMT+7", "HH:mm:ss");
  var globalItemIndex = 1;

  keys.forEach(function(key, sectionIndex) {
    var g = groups[key], h = g.header;
    var text =
      "📊 ข้อมูล DUID: " + h.duid           + "\n" +
      "━━━━━━━━━━━━━━━\n" +
      "👤 ลูกค้า: "       + h.customer        + "\n" +
      "🛠 งาน: "          + h.transType        + "\n" +
      "📄 Bill No: "      + (h.billNo === "-" ? "" : h.billNo) + "\n" +
      "📍 Region: "       + (h.region          || "-") + "\n" +
      "🆔 DUID: "         + h.duid             + "\n" +
      "🏢 คลัง: "         + (h.ownerWarehouse  || "-") + "\n" +
      "👷 ผู้รับ: "        + (h.ownerReceiver   || "-") + "\n" +
      "📍 Loc Warehouse: "+ (h.locWarehouse    || "-") + "\n" +
      "📍 Loc Receiver: " + (h.locReceiver     || "-") + "\n" +
      "━━━━━━━━━━━━━━━\n";

    if (sectionIndex === 0) {
      text += "📦 รายการสินค้า (" + totalItems + " รายการ):\n";
    }

    g.items.forEach(function(item) {
      text += "🔹 " + (globalItemIndex++) + ": " + item.model +
              "\n   (SN: " + (item.sn || "NA") + ", Qty: " + (item.qty || 0) + ")\n";
    });
    sections.push(text);
  });

  return sections.join("━━━━━━━━━━━━━━━\n") +
    "\n━━━━━━━━━━━━━━━\n🔍 ค้นหาเมื่อ: " + timestamp;
}

// ─────────────────────────────────────────────
// BOM / OWNER / LOCATION / STATUS HELPERS
// ─────────────────────────────────────────────

function getBOMData(customer) {
  try {
    var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
    var res = [];
    var s   = ss.getSheetByName(customer === "AIS" ? "BOM AIS" : "BOM TRUE");
    if (s) {
      var lastRow = s.getLastRow();
      if (lastRow < 2) return [];
      var d = s.getRange(2, 1, lastRow - 1, 4).getValues();
      for (var i = 0; i < d.length; i++) {
        if (d[i][1]) res.push({ type: String(d[i][0]), model: String(d[i][1]),
                                code: String(d[i][2]), desc: String(d[i][3]) });
      }
    }
    return res;
  } catch (e) { return []; }
}

function getOwnerData() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var ws = [], rs = [];
    ss.getSheets().forEach(function(s) {
      var name = s.getName();
      if (name.indexOf("INOUT") === -1 && name !== "data") return;
      var lastRow = s.getLastRow();
      if (lastRow < 2) return;
      var startRow = Math.max(2, lastRow - 500);
      var numRows  = lastRow - startRow + 1;
      var data     = s.getRange(startRow, 1, numRows, s.getLastColumn()).getValues();
      var h        = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0]
                      .map(function(v) { return String(v || "").toUpperCase(); });
      var wCol = Math.max(h.indexOf("OWNER WAREHOUSE"), h.indexOf("OWNER WAREHOUSE "));
      var rCol = Math.max(h.indexOf("OWNER RECEIVER"),  h.indexOf("OWNER RECEIVER "));
      for (var i = 0; i < data.length; i++) {
        if (wCol > -1 && data[i][wCol]) ws.push(String(data[i][wCol]));
        if (rCol > -1 && data[i][rCol]) rs.push(String(data[i][rCol]));
      }
    });
    return { warehouses: [...new Set(ws)].sort(), receivers: [...new Set(rs)].sort() };
  } catch (e) { return { warehouses: [], receivers: [] }; }
}

function getLocationData() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var lw = [], lr = [];
    ss.getSheets().forEach(function(s) {
      var name = s.getName();
      if (name.indexOf("INOUT") === -1) return;
      var lastRow = s.getLastRow();
      if (lastRow < 2) return;
      var startRow = Math.max(2, lastRow - 500);
      var numRows  = lastRow - startRow + 1;
      var data     = s.getRange(startRow, 1, numRows, s.getLastColumn()).getValues();
      var h        = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0]
                      .map(function(v) { return String(v || "").toUpperCase(); });
      var wCol = h.indexOf("LOCATION WAREHOUSE");
      var rCol = h.indexOf("LOCATION RECEIVER");
      for (var i = 0; i < data.length; i++) {
        if (wCol > -1 && data[i][wCol]) lw.push(String(data[i][wCol]));
        if (rCol > -1 && data[i][rCol]) lr.push(String(data[i][rCol]));
      }
    });
    return { warehouses: [...new Set(lw)].sort(), receivers: [...new Set(lr)].sort() };
  } catch (e) { return { warehouses: [], receivers: [] }; }
}

function isDuidClosed(duid, customer) {
  try {
    if (!duid) return false;
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName("INOUT_HW_" + customer);
    if (!sheet) return false;
    var data  = sheet.getDataRange().getValues();
    if (data.length < 2) return false;
    var h     = data[0].map(function(v) { return String(v || "").toUpperCase(); });
    var dCol  = Math.max(h.indexOf("DUID"), 0);
    var sCol  = Math.max(h.indexOf("STATUS"), 21);
    var target = duid.trim().toLowerCase();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][dCol]).trim().toLowerCase() === target &&
          String(data[i][sCol]).trim().toUpperCase()  === "CLOSED") return true;
    }
  } catch (e) {}
  return false;
}

/**
 * getDuidStatus — V.6.9.3 FIX
 * คำนวณ status สด (live) ด้วย computeDuidStatus แทนการอ่าน STATUS column ที่ cache อยู่
 * แก้ปัญหา:
 *   - DISMANTLE แล้วยังเห็น "Closed" (เพราะ IN+OUT เคย balance ก่อนหน้า)
 *   - RETURN แล้วสถานะไม่เปลี่ยนเป็น Closed
 */
function getDuidStatus(duid, customer) {
  try {
    if (!duid) return { found: false };
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName("INOUT_HW_" + (customer || "AIS").toUpperCase());
    if (!sheet) return { found: false };

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return { found: false };

    var h   = data[0].map(function(v) { return String(v || "").toUpperCase(); });
    var idx = {
      duid:   Math.max(h.indexOf("DUID"), 1),
      region: Math.max(h.indexOf("REGION"), 2),
      type:   Math.max(h.indexOf("IN/OUT"), 3),
      model:  Math.max(h.indexOf("MODEL"), 7),
      code:   Math.max(h.indexOf("ITEM CODE"), 8),
      qty:    Math.max(h.indexOf("SUM OF REQ.QTY"), 10),
      status: Math.max(h.indexOf("STATUS"), 21)
    };

    // ตรวจสอบว่ามี DUID นี้ใน sheet หรือไม่ (case-insensitive)
    var target = duid.trim().toLowerCase();  // FIX: normalize to lowercase
    var found  = false;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idx.duid] || "").trim().toLowerCase() === target) {
        found = true;
        break;
      }
    }
    if (!found) return { found: false };

    // ✅ Compute status สดทุกครั้ง — ไม่อ่านจาก column ที่อาจ cache ผิด
    var result = computeDuidStatus(data, idx, target);
    return { found: true, status: result.status };

  } catch (e) {
    logToSheet("GET_DUID_STATUS_ERROR", e.toString());
    return { found: false };
  }
}

// ─────────────────────────────────────────────
// UPDATE DUID STATUS — V.7.0.1 Fixed Logic
//
// กฎการนับ Status (จับคู่ balance กันเป็น 3 คู่ อิสระจากกัน):
//   IN        ↔ OUT
//   STR/IN    ↔ STR/OUT
//   DISMANTLE ↔ RETURN
//
// Status Rules:
//   - ไม่มีข้อมูลเลย (ทุกคู่ = 0)                    → Pending
//   - มีข้อมูลจริง และทุกคู่ที่มีข้อมูล balance กันครบ → Closed
//   - มีข้อมูลจริง แต่ยังไม่ balance ครบทุกคู่          → On Process
// ─────────────────────────────────────────────
function updateDuidStatus(duid, customer) {
  try {
    if (!duid) return;
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName("INOUT_HW_" + customer);
    if (!sheet) return;

    var data = sheet.getDataRange().getValues();
    var h    = data[0].map(function(v) { return String(v || "").toUpperCase(); });
    var idx  = {
      duid:   Math.max(h.indexOf("DUID"), 1),
      region: Math.max(h.indexOf("REGION"), 2),
      type:   Math.max(h.indexOf("IN/OUT"), 3),
      model:  Math.max(h.indexOf("MODEL"), 7),
      code:   Math.max(h.indexOf("ITEM CODE"), 8),
      qty:    Math.max(h.indexOf("SUM OF REQ.QTY"), 10),
      status: Math.max(h.indexOf("STATUS"), 21)
    };

    var target = duid.trim();
    var result = computeDuidStatus(data, idx, target);

    if (result.matchingRows.length > 0) {
      var statusRange  = sheet.getRange(1, idx.status + 1, data.length, 1);
      var statusValues = statusRange.getValues();
      result.matchingRows.forEach(function(r) {
        if (statusValues[r - 1]) statusValues[r - 1][0] = result.status;
      });
      statusRange.setValues(statusValues);
    }

    logToSheet("STATUS_UPDATE", "DUID: " + duid + " (" + customer + ") → " + result.status +
      " | IN:" + result.inQty + " OUT:" + result.outQty +
      " | STR/IN:" + result.strInQty + " STR/OUT:" + result.strOutQty +
      " | DIS:" + result.dismantleQty + " RET:" + result.returnQty);

  } catch (e) {
    logToSheet("STATUS_ERROR", e.toString());
  }
}

/**
 * คำนวณ status ของ DUID หนึ่งตัว จาก data (getDataRange().getValues()) + idx ที่กำหนดไว้แล้ว
 * V.7.3.0: จับคู่ตาม Model + Item Code (แต่ละ item group อิสระจากกัน)
 * กฎ: IN↔OUT, STR/IN↔STR/OUT, DISMANTLE↔RETURN ต้องมีทั้งคู่ และ qty เท่ากัน
 */
// V.7.4.3: computeDuidStatus — คืน rowStatusMap (rowIndex → 'Closed'|'Open'|'Pending')
// แทนที่จะเป็น status เดียวต่อ DUID ตอนนี้แต่ละแถวได้ Status ตาม Item Code Group ของตัวเอง
function computeDuidStatus(data, idx, target) {
  var targetLower  = target.trim().toLowerCase();
  var matchingRows = [];
  var hasAnyData   = false;

  // Pass 1: สร้าง groups ตาม Item Code
  var groups = {};           // groupKey → balance counters
  var rowGroupKeys = {};    // rowIndex (1-based) → groupKey

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idx.duid] || "").trim().toLowerCase() !== targetLower) continue;
    var rowNum = i + 1;
    matchingRows.push(rowNum);
    hasAnyData = true;

    var type = String(data[i][idx.type] || "").toUpperCase().trim();
    var qty  = Number(data[i][idx.qty]) || 0;
    var code = String(idx.code !== undefined ? (data[i][idx.code] || "") : "").trim().toLowerCase();
    var normCode = code.replace(/^lth/, "").replace(/-[a-z]$/, "");
    var groupKey = normCode || "__unknown__";
    rowGroupKeys[rowNum] = groupKey;

    if (!groups[groupKey]) {
      groups[groupKey] = {
        hasIn: false, hasOut: false,
        hasStrIn: false, hasStrOut: false,
        hasDismantle: false, hasReturn: false,
        inQty: 0, outQty: 0,
        strInQty: 0, strOutQty: 0,
        dismantleQty: 0, returnQty: 0
      };
    }
    var g = groups[groupKey];
    if      (type === "IN")        { g.inQty        += qty; g.hasIn        = true; }
    else if (type === "OUT")       { g.outQty       += qty; g.hasOut       = true; }
    else if (type === "STR/IN")    { g.strInQty     += qty; g.hasStrIn     = true; }
    else if (type === "STR/OUT")   { g.strOutQty    += qty; g.hasStrOut    = true; }
    else if (type === "DISMANTLE") { g.dismantleQty += qty; g.hasDismantle = true; }
    else if (type === "RETURN")    { g.returnQty    += qty; g.hasReturn    = true; }
  }

  if (!hasAnyData) {
    return { rowStatusMap: {}, matchingRows: [], overallStatus: "Pending" };
  }

  // Pass 2: คำนวณ status ของแต่ละ group
  var groupStatusMap = {};
  var allClosed = true;
  var gKeys = Object.keys(groups);
  for (var k = 0; k < gKeys.length; k++) {
    var gk = gKeys[k];
    var g  = groups[gk];
    var inOutOk  = (!g.hasIn  && !g.hasOut)       || (g.hasIn  && g.hasOut  && g.inQty  === g.outQty);
    var strOk    = (!g.hasStrIn && !g.hasStrOut)   || (g.hasStrIn && g.hasStrOut && g.strInQty === g.strOutQty);
    var disRetOk = (!g.hasDismantle && !g.hasReturn) || (g.hasDismantle && g.hasReturn && g.dismantleQty === g.returnQty);
    var balanced = inOutOk && strOk && disRetOk;
    groupStatusMap[gk] = balanced ? "Closed" : "Open";
    if (!balanced) allClosed = false;
  }

  // Pass 3: แมป rowIndex → status ตาม group ของมัน
  var rowStatusMap = {};
  matchingRows.forEach(function(r) {
    var gk = rowGroupKeys[r] || "__unknown__";
    rowStatusMap[r] = groupStatusMap[gk] || "Open";
  });

  return {
    rowStatusMap: rowStatusMap,
    matchingRows: matchingRows,
    overallStatus: allClosed ? "Closed" : "On Process"
  };
}

/**
 * รันครั้งเดียวเพื่อ "ล้างของเก่า" — ไล่คำนวณ Status ใหม่ทุก DUID ในทั้ง 2 Sheet
 * (INOUT_HW_AIS, INOUT_HW_TRUE) ด้วย logic ล่าสุด แล้วเขียนทับ Status เดิมที่อาจค้าง/ผิดอยู่
 * (เช่น DUID ที่เคยถูกตั้งเป็น Closed ผิดๆ ไว้ตั้งแต่ก่อนแก้ logic แล้วไม่มีการบันทึกใหม่
 * เข้ามาอีก จะไม่ถูก recalculate อัตโนมัติ ต้องรันตัวนี้เพื่อ sync ให้ตรงครั้งเดียว)
 *
 * วิธีใช้: เปิด Apps Script Editor → เลือกฟังก์ชันนี้ → กด Run ครั้งเดียว
 */
function recalculateAllDuidStatuses() {
  var ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheets  = ["INOUT_HW_AIS", "INOUT_HW_TRUE"];
  var summary = [];

  sheets.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return;

    var h   = data[0].map(function(v) { return String(v || "").toUpperCase(); });
    var idx = {
      duid:   Math.max(h.indexOf("DUID"), 1),
      region: Math.max(h.indexOf("REGION"), 2),
      type:   Math.max(h.indexOf("IN/OUT"), 3),
      model:  Math.max(h.indexOf("MODEL"), 7),
      code:   Math.max(h.indexOf("ITEM CODE"), 8),
      qty:    Math.max(h.indexOf("SUM OF REQ.QTY"), 10),
      status: Math.max(h.indexOf("STATUS"), 21)
    };

    // เก็บรายชื่อ DUID ที่ไม่ซ้ำทั้งหมดในชีท
    var duidSet = {};
    for (var i = 1; i < data.length; i++) {
      var d = String(data[i][idx.duid] || "").trim();
      if (d) duidSet[d] = true;
    }

    var statusRange  = sheet.getRange(1, idx.status + 1, data.length, 1);
    var statusValues = statusRange.getValues();
    var changedCount = 0;

    Object.keys(duidSet).forEach(function(duid) {
      var result = computeDuidStatus(data, idx, duid);
      // V.7.4.3: เขียน status แบบ per-row ตาม rowStatusMap
      Object.keys(result.rowStatusMap).forEach(function(rowNum) {
        var ri = parseInt(rowNum) - 1;
        var newStatus = result.rowStatusMap[rowNum];
        if (statusValues[ri][0] !== newStatus) {
          statusValues[ri][0] = newStatus;
          changedCount++;
        }
      });
    });

    statusRange.setValues(statusValues);
    summary.push(sheetName + ": " + Object.keys(duidSet).length + " DUID, แก้ไข " + changedCount + " แถว");
  });

  var msg = "Recalculate เสร็จสิ้น:\n" + summary.join("\n");
  logToSheet("RECALCULATE_ALL", msg);
  Logger.log(msg);
  return msg;
}

// ─────────────────────────────────────────────
// UPLOAD PHOTO
// ─────────────────────────────────────────────

function uploadPhotoOnly(h, b, p, userEmail, userName) {
  try {
    var root       = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var regionName = String(h.region || "Unknown_Region").trim() || "Unknown_Region";
    var duidName   = String(h.duid   || "Unknown_DUID").trim()   || "Unknown_DUID";
    var typeName   = String(h.type   || "Other").trim() || "Other";

    var regF  = getOrCreateSubFolder(root,  regionName);
    var duidF = getOrCreateSubFolder(regF,  duidName);
    
    // สร้าง 6 Folder มาตรฐาน ภายใต้ DUID เสมอ
    var stdTypes = ["IN", "OUT", "DISMANTLE", "RETURN", "STR/IN", "STR/OUT"];
    for (var i = 0; i < stdTypes.length; i++) {
      getOrCreateSubFolder(duidF, stdTypes[i]);
    }
    
    var typeF = getOrCreateSubFolder(duidF, typeName);

    var blob = Utilities.newBlob(
      Utilities.base64Decode(b.split(',')[1] || b),
      "image/jpeg",
      duidName + "_" + p + ".jpg"
    );
    typeF.createFile(blob);

    logAuditEntry(
      "UPLOAD_PHOTO",
      userEmail || "Unknown",
      userName  || "Unknown",
      "Drive: " + regionName + "/" + duidName + "/" + typeName,
      duidName,
      "-",
      "อัปโหลดรูปที่ " + p
    );

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

// ─────────────────────────────────────────────
// NOTIFY WEBHOOK
// ─────────────────────────────────────────────

function notifyOnly(h, i) {
  if (!h.notificationId) h.notificationId = Utilities.getUuid();
  var payload = { header: h, items: i };
  var opt     = { method: 'post', contentType: 'application/json',
                  payload: JSON.stringify(payload), muteHttpExceptions: true };
  try {
    var response = UrlFetchApp.fetch(NODE_JS_WEBHOOK_URL, opt);
    var code     = response.getResponseCode();
    var body     = response.getContentText().substring(0, 200);
    logToSheet("NOTIFY_RESULT", "HTTP " + code + " | " + body);
    if (code !== 200) {
      logToSheet("NOTIFY_ERROR", "Vercel /notify ตอบ HTTP " + code + ": " + body);
      return { success: false, message: "HTTP " + code };
    }
    return { success: true };
  } catch (e) {
    logToSheet("NOTIFY_CRASH", e.toString());
    return { success: false, message: e.toString() };
  }
}

// ─────────────────────────────────────────────
// UTILITY / TEST
// ─────────────────────────────────────────────

function runGasSystemTests() {
  notifyOnly({ customer: "AIS", type: "IN", duid: "TEST-001" }, []);
}

function testOcrEngine() {
  Logger.log("🔍 OCR Engine Ready - V.6.9.1");
}

// ─────────────────────────────────────────────
// DASHBOARD DATA API — V.7.2.0
// เรียกจาก dashboard_demo.html ผ่าน google.script.run
// คืนข้อมูลสรุป KPI, รายการล่าสุด, สรุปตาม Region
// ─────────────────────────────────────────────

function getDashboardData() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheets = ["INOUT_HW_AIS", "INOUT_HW_TRUE"];
    var today  = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    var allRows = [];

    sheets.forEach(function(sheetName) {
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) return;
      var data = sheet.getDataRange().getValues();
      if (data.length < 2) return;

      var h = data[0].map(function(v) { return String(v || "").trim().toUpperCase(); });
      var idx = {
        runNo:  Math.max(h.indexOf("NO"), 0),
        duid:   Math.max(h.indexOf("DUID"), 1),
        region: Math.max(h.indexOf("REGION"), 2),
        type:   Math.max(h.indexOf("IN/OUT"), 3),
        itype:  Math.max(h.indexOf("TYPE"), 4),
        date:   Math.max(h.indexOf("DATE"), 5),
        bill:   Math.max(h.indexOf("BILL NO."), h.indexOf("BILL NO"), 6),
        model:  Math.max(h.indexOf("MODEL"), 7),
        code:   Math.max(h.indexOf("ITEM CODE"), 8),
        desc:   Math.max(h.indexOf("ITEM DESCRIPTION"), 9),
        qty:    Math.max(h.indexOf("SUM OF REQ.QTY"), 10),
        sn:     Math.max(h.indexOf("SERIAL"), 11),
        ownerW: Math.max(h.indexOf("OWNER WAREHOUSE"), 12),
        ownerR: Math.max(h.indexOf("OWNER RECEIVER"), 13),
        locW:   Math.max(h.indexOf("LOCATION WAREHOUSE"), 14),
        locR:   Math.max(h.indexOf("LOCATION RECEIVER"), 15),
        status: Math.max(h.indexOf("STATUS"), 21),
        intNo:  Math.max(h.indexOf("INTERNAL NO"), 22),
        userEm: Math.max(h.indexOf("USER EMAIL"), 23),
        userNm: Math.max(h.indexOf("USER NAME"), 24)
      };

      var cus = sheetName.indexOf("TRUE") > -1 ? "TRUE" : "AIS";
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (!row[idx.duid]) continue;
        allRows.push({
          no:       row[idx.runNo]  || (i),
          duid:     String(row[idx.duid]   || ""),
          region:   String(row[idx.region] || ""),
          type:     String(row[idx.type]   || ""),
          itype:    String(row[idx.itype]  || ""),
          date:     String(row[idx.date]   || ""),
          bill:     String(row[idx.bill]   || ""),
          model:    String(row[idx.model]  || ""),
          code:     String(row[idx.code]   || ""),
          desc:     String(row[idx.desc]   || ""),
          qty:      Number(row[idx.qty])   || 0,
          sn:       String(row[idx.sn]     || ""),
          ownerW:   String(row[idx.ownerW] || ""),
          ownerR:   String(row[idx.ownerR] || ""),
          locW:     String(row[idx.locW]   || ""),
          locR:     String(row[idx.locR]   || ""),
          status:   String(row[idx.status] || "Pending"),
          intNo:    String(row[idx.intNo]  || ""),
          userEm:   String(row[idx.userEm] || ""),
          userNm:   String(row[idx.userNm] || ""),
          customer: cus
        });
      }
    });

    // ─── คำนวณ KPI ───
    var todayRows  = allRows.filter(function(r) { return r.date === today; });
    var inToday    = todayRows.filter(function(r) { return r.type.toUpperCase() === "IN"; }).length;
    var outToday   = todayRows.filter(function(r) { return r.type.toUpperCase() === "OUT"; }).length;
    var disToday   = todayRows.filter(function(r) { return r.type.toUpperCase() === "DISMANTLE"; }).length;
    var strInToday = todayRows.filter(function(r) { return r.type.toUpperCase() === "STR/IN"; }).length;
    var pendingCnt = allRows.filter(function(r) { return r.status === "Pending" || r.status === "On Process"; }).length;
    var duidSet    = {};
    allRows.forEach(function(r) { duidSet[r.duid] = true; });
    var activeDuid = Object.keys(duidSet).length;

    // ─── สรุปตาม Region ───
    var regionMap = {};
    allRows.forEach(function(r) {
      var rg = r.region || "Unknown";
      if (!regionMap[rg]) regionMap[rg] = 0;
      regionMap[rg]++;
    });

    // ─── Week trend (7 วัน) ───
    var weekMap = {};
    var now = new Date();
    for (var d = 6; d >= 0; d--) {
      var dd = new Date(now.getTime() - d * 86400000);
      var lbl = Utilities.formatDate(dd, "GMT+7", "dd/MM");
      weekMap[lbl] = { in: 0, out: 0, dismantle: 0, strIn: 0 };
    }
    allRows.forEach(function(r) {
      // date format dd/MM/yyyy → truncate to dd/MM
      var shortDate = (r.date || "").substring(0, 5);
      if (weekMap[shortDate]) {
        var t = r.type.toUpperCase();
        if (t === "IN")  weekMap[shortDate]["in"]++;
        if (t === "OUT") weekMap[shortDate]["out"]++;
        if (t === "DISMANTLE") weekMap[shortDate]["dismantle"]++;
        if (t === "STR/IN") weekMap[shortDate]["strIn"]++;
      }
    });

    // ─── ข้อมูลรายการทั้งหมด ───
    var recent = allRows;

    return {
      success:    true,
      kpi: {
        inToday:    inToday,
        outToday:   outToday,
        disToday:   disToday,
        strInToday: strInToday,
        pending:    pendingCnt,
        activeDuid: activeDuid,
        total:      allRows.length
      },
      recent:     recent,
      regionMap:  regionMap,
      weekLabels: Object.keys(weekMap),
      weekIn:     Object.values(weekMap).map(function(v) { return v["in"]; }),
      weekOut:    Object.values(weekMap).map(function(v) { return v["out"]; }),
      weekDis:    Object.values(weekMap).map(function(v) { return v["dismantle"]; }),
      weekStrIn:  Object.values(weekMap).map(function(v) { return v["strIn"]; }),
      fetchedAt:  Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss")
    };

  } catch (e) {
    logToSheet("DASHBOARD_ERROR", e.toString());
    return { success: false, message: e.toString() };
  }
}

// ─────────────────────────────────────────────
// IMPORT DATA — V.7.3.0
// รับ array of row objects จาก client, บันทึกลง sheet
// ─────────────────────────────────────────────

function saveImportData(rows, customer, userEmail, userName) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    if (!rows || rows.length === 0)
      return { success: false, message: "❌ ไม่มีข้อมูลที่จะ Import" };

    var ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheetName = "INOUT_HW_" + (customer || "AIS").toString().trim().toUpperCase();
    var sheet     = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: "❌ ไม่พบ Sheet: " + sheetName };

    var dateStr    = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    var duidSet    = {};
    var allRows    = [];
    var internalNo = generateInternalNo(sheet, "ER");

    // หาเลข Running No สูงสุดของแต่ละ DUID ใน Sheet
    var lastRow = sheet.getLastRow();
    var existingData = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 2).getValues() : [];
    var duidMap = {};
    for (var r = 0; r < existingData.length; r++) {
      var d = String(existingData[r][1]).trim().toLowerCase();
      var num = Number(existingData[r][0]);
      if (!duidMap[d] || num > duidMap[d]) duidMap[d] = isNaN(num) ? 0 : num;
    }

    rows.forEach(function(row) {
      var cleanDuid   = String(row.duid      || "").trim();
      var cleanBill   = String(row.bill      || "").trim();
      var cleanRegion = String(row.region    || "").trim().toUpperCase();

      var currentMax = duidMap[cleanDuid.toLowerCase()] || 0;
      var newNo = currentMax + 1;
      duidMap[cleanDuid.toLowerCase()] = newNo;

      // Region Fallback
      if (!cleanRegion || cleanRegion === "-") {
        try {
          var projects = getProjectData();
          var found = projects.find(function(p) {
            return p.duid.toLowerCase() === cleanDuid.toLowerCase();
          });
          if (found && found.region && found.region !== "-")
            cleanRegion = found.region.toUpperCase();
        } catch (e) {}
      }

      var newRow = new Array(25).fill("");
      newRow[0]  = newNo;
      newRow[1]  = cleanDuid;
      newRow[2]  = cleanRegion || "ER";
      newRow[3]  = String(row.transType || row.type || "").trim().toUpperCase(); // IN/OUT
      newRow[4]  = String(row.itemType  || row.itype || "").trim();               // TYPE
      newRow[5]  = row.date || dateStr;
      newRow[6]  = cleanBill;
      newRow[7]  = String(row.model     || "").trim();
      newRow[8]  = String(row.code      || "").trim();
      newRow[9]  = String(row.desc      || "").trim();
      newRow[10] = Number(row.qty)  || 1;
      newRow[11] = String(row.sn    || "").trim();
      newRow[21] = "Pending";
      newRow[22] = internalNo;
      newRow[23] = userEmail || "Import";
      newRow[24] = userName  || "Import";

      allRows.push(newRow);
      if (cleanDuid) duidSet[cleanDuid] = true;
    });

    if (allRows.length > 0) {
      sheet.insertRowsAfter(1, allRows.length);
      var reversedRows = allRows.slice().reverse();
      sheet.getRange(2, 1, reversedRows.length, 25).setValues(reversedRows);
    }

    SpreadsheetApp.flush();

    // อัปเดต Status ของ DUID ที่ถูก Import
    Object.keys(duidSet).forEach(function(duid) {
      updateDuidStatus(duid, (customer || "AIS").toUpperCase());
    });

    logAuditEntry(
      "IMPORT", userEmail, userName, sheetName, "-", "-",
      "Import " + allRows.length + " รายการ | Customer: " + customer
    );

    // ── แจ้งเตือนสรุปการ Import ──
    try {
      var importHeader = {
        userName: userName || userEmail || "Web User",
        userEmail: userEmail || "Unknown",
        customer: customer,
        type: "BULK IMPORT (นำเข้าข้อมูล)",
        duid: "MULTIPLE (" + Object.keys(duidSet).length + " DUIDs)",
        region: "-",
        billNo: "-",
        ownerWarehouse: "-",
        ownerReceiver: "-",
        locationWarehouse: "-",
        locationReceiver: "-"
      };
      var importItems = [{
        model: "รายการอัปโหลดจาก CSV",
        sn: "N/A",
        qty: allRows.length
      }];
      notifyOnly(importHeader, importItems);
    } catch (e) {
      logToSheet("NOTIFY_IMPORT_ERROR", e.toString());
    }

    return {
      success: true,
      count:   allRows.length,
      message: "✅ Import สำเร็จ " + allRows.length + " รายการ เข้า " + sheetName
    };

  } catch (e) {
    logToSheet("IMPORT_ERROR", e.toString());
    return { success: false, message: "❌ Import ผิดพลาด: " + e.toString() };
  } finally {
    lock.releaseLock();
  }
}

// ─────────────────────────────────────────────
// EXPORT DATA — V.7.3.0
// คืน headers + rows ของ sheet สำหรับ download CSV บน client
// ─────────────────────────────────────────────

function exportSheetData(customer) {
  try {
    var ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheetName = "INOUT_HW_" + (customer || "AIS").toString().trim().toUpperCase();
    var sheet     = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: "❌ ไม่พบ Sheet: " + sheetName };

    var data = sheet.getDataRange().getValues();
    if (data.length < 1) return { success: true, headers: [], rows: [] };

    var headers = data[0].map(function(h) { return String(h || ""); });
    var rows    = [];
    for (var i = 1; i < data.length; i++) {
      rows.push(data[i].map(function(v) { return String(v || ""); }));
    }
    return { success: true, headers: headers, rows: rows };
  } catch (e) {
    logToSheet("EXPORT_ERROR", e.toString());
    return { success: false, message: e.toString() };
  }
}

// ─────────────────────────────────────────────
// UPSERT IMPORT — Update if duplicate, Insert if new — V.7.4.0
// Match key: DUID + BILL NO + ITEM CODE + SN
// ─────────────────────────────────────────────

function saveImportDataUpdate(rows, customer, userEmail, userName) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    if (!rows || rows.length === 0)
      return { success: false, message: "❌ ไม่มีข้อมูลที่จะ Update" };

    var ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheetName = "INOUT_HW_" + (customer || "AIS").toString().trim().toUpperCase();
    var sheet     = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: "❌ ไม่พบ Sheet: " + sheetName };

    var dateStr  = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    var lastRow  = sheet.getLastRow();
    var allData  = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 25).getValues() : [];
    var hRow     = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var h        = hRow.map(function(v){ return String(v||"").trim().toUpperCase(); });

    function hIdx(names, def) {
      for (var i = 0; i < names.length; i++) {
        var p = h.indexOf(names[i]);
        if (p > -1) return p;
      }
      return def;
    }

    var idx = {
      duid:  hIdx(["DUID"], 1),
      region:hIdx(["REGION"], 2),
      type:  hIdx(["IN/OUT"], 3),
      itype: hIdx(["TYPE","ITYPE"], 4),
      date:  hIdx(["DATE"], 5),
      bill:  hIdx(["BILL NO.","BILL NO","BILL"], 6),
      model: hIdx(["MODEL"], 7),
      code:  hIdx(["ITEM CODE","CODE"], 8),
      desc:  hIdx(["ITEM DESCRIPTION","DESCRIPTION","DESC"], 9),
      qty:   hIdx(["QTY","QUANTITY"], 10),
      sn:    hIdx(["SN","SERIAL NO","SERIAL"], 11),
      status:hIdx(["STATUS"], 21),
      email: 23,
      uname: 24
    };

    var updatedCount = 0;
    var insertedRows = [];
    var duidSet      = {};

    rows.forEach(function(row) {
      var cleanDuid = String(row.duid || "").trim();
      var cleanBill = String(row.bill || "").trim();
      var cleanCode = String(row.code || "").trim();
      var cleanSN   = String(row.sn   || "").trim();
      if (!cleanDuid) return;

      var foundRowIdx = -1;
      for (var r = 0; r < allData.length; r++) {
        var rDuid = String(allData[r][idx.duid] || "").trim().toLowerCase();
        var rBill = String(allData[r][idx.bill] || "").trim().toLowerCase();
        var rCode = String(allData[r][idx.code] || "").trim().toLowerCase();
        var rSN   = String(allData[r][idx.sn]   || "").trim().toLowerCase();
        var snMatch = (cleanSN === "" || rSN === cleanSN.toLowerCase());
        if (rDuid === cleanDuid.toLowerCase() && rBill === cleanBill.toLowerCase() &&
            rCode === cleanCode.toLowerCase() && snMatch) {
          foundRowIdx = r;
          break;
        }
      }

      if (foundRowIdx !== -1) {
        var sheetRow    = foundRowIdx + 2;
        var cleanRegion = String(row.region || "").trim().toUpperCase() ||
                          String(allData[foundRowIdx][idx.region] || "").trim().toUpperCase() || "ER";
        sheet.getRange(sheetRow, idx.region + 1).setValue(cleanRegion);
        sheet.getRange(sheetRow, idx.type   + 1).setValue(String(row.transType || row.type || "").trim().toUpperCase());
        sheet.getRange(sheetRow, idx.itype  + 1).setValue(String(row.itemType  || row.itype || "").trim());
        sheet.getRange(sheetRow, idx.date   + 1).setValue(row.date || dateStr);
        sheet.getRange(sheetRow, idx.model  + 1).setValue(String(row.model || "").trim());
        sheet.getRange(sheetRow, idx.desc   + 1).setValue(String(row.desc  || "").trim());
        sheet.getRange(sheetRow, idx.qty    + 1).setValue(Number(row.qty)  || 1);
        sheet.getRange(sheetRow, idx.sn     + 1).setValue(cleanSN);
        sheet.getRange(sheetRow, idx.email  + 1).setValue(userEmail || "Import");
        sheet.getRange(sheetRow, idx.uname  + 1).setValue(userName  || "Import");
        updatedCount++;
        duidSet[cleanDuid] = true;
      } else {
        var cleanRegion2 = String(row.region || "").trim().toUpperCase() || "ER";
        var newRow = new Array(25).fill("");
        newRow[idx.duid]   = cleanDuid;
        newRow[idx.region] = cleanRegion2;
        newRow[idx.type]   = String(row.transType || row.type || "").trim().toUpperCase();
        newRow[idx.itype]  = String(row.itemType  || row.itype || "").trim();
        newRow[idx.date]   = row.date || dateStr;
        newRow[idx.bill]   = cleanBill;
        newRow[idx.model]  = String(row.model || "").trim();
        newRow[idx.code]   = cleanCode;
        newRow[idx.desc]   = String(row.desc  || "").trim();
        newRow[idx.qty]    = Number(row.qty)  || 1;
        newRow[idx.sn]     = cleanSN;
        newRow[idx.status] = "Pending";
        newRow[idx.email]  = userEmail || "Import";
        newRow[idx.uname]  = userName  || "Import";
        insertedRows.push(newRow);
        duidSet[cleanDuid] = true;
      }
    });

    if (insertedRows.length > 0) {
      sheet.insertRowsAfter(1, insertedRows.length);
      sheet.getRange(2, 1, insertedRows.length, 25).setValues(insertedRows.slice().reverse());
    }

    SpreadsheetApp.flush();

    Object.keys(duidSet).forEach(function(duid) {
      updateDuidStatus(duid, (customer || "AIS").toUpperCase());
    });

    logAuditEntry(
      "UPSERT_IMPORT", userEmail, userName, sheetName, "-", "-",
      "Update " + updatedCount + " + Insert " + insertedRows.length + " รายการ | Customer: " + customer
    );

    return {
      success:  true,
      updated:  updatedCount,
      inserted: insertedRows.length,
      message:  "✅ อัพเดต " + updatedCount + " รายการ + เพิ่มใหม่ " + insertedRows.length + " รายการ เข้า " + sheetName
    };

  } catch (e) {
    logToSheet("UPSERT_IMPORT_ERROR", e.toString());
    return { success: false, message: "❌ Update ผิดพลาด: " + e.toString() };
  } finally {
    lock.releaseLock();
  }
}

// ─────────────────────────────────────────────
// BULK IMPORT DATA (Dashboard)
// ─────────────────────────────────────────────

function importBulkData(rows, customer, userEmail, userName) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    if (!rows || rows.length === 0) return { success: false, message: "❌ ไม่มีข้อมูลสำหรับ Import" };
    
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheetName = "INOUT_HW_" + (customer || "AIS").toUpperCase();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: "❌ ไม่พบหน้า Sheet: " + sheetName };
    
    var dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    
    // หาเลข Running No สูงสุดของแต่ละ DUID ใน Sheet
    var lastRow = sheet.getLastRow();
    var existingData = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 2).getValues() : [];
    
    var duidMap = {};
    for (var r = 0; r < existingData.length; r++) {
      var d = String(existingData[r][1]).trim().toLowerCase();
      var num = Number(existingData[r][0]);
      if (!duidMap[d] || num > duidMap[d]) duidMap[d] = isNaN(num) ? 0 : num;
    }
    
    var regionInternalMap = {};
    
    // Build rows to insert (25 columns)
    var allRows = rows.map(function(item) {
      var cleanDuid = String(item.duid || "").trim();
      var dLower = cleanDuid.toLowerCase();
      
      var currentMax = duidMap[dLower] || 0;
      var newNo = currentMax + 1;
      duidMap[dLower] = newNo; // increment for next row with same DUID
      
      var reg = String(item.region || "ER").trim().toUpperCase();
      if (!regionInternalMap[reg]) {
        regionInternalMap[reg] = generateInternalNo(sheet, reg);
      }
      var internalNo = regionInternalMap[reg];
      
      var row = new Array(25).fill("");
      row[0]  = newNo;
      row[1]  = cleanDuid;
      row[2]  = reg;
      row[3]  = String(item.transType || item.type || "").trim();
      row[4]  = String(item.itemType || item.itype || "").trim();
      row[5]  = item.date ? item.date : dateStr;
      row[6]  = String(item.bill || "").trim();
      row[7]  = String(item.model || "").trim();
      row[8]  = String(item.code || "").trim();
      row[9]  = String(item.desc || "").trim();
      row[10] = Number(item.qty) || 1;
      row[11] = String(item.sn || "").trim();
      row[12] = ""; // ownerW
      row[13] = ""; // ownerR
      row[14] = ""; // locW
      row[15] = ""; // locR
      row[21] = "Pending";
      row[22] = internalNo;
      row[23] = userEmail || "Unknown (Web)";
      row[24] = userName  || "Web User";
      
      return row;
    });
    
    // Insert into sheet at top (row 2). Reverse so they appear in correct chronological order at top
    if (allRows.length > 0) {
      sheet.insertRowsAfter(1, allRows.length);
      var reversedRows = allRows.slice().reverse();
      sheet.getRange(2, 1, reversedRows.length, 25).setValues(reversedRows);
    }
    
    SpreadsheetApp.flush();
    
    var affectedDuids = Object.keys(duidMap);
    affectedDuids.forEach(function(d) {
      var actualDuid = rows.find(function(r) { return String(r.duid).trim().toLowerCase() === d; });
      if (actualDuid) updateDuidStatus(actualDuid.duid, customer);
    });
    
    logAuditEntry("IMPORT_CSV", userEmail, userName, sheetName, "MULTIPLE", "-", "Import " + rows.length + " รายการ");
    
    return { success: true, count: rows.length, message: "✅ Import สำเร็จ " + rows.length + " รายการ" };
    
  } catch (e) {
    return { success: false, message: "❌ ระบบขัดข้อง: " + e.toString() };
  } finally {
    lock.releaseLock();
  }
}


function getUsersDB() {
  try {
    var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var files = root.getFilesByName('inv_users_db.json');
    if (files.hasNext()) {
      return files.next().getBlob().getDataAsString();
    }
  } catch(e) {}
  return '{}';
}

function saveUsersDB(usersJson) {
  try {
    var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var files = root.getFilesByName('inv_users_db.json');
    if (files.hasNext()) {
      files.next().setContent(usersJson);
    } else {
      root.createFile('inv_users_db.json', usersJson, MimeType.PLAIN_TEXT);
    }
    return { success: true };
  } catch(e) { return { success: false, error: e.message }; }
}
