// src/gas/webhook.gs

/**
 * Handles incoming webhooks from LINE (Postback).
 */
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const event = data.events[0];

  if (event.type === "postback") {
    const params = parseQueryString(event.postback.data);
    const action = params.action;
    const rowId = parseInt(params.rowId);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
    const dataRange = sheet.getDataRange().getValues();
    
    // Find row by rowId (assuming rowId corresponds to sheet row number, adjust as needed)
    // Row 1 is header, so rowId usually starts from 2
    if (action === "approve") {
      sheet.getRange(rowId, 8).setValue(CONFIG.STATUS_APPROVED); // Update Status column (H = 8)
      processApprovedPost(rowId);
    } else if (action === "reject") {
      sheet.getRange(rowId, 8).setValue(CONFIG.STATUS_REJECTED);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseQueryString(query) {
  const vars = query.split("&");
  const query_string = {};
  for (let i = 0; i < vars.length; i++) {
    const pair = vars[i].split("=");
    query_string[pair[0]] = decodeURIComponent(pair[1]);
  }
  return query_string;
}

/**
 * Executes the posting logic once approved.
 */
function processApprovedPost(rowId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  const rowData = sheet.getRange(rowId, 1, 1, 8).getValues()[0];
  
  const productName = rowData[1]; // B
  const imageUrl = rowData[2];    // C
  const caption = rowData[6];     // G
  const productLink = rowData[5]; // F

  const finalCaption = `${caption}\n\n🛒 สนใจสั่งซื้อคลิก: ${productLink}`;

  // Post to Facebook
  const fbPostId = postToFacebook(finalCaption, imageUrl);
  if (fbPostId) {
    sheet.getRange(rowId, 9).setValue(fbPostId); // Column I
  }

  // TikTok logic would go here (or manual update)
  sheet.getRange(rowId, 8).setValue(CONFIG.STATUS_POSTED);
}
