/*
 * 🚀 Inventory Smart System - V.6.5.4
 * Includes: Ultimate Robust DUID Search (All Sheets)
 */

var SPREADSHEET_ID = '1afmWjTNetqHNT69k-jzB3mAdTsFaRdodlJ1hJaJfpSQ';
var ROOT_FOLDER_ID = '1IKefCE5rhBAoyM0uQBTLvEkPlRUm6lD_'; 
var NODE_JS_WEBHOOK_URL = 'https://vipcode-ai-inspector-yhfn.vercel.app/notify'; 

function doGet(e) {
  if (e.parameter.duid) {
    var result = searchByDuidOnly(e.parameter.duid);
    if (e.parameter.format === "text") {
      return ContentService.createTextOutput(result.formattedText || result.message || "❌ V.6.5.4: Not found");
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }

  return HtmlService.createTemplateFromFile('app').evaluate()
      .setTitle('Inventory Smart App V.6.5.4')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function searchByDuidOnly(duid) {
  if (!duid) return { success: false, message: "❌ (V.6.5.4) กรุณาระบุ DUID" };
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var targetSheets = ["INOUT_HW_AIS", "INOUT_HW_TRUE"]; // เฉพาะเจาะจงเพื่อความเร็ว
    var groups = {}; 
    var found = false;
    var totalItemsCount = 0;
    var targetDuid = duid.toString().replace(/\s+/g, ' ').trim().toLowerCase();

    targetSheets.forEach(function(sName) {
      var sheet = ss.getSheetByName(sName);
      if (!sheet) return;
      
      var data = sheet.getDataRange().getValues();
      if (data.length < 2) return;
      
      var headerRow = data[0].map(function(h) { return String(h || "").trim().toUpperCase(); });
      var idx = {
        duid: headerRow.indexOf("DUID"), 
        region: Math.max(headerRow.indexOf("REGION"), headerRow.indexOf("INTERNAL PROJECT")),
        transType: headerRow.indexOf("IN/OUT"),
        billNo: Math.max(headerRow.indexOf("BILL NO"), headerRow.indexOf("BILL NO.")),
        model: headerRow.indexOf("MODEL"),
        sn: Math.max(headerRow.indexOf("SN"), headerRow.indexOf("SERIAL")),
        qty: Math.max(headerRow.indexOf("QTY"), headerRow.indexOf("SUM OF REQ.QTY"), headerRow.indexOf("SUM OF REQ. QTY")),
        ownerW: Math.max(headerRow.indexOf("OWNER WAREHOUSE"), headerRow.indexOf("OWNER WAREHOUSE ")),
        ownerR: Math.max(headerRow.indexOf("OWNER RECEIVER"), headerRow.indexOf("OWNER RECEIVER ")),
        locW: headerRow.indexOf("LOCATION WAREHOUSE"),
        locR: headerRow.indexOf("LOCATION RECEIVER")
      };

      if (idx.duid === -1) return;
      
      var customer = sName.indexOf("TRUE") > -1 ? "TRUE" : "AIS"; 
      
      // วนลูปหาข้อมูล (ใช้ Reverse Loop หรือ Filter อาจจะเร็วขึ้นในบางกรณี แต่หัวใจคือลดจำนวน Sheet)
      for (var i = 1; i < data.length; i++) {
        var rawSheetDuid = String(data[i][idx.duid] || "");
        if (rawSheetDuid.length < 5) continue; // Skip empty/short values fast
        
        var sheetDuid = rawSheetDuid.replace(/\s+/g, ' ').trim().toLowerCase();
        if (sheetDuid === targetDuid) {
          var tType = (idx.transType > -1 ? String(data[i][idx.transType] || "").trim() : "").toUpperCase();
          var bNo = (idx.billNo > -1 ? String(data[i][idx.billNo] || "").trim() : "-");
          var groupKey = tType + "|" + bNo + "|" + sName; 
          
          if (!groups[groupKey]) {
            groups[groupKey] = {
              header: {
                customer: customer,
                transType: tType,
                billNo: bNo,
                region: (idx.region > -1 ? data[i][idx.region] : "-") || "-",
                duid: data[i][idx.duid] || rawSheetDuid,
                ownerWarehouse: (idx.ownerW > -1 ? data[i][idx.ownerW] : "-") || "-",
                ownerReceiver: (idx.ownerR > -1 ? data[i][idx.ownerR] : "-") || "-",
                locWarehouse: (idx.locW > -1 ? data[i][idx.locW] : "-") || "-",
                locReceiver: (idx.locR > -1 ? data[i][idx.locR] : "-") || "-"
              },
              items: []
            };
          }
          if (idx.model > -1) {
            groups[groupKey].items.push({
              model: data[i][idx.model] || "NA",
              sn: (idx.sn > -1 ? data[i][idx.sn] : "NA") || "NA",
              qty: (idx.qty > -1 ? data[i][idx.qty] : 0) || 0
            });
            totalItemsCount++;
          }
          found = true;
        }
      }
    });

    if (!found) {
      return { 
        success: false, 
        message: "❌ (V.6.5.4) ไม่พบข้อมูลเคลื่อนไหวสำหรับ DUID: \"" + duid + "\"\nกรุณาตรวจสอบว่าข้อมูลอยู่ในคอลัมน์ B หรือไม่ครับ" 
      };
    }

    var formattedText = formatDuidResponse(groups, totalItemsCount);
    return { success: true, groups: groups, totalItems: totalItemsCount, formattedText: formattedText };
  } catch (e) {
    return { success: false, message: "❌ (V.6.5.4) ระบบขัดข้อง: " + e.toString() };
  }
}

function formatDuidResponse(groups, totalItems) {
  var order = ["IN", "OUT", "STR/IN", "STR/OUT", "DISMANTLE", "RETURN"];
  var keys = Object.keys(groups).sort(function(a, b) {
    var gA = groups[a].header, gB = groups[b].header;
    var idxA = order.indexOf(gA.transType);
    var idxB = order.indexOf(gB.transType);
    if (idxA === -1) idxA = 99;
    if (idxB === -1) idxB = 99;
    if (idxA !== idxB) return idxA - idxB;
    return String(gA.billNo || "").localeCompare(String(gB.billNo || ""));
  });

  var sections = [];
  var globalItemCount = 0;
  var timestamp = Utilities.formatDate(new Date(), "GMT+7", "HH:mm:ss");

  keys.forEach(function(key, index) {
    var g = groups[key];
    var h = g.header;
    var text = "📊 ข้อมูล DUID: " + h.duid + "\n";
    text += "━━━━━━━━━━━━━━━\n";
    text += "👤 ลูกค้า: " + h.customer + "\n";
    text += "🛠 งาน: " + h.transType + "\n";
    text += "bill No : " + h.billNo + "\n";
    text += "📍 Region: " + h.region + "\n";
    text += "🆔 DUID: " + h.duid + "\n";
    text += "🏢 คลัง: " + h.ownerWarehouse + "\n";
    text += "👷 ผู้รับ: " + h.ownerReceiver + "\n";
    text += "📍 Loc Warehouse: " + h.locWarehouse + "\n";
    text += "📍 Loc Receiver: " + h.locReceiver + "\n";
    text += "━━━━━━━━━━━━━━━\n";
    
    // แสดงจำนวนรวมเฉพาะกลุ่มแรกเท่านั้น
    if (index === 0) {
      text += "📦 รายการสินค้า (" + totalItems + " รายการ):\n";
    }

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
      if (data.length > 1) {
        var h = data[0].map(v => String(v || "").trim().toUpperCase());
        var idx = { model: h.indexOf("MODEL"), code: h.indexOf("CODE"), type: h.indexOf("TYPE"), desc: h.indexOf("DESCRIPTION") };
        // Fallback for BOM sheets which might have fixed structure
        if (idx.model === -1) idx.model = 1; if (idx.code === -1) idx.code = 2; if (idx.type === -1) idx.type = 0; if (idx.desc === -1) idx.desc = 3;
        
        for (var i = 1; i < data.length; i++) {
          var model = String(data[i][idx.model] || "").trim(), code = String(data[i][idx.code] || "").trim();
          if (model || code) masterResults.push({ type: String(data[i][idx.type] || "OTHER").trim(), model: model, code: code, desc: String(data[i][idx.desc] || "").trim(), source: "MASTER" });
        }
      }
    }
    var historySheets = [customer === "AIS" ? "data AIS" : "data TRUE", "INOUT_HW_" + customer];
    historySheets.forEach(function(sName) {
      var sheet = ss.getSheetByName(sName);
      if (!sheet) return;
      var data = sheet.getDataRange().getValues();
      if (data.length > 1) {
        var h = data[0].map(v => String(v || "").trim().toUpperCase());
        var idx = { model: h.indexOf("MODEL"), code: h.indexOf("CODE"), type: h.indexOf("TYPE"), desc: h.indexOf("DESCRIPTION") };
        if (idx.model === -1) return;
        
        for (var i = 1; i < data.length; i++) {
          var model = String(data[i][idx.model] || "").trim(), code = String(data[i][idx.code] || "").trim();
          if (model || code) historyResults.push({ type: String(data[i][idx.type] || "OTHER").trim(), model: model, code: code, desc: String(data[i][idx.desc] || "").trim(), source: "HISTORY" });
        }
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
    
    // Structure: DUID(A), Region(B), JobType(C), ItemType(D), Date(E), BillNo(F), Model(G), Code(H), Desc(I), Qty(J), SN(K), OwnerW(L), OwnerR(M), LocW(N), LocR(O)
    var allRows = items.map(function(item, index) { 
      return [ 
        header.duid, 
        header.region, 
        header.type, 
        item.type, 
        dateStr, 
        header.billNo, 
        item.model, 
        item.code, 
        item.desc, 
        item.qty, 
        item.sn, 
        header.ownerWarehouse, 
        header.ownerReceiver, 
        header.locationWarehouse || "", 
        header.locationReceiver || "", 
        "", "", "" 
      ]; 
    });
    
    var lastRow = sheet.getLastRow();
    if (allRows.length > 0) sheet.getRange(lastRow + 1, 1, allRows.length, 18).setValues(allRows);
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
    var sheet = ss.getSheetByName("data");
    if (!sheet) return [];
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    
    var header = data[0].map(h => String(h || "").trim().toUpperCase());
    var duidCol = header.indexOf("DUID"); // Should be 0 (Col A)
    var regionCol = Math.max(header.indexOf("REGION"), header.indexOf("INTERNAL PROJECT")); // Should be 2 (Col C)
    
    if (duidCol === -1) duidCol = 0;
    if (regionCol === -1) regionCol = 2;

    var results = [];
    for (var i = 1; i < data.length; i++) {
      var duid = String(data[i][duidCol] || "").trim();
      if (duid) {
        results.push({ 
          duid: duid, 
          region: String(data[i][regionCol] || "").trim() 
        });
      }
    }
    
    var seen = {};
    return results.filter(function(item) { 
      if (!item.duid || seen[item.duid]) return false; 
      seen[item.duid] = true; 
      return true; 
    });
  } catch(e) { return []; } 
}

function getOwnerData() { 
  try { 
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID); 
    var ws=[], rs=[]; 
    
    // 1. Get from 'data' sheet (Master)
    var masterSheet = ss.getSheetByName("data");
    if (masterSheet) {
      var d = masterSheet.getDataRange().getValues();
      if (d.length > 1) {
        var h = d[0].map(v => String(v || "").trim().toUpperCase());
        var wCol = h.indexOf("OWNER WAREHOUSE");
        var rCol = h.indexOf("OWNER RECEIVER");
        if (wCol === -1) wCol = 3; // Col D
        if (rCol === -1) rCol = 4; // Col E
        for (var i = 1; i < d.length; i++) {
          if (d[i][wCol]) ws.push(String(d[i][wCol]));
          if (d[i][rCol]) rs.push(String(d[i][rCol]));
        }
      }
    }

    // 2. Get from transaction sheets (History)
    ss.getSheets().forEach(function(s){ 
      var sName = s.getName();
      if(sName.indexOf("INOUT") > -1){ 
        var d = s.getDataRange().getValues(); 
        if (d.length < 2) return;
        var header = d[0].map(h => String(h || "").trim().toUpperCase());
        var wCol = Math.max(header.indexOf("OWNER WAREHOUSE"), header.indexOf("OWNER WAREHOUSE "));
        var rCol = Math.max(header.indexOf("OWNER RECEIVER"), header.indexOf("OWNER RECEIVER "));
        
        for(var i=1; i<d.length; i++){ 
          if(wCol > -1 && d[i][wCol]) ws.push(String(d[i][wCol])); 
          if(rCol > -1 && d[i][rCol]) rs.push(String(d[i][rCol])); 
        } 
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
    if (data.length < 2) return { success: false };
    
    var header = data[0].map(h => String(h || "").trim().toUpperCase());
    var idx = {
      duid: header.indexOf("DUID"),
      region: Math.max(header.indexOf("REGION"), header.indexOf("INTERNAL PROJECT")),
      billNo: header.indexOf("BILL NO"),
      type: header.indexOf("TYPE"),
      model: header.indexOf("MODEL"),
      code: header.indexOf("CODE"),
      desc: header.indexOf("DESCRIPTION"),
      qty: header.indexOf("QTY"),
      sn: header.indexOf("SN"),
      ownerW: Math.max(header.indexOf("OWNER WAREHOUSE"), header.indexOf("OWNER WAREHOUSE ")),
      ownerR: Math.max(header.indexOf("OWNER RECEIVER"), header.indexOf("OWNER RECEIVER ")),
      locW: header.indexOf("LOCATION WAREHOUSE"),
      locR: header.indexOf("LOCATION RECEIVER")
    };
    
    var results = { duid: "", region: "", ownerWarehouse: "", ownerReceiver: "", locationWarehouse: "", locationReceiver: "", items: [] }; 
    var found = false;
    
    for (var i = 1; i < data.length; i++) { 
      if (idx.billNo > -1 && data[i][idx.billNo] == billNo) { 
        if (!found) { 
          results.duid = idx.duid > -1 ? data[i][idx.duid] : ""; 
          results.region = idx.region > -1 ? data[i][idx.region] : ""; 
          results.ownerWarehouse = idx.ownerW > -1 ? data[i][idx.ownerW] : ""; 
          results.ownerReceiver = idx.ownerR > -1 ? data[i][idx.ownerR] : ""; 
          results.locationWarehouse = idx.locW > -1 ? data[i][idx.locW] : ""; 
          results.locationReceiver = idx.locR > -1 ? data[i][idx.locR] : ""; 
          found = true; 
        } 
        results.items.push({ 
          type: idx.type > -1 ? data[i][idx.type] : "", 
          model: idx.model > -1 ? data[i][idx.model] : "", 
          code: idx.code > -1 ? data[i][idx.code] : "", 
          desc: idx.desc > -1 ? data[i][idx.desc] : "", 
          qty: idx.qty > -1 ? data[i][idx.qty] : 0, 
          sn: idx.sn > -1 ? data[i][idx.sn] : "" 
        }); 
      } 
    }
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
