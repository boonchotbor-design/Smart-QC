// ─────────────────────────────────────────────
// UPDATE DUID STATUS — V.7.0.1 Fixed Logic
// 
// กฎการนับ Status:
//   IN     ↔ OUT       (balance กัน)
//   STR/IN ↔ STR/OUT   (balance กัน)
//   DISMANTLE ↔ RETURN (balance กัน) ← แก้จากเดิมที่ผิด
//
// Status Rules:
//   - ถ้าไม่มีข้อมูลเลย → Pending
//   - ถ้า balance ครบทุกคู่ → Closed
//   - ถ้ายังไม่ balance → On Process
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
      type:   Math.max(h.indexOf("IN/OUT"), 3),
      qty:    Math.max(h.indexOf("SUM OF REQ.QTY"), 10),
      status: Math.max(h.indexOf("STATUS"), 21)
    };

    var inQty = 0, outQty = 0;
    var strInQty = 0, strOutQty = 0;
    var dismantleQty = 0, returnQty = 0;
    var matchingRows = [];
    var target = duid.trim();
    var hasAnyData = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idx.duid]).trim() !== target) continue;
      matchingRows.push(i + 1);
      var type = String(data[i][idx.type] || "").toUpperCase().trim();
      var qty  = Number(data[i][idx.qty]) || 0;
      hasAnyData = true;

      if      (type === "IN")        inQty        += qty;
      else if (type === "OUT")       outQty       += qty;
      else if (type === "STR/IN")    strInQty     += qty;
      else if (type === "STR/OUT")   strOutQty    += qty;
      else if (type === "DISMANTLE") dismantleQty += qty;
      else if (type === "RETURN")    returnQty    += qty;
    }

    var status;
    if (!hasAnyData) {
      status = "Pending";
    } else {
      // ตรวจแต่ละคู่เฉพาะที่มีข้อมูล
      var inOutBalanced      = (inQty === 0 && outQty === 0)      || (inQty > 0 && outQty > 0 && inQty === outQty);
      var strBalanced        = (strInQty === 0 && strOutQty === 0) || (strInQty > 0 && strOutQty > 0 && strInQty === strOutQty);
      var dismantleBalanced  = (dismantleQty === 0 && returnQty === 0) || (dismantleQty > 0 && returnQty > 0 && dismantleQty === returnQty);

      // ต้องมีข้อมูลจริงอย่างน้อย 1 คู่ ถึงจะ Closed
      var hasRealData = (inQty + outQty + strInQty + strOutQty + dismantleQty + returnQty) > 0;

      if (hasRealData && inOutBalanced && strBalanced && dismantleBalanced) {
        status = "Closed";
      } else {
        status = "On Process";
      }
    }

    // อัปเดตทุก row ของ DUID นี้
    if (matchingRows.length > 0) {
      var statusRange  = sheet.getRange(1, idx.status + 1, data.length, 1);
      var statusValues = statusRange.getValues();
      matchingRows.forEach(function(r) {
        if (statusValues[r - 1]) statusValues[r - 1][0] = status;
      });
      statusRange.setValues(statusValues);
    }

    logToSheet("STATUS_UPDATE", "DUID: " + duid + " → " + status +
      " | IN:" + inQty + " OUT:" + outQty +
      " | STR/IN:" + strInQty + " STR/OUT:" + strOutQty +
      " | DIS:" + dismantleQty + " RET:" + returnQty);

  } catch (e) {
    logToSheet("STATUS_ERROR", e.toString());
  }
}
