// src/gas/main.gs

/**
 * Periodic trigger function to process new rows.
 */
function processQueue() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const status = rows[i][7]; // Column H
    const rowId = i + 1;

    if (status === CONFIG.STATUS_PENDING_AI) {
      const productName = rows[i][1];
      const features = rows[i][3];
      const price = rows[i][4];
      const imageUrl = rows[i][2];
      const productLink = rows[i][5];

      // 1. Generate Caption
      const caption = generateCaption(productName, features, price);
      if (caption) {
        sheet.getRange(rowId, 7).setValue(caption); // Column G
        sheet.getRange(rowId, 8).setValue(CONFIG.STATUS_WAITING_APPROVAL); // Column H
        
        // 2. Send for Approval
        sendLineApproval(rowId, productName, caption, imageUrl, productLink);
      }
    }
  }
}
